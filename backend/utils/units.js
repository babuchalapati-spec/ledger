// Quantity units groceries are ordered in, grouped by how each item is measured.
// factor = how many standard units (kg / litre / pcs) one option represents.
const UNIT_TYPES = {
  weight: {
    standardUnit: 'kg',
    options: [
      { label: '10g', factor: 0.01 },
      { label: '50g', factor: 0.05 },
      { label: '100g', factor: 0.1 },
      { label: '250g', factor: 0.25 },
      { label: '500g (1/2 kg)', factor: 0.5 },
      { label: '1 kg', factor: 1 },
      { label: '5 kg', factor: 5 },
    ],
  },
  volume: {
    standardUnit: 'litre',
    options: [
      { label: '100 ml', factor: 0.1 },
      { label: '250 ml', factor: 0.25 },
      { label: '500 ml', factor: 0.5 },
      { label: '1 litre', factor: 1 },
      { label: '5 litres', factor: 5 },
    ],
  },
  count: {
    standardUnit: 'pcs',
    options: [
      { label: '1 pc', factor: 1 },
      { label: '6 pcs', factor: 6 },
      { label: '12 pcs (dozen)', factor: 12 },
    ],
  },
};

function factorFor(unitType, label) {
  const type = UNIT_TYPES[unitType];
  if (!type) return null;
  const opt = type.options.find((o) => o.label === label);
  return opt ? opt.factor : null;
}

module.exports = { UNIT_TYPES, factorFor };
