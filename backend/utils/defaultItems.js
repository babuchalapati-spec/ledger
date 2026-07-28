// Predefined daily-necessities catalog (English + Telugu names) used to
// pre-populate a fresh inventory via POST /api/items/seed-defaults.
// Covers groceries plus the broader day-to-day categories a household
// restocks regularly (personal care, cleaning, baby care, fruits, meat/fish).
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
  { name: 'Coconut Oil', nameTelugu: 'కొబ్బరి నూనె', category: 'Oil & Ghee', unitType: 'volume', pricePerUnit: 200, lowStockThreshold: 0.5 },
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
  { name: 'Black Pepper', nameTelugu: 'మిరియాలు', category: 'Spices & Masala', unitType: 'weight', pricePerUnit: 600, lowStockThreshold: 0.05 },
  { name: 'Cloves', nameTelugu: 'లవంగాలు', category: 'Spices & Masala', unitType: 'weight', pricePerUnit: 800, lowStockThreshold: 0.02 },
  { name: 'Cardamom', nameTelugu: 'ఏలకులు', category: 'Spices & Masala', unitType: 'weight', pricePerUnit: 1800, lowStockThreshold: 0.02 },
  { name: 'Cinnamon', nameTelugu: 'దాల్చిన చెక్క', category: 'Spices & Masala', unitType: 'weight', pricePerUnit: 400, lowStockThreshold: 0.05 },
  { name: 'Fennel Seeds', nameTelugu: 'సోంపు', category: 'Spices & Masala', unitType: 'weight', pricePerUnit: 200, lowStockThreshold: 0.1 },
  { name: 'Fenugreek Seeds', nameTelugu: 'మెంతులు', category: 'Spices & Masala', unitType: 'weight', pricePerUnit: 150, lowStockThreshold: 0.1 },
  { name: 'Asafoetida (Hing)', nameTelugu: 'ఇంగువ', category: 'Spices & Masala', unitType: 'weight', pricePerUnit: 1500, lowStockThreshold: 0.02 },
  { name: 'Sambar Powder', nameTelugu: 'సాంబార్ పొడి', category: 'Spices & Masala', unitType: 'weight', pricePerUnit: 300, lowStockThreshold: 0.25 },
  { name: 'Rasam Powder', nameTelugu: 'రసం పొడి', category: 'Spices & Masala', unitType: 'weight', pricePerUnit: 300, lowStockThreshold: 0.25 },

  // Beverages
  { name: 'Tea Powder', nameTelugu: 'టీ పొడి', category: 'Beverages', unitType: 'weight', pricePerUnit: 400, lowStockThreshold: 0.25 },
  { name: 'Coffee Powder', nameTelugu: 'కాఫీ పొడి', category: 'Beverages', unitType: 'weight', pricePerUnit: 500, lowStockThreshold: 0.25 },
  { name: 'Milk', nameTelugu: 'పాలు', category: 'Beverages', unitType: 'volume', pricePerUnit: 60, lowStockThreshold: 1 },
  { name: 'Buttermilk', nameTelugu: 'మజ్జిగ', category: 'Beverages', unitType: 'volume', pricePerUnit: 40, lowStockThreshold: 0.5 },
  { name: 'Health Drink (Horlicks/Boost)', nameTelugu: 'హెల్త్ డ్రింక్', category: 'Beverages', unitType: 'weight', pricePerUnit: 450, lowStockThreshold: 0.25 },
  { name: 'Fruit Juice', nameTelugu: 'ఫ్రూట్ జ్యూస్', category: 'Beverages', unitType: 'volume', pricePerUnit: 120, lowStockThreshold: 0.5 },
  { name: 'Soft Drink', nameTelugu: 'సాఫ్ట్ డ్రింక్', category: 'Beverages', unitType: 'volume', pricePerUnit: 45, lowStockThreshold: 0.5 },

  // Dairy
  { name: 'Curd', nameTelugu: 'పెరుగు', category: 'Dairy', unitType: 'weight', pricePerUnit: 60, lowStockThreshold: 0.5 },
  { name: 'Paneer', nameTelugu: 'పన్నీర్', category: 'Dairy', unitType: 'weight', pricePerUnit: 350, lowStockThreshold: 0.25 },
  { name: 'Butter', nameTelugu: 'వెన్న', category: 'Dairy', unitType: 'weight', pricePerUnit: 500, lowStockThreshold: 0.25 },
  { name: 'Cheese', nameTelugu: 'చీజ్', category: 'Dairy', unitType: 'weight', pricePerUnit: 450, lowStockThreshold: 0.25 },
  { name: 'Ice Cream', nameTelugu: 'ఐస్ క్రీం', category: 'Dairy', unitType: 'volume', pricePerUnit: 250, lowStockThreshold: 0.5 },
  { name: 'Condensed Milk', nameTelugu: 'కండెన్స్డ్ మిల్క్', category: 'Dairy', unitType: 'weight', pricePerUnit: 350, lowStockThreshold: 0.2 },

  // Bakery & Snacks
  { name: 'Biscuits', nameTelugu: 'బిస్కెట్లు', category: 'Bakery & Snacks', unitType: 'count', pricePerUnit: 30, lowStockThreshold: 2 },
  { name: 'Bread', nameTelugu: 'బ్రెడ్', category: 'Bakery & Snacks', unitType: 'count', pricePerUnit: 40, lowStockThreshold: 1 },
  { name: 'Rusk', nameTelugu: 'రస్క్', category: 'Bakery & Snacks', unitType: 'count', pricePerUnit: 40, lowStockThreshold: 1 },
  { name: 'Namkeen Mixture', nameTelugu: 'మిక్చర్', category: 'Bakery & Snacks', unitType: 'weight', pricePerUnit: 160, lowStockThreshold: 0.25 },
  { name: 'Chips', nameTelugu: 'చిప్స్', category: 'Bakery & Snacks', unitType: 'count', pricePerUnit: 20, lowStockThreshold: 2 },
  { name: 'Cookies', nameTelugu: 'కుకీలు', category: 'Bakery & Snacks', unitType: 'count', pricePerUnit: 50, lowStockThreshold: 1 },
  { name: 'Cake', nameTelugu: 'కేక్', category: 'Bakery & Snacks', unitType: 'count', pricePerUnit: 250, lowStockThreshold: 0 },

  // Fruits
  { name: 'Banana', nameTelugu: 'అరటిపండు', category: 'Fruits', unitType: 'count', pricePerUnit: 5, lowStockThreshold: 6 },
  { name: 'Apple', nameTelugu: 'ఆపిల్', category: 'Fruits', unitType: 'weight', pricePerUnit: 180, lowStockThreshold: 0.5 },
  { name: 'Orange', nameTelugu: 'కమలా పండు', category: 'Fruits', unitType: 'weight', pricePerUnit: 80, lowStockThreshold: 0.5 },
  { name: 'Mango', nameTelugu: 'మామిడి పండు', category: 'Fruits', unitType: 'weight', pricePerUnit: 100, lowStockThreshold: 0.5 },
  { name: 'Grapes', nameTelugu: 'ద్రాక్ష', category: 'Fruits', unitType: 'weight', pricePerUnit: 90, lowStockThreshold: 0.25 },
  { name: 'Papaya', nameTelugu: 'బొప్పాయి', category: 'Fruits', unitType: 'weight', pricePerUnit: 30, lowStockThreshold: 0.5 },
  { name: 'Watermelon', nameTelugu: 'పుచ్చకాయ', category: 'Fruits', unitType: 'weight', pricePerUnit: 20, lowStockThreshold: 0.5 },
  { name: 'Pomegranate', nameTelugu: 'దానిమ్మ', category: 'Fruits', unitType: 'weight', pricePerUnit: 150, lowStockThreshold: 0.25 },
  { name: 'Guava', nameTelugu: 'జామపండు', category: 'Fruits', unitType: 'weight', pricePerUnit: 60, lowStockThreshold: 0.5 },
  { name: 'Sapota (Chikoo)', nameTelugu: 'సపోటా', category: 'Fruits', unitType: 'weight', pricePerUnit: 70, lowStockThreshold: 0.5 },

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
  { name: 'Ridge Gourd', nameTelugu: 'బీరకాయ', category: 'Vegetables', unitType: 'weight', pricePerUnit: 35, lowStockThreshold: 0.5 },
  { name: 'Snake Gourd', nameTelugu: 'పొట్లకాయ', category: 'Vegetables', unitType: 'weight', pricePerUnit: 35, lowStockThreshold: 0.5 },
  { name: 'Drumstick', nameTelugu: 'మునగకాయ', category: 'Vegetables', unitType: 'weight', pricePerUnit: 60, lowStockThreshold: 0.25 },
  { name: 'Raw Banana', nameTelugu: 'అరటికాయ', category: 'Vegetables', unitType: 'weight', pricePerUnit: 40, lowStockThreshold: 0.5 },
  { name: 'Sweet Potato', nameTelugu: 'చిలగడదుంప', category: 'Vegetables', unitType: 'weight', pricePerUnit: 45, lowStockThreshold: 0.5 },
  { name: 'Radish', nameTelugu: 'ముల్లంగి', category: 'Vegetables', unitType: 'weight', pricePerUnit: 30, lowStockThreshold: 0.5 },
  { name: 'Green Chilli', nameTelugu: 'పచ్చిమిర్చి', category: 'Vegetables', unitType: 'weight', pricePerUnit: 60, lowStockThreshold: 0.1 },
  { name: 'Lemon', nameTelugu: 'నిమ్మకాయ', category: 'Vegetables', unitType: 'count', pricePerUnit: 4, lowStockThreshold: 6 },
  { name: 'Spinach (Palak)', nameTelugu: 'పాలకూర', category: 'Vegetables', unitType: 'count', pricePerUnit: 15, lowStockThreshold: 2 },
  { name: 'Coriander Leaves', nameTelugu: 'కొత్తిమీర', category: 'Vegetables', unitType: 'count', pricePerUnit: 10, lowStockThreshold: 2 },
  { name: 'Curry Leaves', nameTelugu: 'కరివేపాకు', category: 'Vegetables', unitType: 'count', pricePerUnit: 5, lowStockThreshold: 2 },
  { name: 'Beetroot', nameTelugu: 'బీట్‌రూట్', category: 'Vegetables', unitType: 'weight', pricePerUnit: 40, lowStockThreshold: 0.5 },

  // Eggs, Meat & Fish
  { name: 'Eggs', nameTelugu: 'గుడ్లు', category: 'Eggs, Meat & Fish', unitType: 'count', pricePerUnit: 6, lowStockThreshold: 6 },
  { name: 'Chicken', nameTelugu: 'కోడి మాంసం', category: 'Eggs, Meat & Fish', unitType: 'weight', pricePerUnit: 220, lowStockThreshold: 0.5 },
  { name: 'Mutton', nameTelugu: 'మేక మాంసం', category: 'Eggs, Meat & Fish', unitType: 'weight', pricePerUnit: 650, lowStockThreshold: 0.25 },
  { name: 'Fish', nameTelugu: 'చేప', category: 'Eggs, Meat & Fish', unitType: 'weight', pricePerUnit: 250, lowStockThreshold: 0.5 },

  // Household & Cleaning
  { name: 'Detergent Powder', nameTelugu: 'డిటర్జెంట్ పొడి', category: 'Household & Cleaning', unitType: 'weight', pricePerUnit: 120, lowStockThreshold: 0.5 },
  { name: 'Dishwash Bar', nameTelugu: 'పాత్రలు కడిగే సబ్బు', category: 'Household & Cleaning', unitType: 'count', pricePerUnit: 20, lowStockThreshold: 2 },
  { name: 'Dishwash Liquid', nameTelugu: 'పాత్రలు కడిగే లిక్విడ్', category: 'Household & Cleaning', unitType: 'volume', pricePerUnit: 220, lowStockThreshold: 0.25 },
  { name: 'Floor Cleaner', nameTelugu: 'ఫ్లోర్ క్లీనర్', category: 'Household & Cleaning', unitType: 'volume', pricePerUnit: 150, lowStockThreshold: 0.5 },
  { name: 'Toilet Cleaner', nameTelugu: 'టాయిలెట్ క్లీనర్', category: 'Household & Cleaning', unitType: 'volume', pricePerUnit: 190, lowStockThreshold: 0.25 },
  { name: 'Phenyl', nameTelugu: 'ఫినాయిల్', category: 'Household & Cleaning', unitType: 'volume', pricePerUnit: 80, lowStockThreshold: 0.5 },
  { name: 'Broom', nameTelugu: 'చీపురు', category: 'Household & Cleaning', unitType: 'count', pricePerUnit: 100, lowStockThreshold: 1 },
  { name: 'Mop', nameTelugu: 'తుడిచే గుడ్డ', category: 'Household & Cleaning', unitType: 'count', pricePerUnit: 150, lowStockThreshold: 1 },
  { name: 'Garbage Bags', nameTelugu: 'చెత్త సంచులు', category: 'Household & Cleaning', unitType: 'count', pricePerUnit: 90, lowStockThreshold: 1 },
  { name: 'Matchbox', nameTelugu: 'అగ్గిపెట్టె', category: 'Household & Cleaning', unitType: 'count', pricePerUnit: 1, lowStockThreshold: 3 },
  { name: 'Mosquito Repellent', nameTelugu: 'దోమల నివారిణి', category: 'Household & Cleaning', unitType: 'count', pricePerUnit: 90, lowStockThreshold: 1 },
  { name: 'Incense Sticks (Agarbatti)', nameTelugu: 'అగరబత్తి', category: 'Household & Cleaning', unitType: 'count', pricePerUnit: 30, lowStockThreshold: 1 },
  { name: 'Candles', nameTelugu: 'కొవ్వొత్తులు', category: 'Household & Cleaning', unitType: 'count', pricePerUnit: 40, lowStockThreshold: 1 },
  { name: 'Naphthalene Balls', nameTelugu: 'నాఫ్తలిన్ బాల్స్', category: 'Household & Cleaning', unitType: 'count', pricePerUnit: 30, lowStockThreshold: 1 },

  // Personal Care
  { name: 'Soap', nameTelugu: 'సబ్బు', category: 'Personal Care', unitType: 'count', pricePerUnit: 40, lowStockThreshold: 2 },
  { name: 'Shampoo', nameTelugu: 'షాంపూ', category: 'Personal Care', unitType: 'count', pricePerUnit: 180, lowStockThreshold: 1 },
  { name: 'Toothpaste', nameTelugu: 'టూత్ పేస్ట్', category: 'Personal Care', unitType: 'count', pricePerUnit: 55, lowStockThreshold: 1 },
  { name: 'Toothbrush', nameTelugu: 'టూత్ బ్రష్', category: 'Personal Care', unitType: 'count', pricePerUnit: 25, lowStockThreshold: 2 },
  { name: 'Hair Oil', nameTelugu: 'తల నూనె', category: 'Personal Care', unitType: 'count', pricePerUnit: 120, lowStockThreshold: 1 },
  { name: 'Face Wash', nameTelugu: 'ఫేస్ వాష్', category: 'Personal Care', unitType: 'count', pricePerUnit: 150, lowStockThreshold: 1 },
  { name: 'Hand Wash', nameTelugu: 'హ్యాండ్ వాష్', category: 'Personal Care', unitType: 'count', pricePerUnit: 90, lowStockThreshold: 1 },
  { name: 'Body Lotion', nameTelugu: 'బాడీ లోషన్', category: 'Personal Care', unitType: 'count', pricePerUnit: 180, lowStockThreshold: 1 },
  { name: 'Sanitary Pads', nameTelugu: 'శానిటరీ ప్యాడ్స్', category: 'Personal Care', unitType: 'count', pricePerUnit: 90, lowStockThreshold: 1 },
  { name: 'Razor', nameTelugu: 'రేజర్', category: 'Personal Care', unitType: 'count', pricePerUnit: 50, lowStockThreshold: 1 },
  { name: 'Shaving Cream', nameTelugu: 'షేవింగ్ క్రీం', category: 'Personal Care', unitType: 'count', pricePerUnit: 110, lowStockThreshold: 1 },
  { name: 'Deodorant', nameTelugu: 'డియోడరెంట్', category: 'Personal Care', unitType: 'count', pricePerUnit: 200, lowStockThreshold: 1 },
  { name: 'Talcum Powder', nameTelugu: 'టాల్కమ్ పౌడర్', category: 'Personal Care', unitType: 'count', pricePerUnit: 90, lowStockThreshold: 1 },
  { name: 'Comb', nameTelugu: 'దువ్వెన', category: 'Personal Care', unitType: 'count', pricePerUnit: 30, lowStockThreshold: 1 },

  // Baby Care
  { name: 'Diapers', nameTelugu: 'డైపర్స్', category: 'Baby Care', unitType: 'count', pricePerUnit: 350, lowStockThreshold: 1 },
  { name: 'Baby Powder', nameTelugu: 'బేబీ పౌడర్', category: 'Baby Care', unitType: 'count', pricePerUnit: 150, lowStockThreshold: 1 },
  { name: 'Baby Oil', nameTelugu: 'బేబీ ఆయిల్', category: 'Baby Care', unitType: 'count', pricePerUnit: 130, lowStockThreshold: 1 },
  { name: 'Baby Soap', nameTelugu: 'బేబీ సబ్బు', category: 'Baby Care', unitType: 'count', pricePerUnit: 40, lowStockThreshold: 1 },
  { name: 'Baby Wipes', nameTelugu: 'బేబీ వైప్స్', category: 'Baby Care', unitType: 'count', pricePerUnit: 120, lowStockThreshold: 1 },
];

module.exports = { defaultItems };
