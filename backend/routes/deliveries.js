const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const getDeliveryModel = require('../models/tenant/Delivery');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

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

// List all deliveries, soonest due first
router.get('/', async (req, res) => {
  try {
    const Delivery = getDeliveryModel(req.tenantConn);
    const deliveries = await Delivery.find().sort({ deliveryTime: 1 });
    res.json(deliveries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a delivery record: when it's due and what to deliver
router.post('/', async (req, res) => {
  try {
    const Delivery = getDeliveryModel(req.tenantConn);
    const { deliveryTime, items, notes } = req.body;
    if (!deliveryTime) return res.status(400).json({ error: 'Delivery time is required' });
    if (!items || !items.trim()) return res.status(400).json({ error: 'Please describe what needs to be delivered' });

    const delivery = await Delivery.create({
      deliveryTime: new Date(deliveryTime),
      items,
      notes,
    });
    res.status(201).json(delivery);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update / reschedule a delivery
router.put('/:id', async (req, res) => {
  try {
    const Delivery = getDeliveryModel(req.tenantConn);
    const { deliveryTime, items, notes } = req.body;
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

    if (deliveryTime !== undefined) delivery.deliveryTime = new Date(deliveryTime);
    if (items !== undefined) delivery.items = items;
    if (notes !== undefined) delivery.notes = notes;

    await delivery.save();
    res.json(delivery);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark a delivery as delivered
router.post('/:id/deliver', async (req, res) => {
  try {
    const Delivery = getDeliveryModel(req.tenantConn);
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

    delivery.status = 'delivered';
    delivery.deliveredAt = new Date();
    await delivery.save();
    res.json(delivery);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Attach an invoice (photo or PDF) to a delivery
router.post('/:id/invoice', upload.array('invoiceDocuments', 5), async (req, res) => {
  try {
    const Delivery = getDeliveryModel(req.tenantConn);
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      (req.files || []).forEach((f) => fs.existsSync(f.path) && fs.unlinkSync(f.path));
      return res.status(404).json({ error: 'Delivery not found' });
    }

    const newDocs = (req.files || []).map((f) => ({
      filename: f.filename,
      originalName: f.originalname,
      path: `/uploads/${f.filename}`,
      mimeType: f.mimetype,
    }));
    delivery.invoiceDocuments.push(...newDocs);
    await delivery.save();
    res.json(delivery);
  } catch (err) {
    (req.files || []).forEach((f) => fs.existsSync(f.path) && fs.unlinkSync(f.path));
    res.status(500).json({ error: err.message });
  }
});

// Delete a delivery record (and its attached files)
router.delete('/:id', async (req, res) => {
  try {
    const Delivery = getDeliveryModel(req.tenantConn);
    const delivery = await Delivery.findByIdAndDelete(req.params.id);
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

    delivery.invoiceDocuments.forEach((d) => {
      const filePath = path.join(uploadDir, d.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
    res.json({ message: 'Delivery deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
