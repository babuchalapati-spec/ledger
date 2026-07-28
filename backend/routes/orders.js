const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const Order = require('../models/Order');
const Item = require('../models/Item');
const Settings = require('../models/Settings');
const { factorFor } = require('../utils/units');
const { generateOrderPdf } = require('../utils/generateOrderPdf');

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, WEBP images or PDF files are allowed'));
  },
});

// List all orders, most recent first
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ date: -1, createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new order (a shopping list of items to buy). Stock is not touched
// until the order is marked received.
router.post('/', async (req, res) => {
  try {
    const { date, deliveryDate, orderedFor, notes, items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Add at least one item to the order' });
    }

    const lineItems = [];
    for (const line of items) {
      const item = await Item.findById(line.itemId);
      if (!item) return res.status(400).json({ error: `Item not found: ${line.itemId}` });

      const factor = factorFor(item.unitType, line.unitLabel);
      if (!factor) return res.status(400).json({ error: `Invalid unit "${line.unitLabel}" for ${item.name}` });

      const quantity = Number(line.quantity);
      if (!(quantity > 0)) return res.status(400).json({ error: `Enter a valid quantity for ${item.name}` });

      const qtyStandard = quantity * factor;
      const rateOverride = Number(line.rate);
      const pricePerUnit = line.rate !== undefined && line.rate !== null && line.rate !== '' && rateOverride >= 0
        ? rateOverride
        : item.pricePerUnit;
      const lineTotal = qtyStandard * pricePerUnit;

      lineItems.push({
        item: item._id,
        name: item.name,
        nameTelugu: item.nameTelugu,
        unitType: item.unitType,
        unitLabel: line.unitLabel,
        quantity,
        qtyStandard,
        pricePerUnit,
        lineTotal,
      });
    }

    const totalAmount = lineItems.reduce((sum, l) => sum + l.lineTotal, 0);

    const order = await Order.create({
      date: date ? new Date(date) : new Date(),
      deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
      orderedFor,
      notes,
      items: lineItems,
      totalAmount,
      status: 'pending',
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reschedule the delivery date (or edit orderedFor/notes) of an existing order
router.put('/:id', async (req, res) => {
  try {
    const { deliveryDate, orderedFor, notes } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (deliveryDate !== undefined) order.deliveryDate = deliveryDate ? new Date(deliveryDate) : undefined;
    if (orderedFor !== undefined) order.orderedFor = orderedFor;
    if (notes !== undefined) order.notes = notes;

    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Attach an invoice (photo or PDF) to an order
router.post('/:id/invoice', upload.array('invoiceDocuments', 5), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      (req.files || []).forEach((f) => fs.existsSync(f.path) && fs.unlinkSync(f.path));
      return res.status(404).json({ error: 'Order not found' });
    }

    const newDocs = (req.files || []).map((f) => ({
      filename: f.filename,
      originalName: f.originalname,
      path: `/uploads/${f.filename}`,
      mimeType: f.mimetype,
    }));
    order.invoiceDocuments.push(...newDocs);
    await order.save();
    res.json(order);
  } catch (err) {
    (req.files || []).forEach((f) => fs.existsSync(f.path) && fs.unlinkSync(f.path));
    res.status(500).json({ error: err.message });
  }
});

// PDF copy of an order. Query params:
//   plain=1    -> plain item list (name/qty/unit only, no MRP/amount)
//   download=1 -> force a file download instead of opening inline in the browser/webview
router.get('/:id/pdf', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const business = await Settings.findOne().lean();
    const plain = req.query.plain === '1';
    const download = req.query.download === '1';
    const filenamePrefix = plain ? 'shopping-list' : 'order';
    const filename = `${filenamePrefix}-${new Date(order.date).toISOString().slice(0, 10)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="${filename}"`);

    generateOrderPdf({ order, business, plain }, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark an order received: adds each ordered quantity into the item's stock
router.post('/:id/receive', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'received') return res.status(400).json({ error: 'Order is already marked received' });

    for (const line of order.items) {
      await Item.findByIdAndUpdate(line.item, { $inc: { stockQty: line.qtyStandard } });
    }
    order.status = 'received';
    order.receivedAt = new Date();
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete an order. If it had already been received, reverse the stock it added.
router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.status === 'received') {
      for (const line of order.items) {
        await Item.findByIdAndUpdate(line.item, { $inc: { stockQty: -line.qtyStandard } });
      }
    }
    order.invoiceDocuments.forEach((d) => {
      const filePath = path.join(uploadDir, d.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
