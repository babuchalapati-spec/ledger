// Mirrors backend/utils/units.js — keep both in sync.
export const UNIT_TYPES = {
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

export const unitOptionsFor = (unitType) => UNIT_TYPES[unitType]?.options || [];
export const standardUnitFor = (unitType) => UNIT_TYPES[unitType]?.standardUnit || '';
export const factorFor = (unitType, label) => {
  const opt = unitOptionsFor(unitType).find((o) => o.label === label);
  return opt ? opt.factor : 1;
};
