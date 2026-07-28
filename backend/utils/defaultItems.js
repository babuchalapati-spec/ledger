// Predefined household grocery/kirana catalog (English + Telugu names) used to
// pre-populate a fresh inventory via POST /api/items/seed-defaults.
const defaultItems = [
  // Grains & Rice
  { name: 'Rice', nameTelugu: 'బియ్యం', category: 'Grains & Rice', unitType: 'weight', pricePerUnit: 60, lowStockThreshold: 2 },
  { name: 'Wheat Flour (Atta)', nameTelugu: 'గోధుమ పిండి', category: 'Grains & Rice', unitType: 'weight', pricePerUnit: 45, lowStockThreshold: 2 },
  { name: 'Rava (Sooji)', nameTelugu: 'రవ్వ', category: 'Grains & Rice', unitType: 'weight', pricePerUnit: 50, lowStockThreshold: 1 },
  { name: 'Idli Rava', nameTelugu: 'ఇడ్లీ రవ్వ', category: 'Grains & Rice', unitType: 'weight', pricePerUnit: 55, lowStockThreshold: 1 },
  { name: 'Maida', nameTelugu: 'మైదా', category: 'Grains & Rice', unitType: 'weight', pricePerUnit: 45, lowStockThreshold: 1 },
  { name: 'Poha (Atukulu)', nameTelugu: 'అటుకులు', category: 'Grains & Rice', unitType: 'weight', pricePerUnit: 55, lowStockThreshold: 1 },

  // Pulses
  { name: 'Toor Dal', nameTelugu: 'కంది పప్పు', category: 'Pulses', unitType: 'weight', pricePerUnit: 140, lowStockThreshold: 1 },
  { name: 'Moong Dal', nameTelugu: 'పెసర పప్పు', category: 'Pulses', unitType: 'weight', pricePerUnit: 120, lowStockThreshold: 1 },
  { name: 'Chana Dal', nameTelugu: 'సెనగ పప్పు', category: 'Pulses', unitType: 'weight', pricePerUnit: 90, lowStockThreshold: 1 },
  { name: 'Urad Dal', nameTelugu: 'మినప్పప్పు', category: 'Pulses', unitType: 'weight', pricePerUnit: 130, lowStockThreshold: 1 },
  { name: 'Masoor Dal', nameTelugu: 'మసూర్ పప్పు', category: 'Pulses', unitType: 'weight', pricePerUnit: 100, lowStockThreshold: 1 },

  // Oil & Ghee
  { name: 'Sunflower Oil', nameTelugu: 'పొద్దుతిరుగుడు నూనె', category: 'Oil & Ghee', unitType: 'volume', pricePerUnit: 130, lowStockThreshold: 1 },
  { name: 'Groundnut Oil', nameTelugu: 'వేరుశెనగ నూనె', category: 'Oil & Ghee', unitType: 'volume', pricePerUnit: 180, lowStockThreshold: 1 },
  { name: 'Ghee', nameTelugu: 'నెయ్యి', category: 'Oil & Ghee', unitType: 'weight', pricePerUnit: 550, lowStockThreshold: 0.5 },

  // Sugar & Salt
  { name: 'Sugar', nameTelugu: 'చక్కెర', category: 'Sugar & Salt', unitType: 'weight', pricePerUnit: 45, lowStockThreshold: 1 },
  { name: 'Salt', nameTelugu: 'ఉప్పు', category: 'Sugar & Salt', unitType: 'weight', pricePerUnit: 20, lowStockThreshold: 1 },
  { name: 'Jaggery', nameTelugu: 'బెల్లం', category: 'Sugar & Salt', unitType: 'weight', pricePerUnit: 60, lowStockThreshold: 0.5 },

  // Spices & Masala
  { name: 'Turmeric Powder', nameTelugu: 'పసుపు', category: 'Spices & Masala', unitType: 'weight', pricePerUnit: 200, lowStockThreshold: 0.25 },
  { name: 'Red Chilli Powder', nameTelugu: 'కారం పొడి', category: 'Spices & Masala', unitType: 'weight', pricePerUnit: 250, lowStockThreshold: 0.25 },
  { name: 'Coriander Powder', nameTelugu: 'ధనియాల పొడి', category: 'Spices & Masala', unitType: 'weight', pricePerUnit: 180, lowStockThreshold: 0.25 },
  { name: 'Cumin Seeds', nameTelugu: 'జీలకర్ర', category: 'Spices & Masala', unitType: 'weight', pricePerUnit: 300, lowStockThreshold: 0.1 },
  { name: 'Mustard Seeds', nameTelugu: 'ఆవాలు', category: 'Spices & Masala', unitType: 'weight', pricePerUnit: 150, lowStockThreshold: 0.1 },
  { name: 'Garam Masala', nameTelugu: 'గరం మసాలా', category: 'Spices & Masala', unitType: 'weight', pricePerUnit: 400, lowStockThreshold: 0.1 },
  { name: 'Tamarind', nameTelugu: 'చింతపండు', category: 'Spices & Masala', unitType: 'weight', pricePerUnit: 150, lowStockThreshold: 0.25 },

  // Beverages
  { name: 'Tea Powder', nameTelugu: 'టీ పొడి', category: 'Beverages', unitType: 'weight', pricePerUnit: 400, lowStockThreshold: 0.25 },
  { name: 'Coffee Powder', nameTelugu: 'కాఫీ పొడి', category: 'Beverages', unitType: 'weight', pricePerUnit: 500, lowStockThreshold: 0.25 },
  { name: 'Milk', nameTelugu: 'పాలు', category: 'Beverages', unitType: 'volume', pricePerUnit: 60, lowStockThreshold: 1 },

  // Dairy
  { name: 'Curd', nameTelugu: 'పెరుగు', category: 'Dairy', unitType: 'weight', pricePerUnit: 60, lowStockThreshold: 0.5 },
  { name: 'Paneer', nameTelugu: 'పన్నీర్', category: 'Dairy', unitType: 'weight', pricePerUnit: 350, lowStockThreshold: 0.25 },
  { name: 'Butter', nameTelugu: 'వెన్న', category: 'Dairy', unitType: 'weight', pricePerUnit: 500, lowStockThreshold: 0.25 },

  // Bakery & Snacks
  { name: 'Biscuits', nameTelugu: 'బిస్కెట్లు', category: 'Bakery & Snacks', unitType: 'count', pricePerUnit: 30, lowStockThreshold: 2 },
  { name: 'Bread', nameTelugu: 'బ్రెడ్', category: 'Bakery & Snacks', unitType: 'count', pricePerUnit: 40, lowStockThreshold: 1 },

  // Vegetables
  { name: 'Onion', nameTelugu: 'ఉల్లిపాయలు', category: 'Vegetables', unitType: 'weight', pricePerUnit: 30, lowStockThreshold: 1 },
  { name: 'Potato', nameTelugu: 'బంగాళదుంప', category: 'Vegetables', unitType: 'weight', pricePerUnit: 25, lowStockThreshold: 1 },
  { name: 'Tomato', nameTelugu: 'టమాటా', category: 'Vegetables', unitType: 'weight', pricePerUnit: 35, lowStockThreshold: 1 },
  { name: 'Garlic', nameTelugu: 'వెల్లుల్లి', category: 'Vegetables', unitType: 'weight', pricePerUnit: 150, lowStockThreshold: 0.1 },
  { name: 'Ginger', nameTelugu: 'అల్లం', category: 'Vegetables', unitType: 'weight', pricePerUnit: 120, lowStockThreshold: 0.1 },
  { name: 'Brinjal', nameTelugu: 'వంకాయ', category: 'Vegetables', unitType: 'weight', pricePerUnit: 40, lowStockThreshold: 0.5 },
  { name: 'Ladies Finger (Okra)', nameTelugu: 'బెండకాయ', category: 'Vegetables', unitType: 'weight', pricePerUnit: 40, lowStockThreshold: 0.5 },
  { name: 'Cabbage', nameTelugu: 'క్యాబేజీ', category: 'Vegetables', unitType: 'weight', pricePerUnit: 30, lowStockThreshold: 0.5 },
  { name: 'Cauliflower', nameTelugu: 'కాలీఫ్లవర్', category: 'Vegetables', unitType: 'weight', pricePerUnit: 40, lowStockThreshold: 0.5 },
  { name: 'Carrot', nameTelugu: 'క్యారెట్', category: 'Vegetables', unitType: 'weight', pricePerUnit: 45, lowStockThreshold: 0.5 },
  { name: 'Beans', nameTelugu: 'బీన్స్', category: 'Vegetables', unitType: 'weight', pricePerUnit: 50, lowStockThreshold: 0.5 },
  { name: 'Capsicum', nameTelugu: 'క్యాప్సికం', category: 'Vegetables', unitType: 'weight', pricePerUnit: 50, lowStockThreshold: 0.25 },
  { name: 'Cucumber', nameTelugu: 'దోసకాయ', category: 'Vegetables', unitType: 'weight', pricePerUnit: 30, lowStockThreshold: 0.5 },
  { name: 'Bottle Gourd', nameTelugu: 'సొరకాయ', category: 'Vegetables', unitType: 'weight', pricePerUnit: 30, lowStockThreshold: 0.5 },
  { name: 'Green Chilli', nameTelugu: 'పచ్చిమిర్చి', category: 'Vegetables', unitType: 'weight', pricePerUnit: 60, lowStockThreshold: 0.1 },
  { name: 'Lemon', nameTelugu: 'నిమ్మకాయ', category: 'Vegetables', unitType: 'count', pricePerUnit: 4, lowStockThreshold: 6 },
  { name: 'Spinach (Palak)', nameTelugu: 'పాలకూర', category: 'Vegetables', unitType: 'count', pricePerUnit: 15, lowStockThreshold: 2 },
  { name: 'Coriander Leaves', nameTelugu: 'కొత్తిమీర', category: 'Vegetables', unitType: 'count', pricePerUnit: 10, lowStockThreshold: 2 },
  { name: 'Curry Leaves', nameTelugu: 'కరివేపాకు', category: 'Vegetables', unitType: 'count', pricePerUnit: 5, lowStockThreshold: 2 },
  { name: 'Beetroot', nameTelugu: 'బీట్‌రూట్', category: 'Vegetables', unitType: 'weight', pricePerUnit: 40, lowStockThreshold: 0.5 },

  // Household
  { name: 'Eggs', nameTelugu: 'గుడ్లు', category: 'Household', unitType: 'count', pricePerUnit: 6, lowStockThreshold: 6 },
  { name: 'Detergent Powder', nameTelugu: 'డిటర్జెంట్ పొడి', category: 'Household', unitType: 'weight', pricePerUnit: 120, lowStockThreshold: 0.5 },
  { name: 'Soap', nameTelugu: 'సబ్బు', category: 'Household', unitType: 'count', pricePerUnit: 40, lowStockThreshold: 2 },
];

module.exports = { defaultItems };
