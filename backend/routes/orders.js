const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Item = require('../models/Item');
const Settings = require('../models/Settings');
const { factorFor } = require('../utils/units');
const { generateOrderPdf } = require('../utils/generateOrderPdf');

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
    const { date, orderedFor, notes, items } = req.body;
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

// Download a PDF copy of an order
router.get('/:id/pdf', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const business = await Settings.findOne().lean();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="order-${new Date(order.date).toISOString().slice(0, 10)}.pdf"`);

    generateOrderPdf({ order, business }, res);
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
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
