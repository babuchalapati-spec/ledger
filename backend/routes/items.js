const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const { factorFor } = require('../utils/units');
const { defaultItems } = require('../utils/defaultItems');

// List all items, grouped/sorted by category then name
router.get('/', async (req, res) => {
  try {
    const items = await Item.find().sort({ category: 1, name: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create item
router.post('/', async (req, res) => {
  try {
    const { name, nameTelugu, category, unitType, pricePerUnit, stockQty, lowStockThreshold } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Item name is required' });
    if (!['weight', 'volume', 'count'].includes(unitType)) {
      return res.status(400).json({ error: 'A valid unit type is required' });
    }
    const item = await Item.create({
      name,
      nameTelugu,
      category: category || 'General',
      unitType,
      pricePerUnit: Number(pricePerUnit) || 0,
      stockQty: Number(stockQty) || 0,
      lowStockThreshold: Number(lowStockThreshold) || 0,
    });
    res.status(201).json(item);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'An item with this name already exists' });
    res.status(500).json({ error: err.message });
  }
});

// Update item
router.put('/:id', async (req, res) => {
  try {
    const { name, nameTelugu, category, unitType, pricePerUnit, stockQty, lowStockThreshold, isActive } = req.body;
    if (!['weight', 'volume', 'count'].includes(unitType)) {
      return res.status(400).json({ error: 'A valid unit type is required' });
    }
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      {
        name,
        nameTelugu,
        category: category || 'General',
        unitType,
        pricePerUnit: Number(pricePerUnit) || 0,
        stockQty: Number(stockQty) || 0,
        lowStockThreshold: Number(lowStockThreshold) || 0,
        isActive: isActive !== undefined ? !!isActive : true,
      },
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'An item with this name already exists' });
    res.status(500).json({ error: err.message });
  }
});

// Delete item
router.delete('/:id', async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Quick restock (add stock directly, without going through the Order flow)
router.post('/:id/restock', async (req, res) => {
  try {
    const { unitLabel, quantity } = req.body;
    const qty = Number(quantity);
    if (!(qty > 0)) return res.status(400).json({ error: 'A positive quantity is required' });

    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const factor = factorFor(item.unitType, unitLabel);
    if (!factor) return res.status(400).json({ error: 'Invalid unit for this item' });

    item.stockQty += qty * factor;
    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pre-populate common household grocery items (skips names that already exist)
router.post('/seed-defaults', async (req, res) => {
  try {
    const existingNames = new Set((await Item.find({}, 'name').lean()).map((i) => i.name.toLowerCase()));
    const toInsert = defaultItems.filter((d) => !existingNames.has(d.name.toLowerCase()));
    if (toInsert.length === 0) return res.json({ inserted: 0, items: [] });
    const items = await Item.insertMany(toInsert);
    res.json({ inserted: items.length, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
