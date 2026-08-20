/* foods.js — ingredient database.
 *
 * Nutrition is per 100 g (or 100 ml for liquids) of the food AS PURCHASED / RAW,
 * because that is what you weigh when you shop and cook. Values are rounded
 * typical values for Australian supermarket products — good enough for planning
 * and logging, not a substitute for the label on the pack in front of you.
 *
 * per100: [kcal, protein g, carbs g, fat g, fibre g]
 * pack:   the closest thing Coles/Woolworths actually sell it in, used by the
 *         grocery list. `price` is a rough AUD estimate you can edit in-app.
 * contains: allergen / diet markers used to filter recipes.
 * eaG:    grams in one countable unit (1 egg, 1 slice, 1 wrap...) where relevant.
 */

const AISLES = [
  'Fruit & Veg',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Bakery',
  'Pantry',
  'Freezer',
  'Health Foods',
  'Snacks & Drinks'
];

const INGREDIENTS = [
  /* ---------------- Meat & Seafood ---------------- */
  { id: 'chicken_breast', name: 'Chicken breast fillet', aisle: 'Meat & Seafood', per100: [120, 23, 0, 2.6, 0], pack: { qty: 1000, label: '~1 kg tray', price: 13.5 }, contains: ['meat'] },
  { id: 'chicken_thigh', name: 'Chicken thigh fillet (skinless)', aisle: 'Meat & Seafood', per100: [145, 19, 0, 7.5, 0], pack: { qty: 1000, label: '~1 kg tray', price: 12.0 }, contains: ['meat'] },
  { id: 'beef_mince_lean', name: 'Beef mince, lean (5% fat)', aisle: 'Meat & Seafood', per100: [137, 21, 0, 5.5, 0], pack: { qty: 500, label: '500 g pack', price: 9.5 }, contains: ['meat'] },
  { id: 'beef_strips', name: 'Beef stir-fry strips', aisle: 'Meat & Seafood', per100: [145, 22, 0, 6, 0], pack: { qty: 500, label: '500 g pack', price: 12.0 }, contains: ['meat'] },
  { id: 'lamb_leg', name: 'Lamb leg steak', aisle: 'Meat & Seafood', per100: [180, 20, 0, 11, 0], pack: { qty: 500, label: '500 g pack', price: 14.0 }, contains: ['meat'] },
  { id: 'pork_loin', name: 'Pork loin steak', aisle: 'Meat & Seafood', per100: [143, 21, 0, 6, 0], pack: { qty: 500, label: '500 g pack', price: 9.0 }, contains: ['meat', 'pork'] },
  { id: 'turkey_mince', name: 'Turkey mince', aisle: 'Meat & Seafood', per100: [148, 21, 0, 7, 0], pack: { qty: 500, label: '500 g pack', price: 10.0 }, contains: ['meat'] },
  { id: 'bacon_short_cut', name: 'Short cut bacon', aisle: 'Meat & Seafood', per100: [180, 24, 1, 9, 0], pack: { qty: 250, label: '250 g pack', price: 6.5 }, contains: ['meat', 'pork'] },
  { id: 'salmon_fillet', name: 'Salmon fillet', aisle: 'Meat & Seafood', per100: [208, 20, 0, 13, 0], pack: { qty: 300, label: '2 fillets (~300 g)', price: 13.0 }, contains: ['fish'] },
  { id: 'barramundi', name: 'Barramundi fillet', aisle: 'Meat & Seafood', per100: [110, 22, 0, 2, 0], pack: { qty: 400, label: '400 g pack', price: 14.0 }, contains: ['fish'] },
  { id: 'basa', name: 'Basa fillet (frozen)', aisle: 'Freezer', per100: [90, 16, 0, 3, 0], pack: { qty: 500, label: '500 g pack', price: 8.5 }, contains: ['fish'] },
  { id: 'prawns', name: 'Green prawns, peeled', aisle: 'Meat & Seafood', per100: [85, 20, 0, 0.5, 0], pack: { qty: 400, label: '400 g pack', price: 15.0 }, contains: ['shellfish'] },
  { id: 'tuna_can', name: 'Tuna in springwater', aisle: 'Pantry', per100: [116, 26, 0, 1, 0], pack: { qty: 95, label: '95 g can', price: 1.8 }, ownBrand: true, contains: ['fish'] },
  { id: 'salmon_can', name: 'Pink salmon, canned', aisle: 'Pantry', per100: [167, 22, 0, 8.5, 0], pack: { qty: 210, label: '210 g can', price: 4.5 }, ownBrand: true, contains: ['fish'] },

  /* ---------------- Dairy & Eggs ---------------- */
  { id: 'eggs', name: 'Free range eggs', aisle: 'Dairy & Eggs', per100: [143, 12.6, 0.7, 9.5, 0], eaG: 50, pack: { qty: 600, label: '12 pack (large)', price: 7.5 }, contains: ['egg'] },
  { id: 'egg_whites', name: 'Liquid egg whites', aisle: 'Dairy & Eggs', unit: 'ml', per100: [52, 11, 0.7, 0.2, 0], pack: { qty: 500, label: '500 ml bottle', price: 6.0 }, contains: ['egg'] },
  { id: 'greek_yoghurt', name: 'Greek yoghurt, natural (no fat)', aisle: 'Dairy & Eggs', per100: [59, 10, 3.9, 0.4, 0], pack: { qty: 1000, label: '1 kg tub', price: 8.0 }, ownBrand: true, contains: ['dairy'] },
  { id: 'yoghurt_full', name: 'Greek yoghurt, full fat', aisle: 'Dairy & Eggs', per100: [97, 9, 4, 5, 0], pack: { qty: 1000, label: '1 kg tub', price: 8.0 }, ownBrand: true, contains: ['dairy'] },
  { id: 'cottage_cheese', name: 'Cottage cheese', aisle: 'Dairy & Eggs', per100: [98, 11, 3.4, 4.3, 0], pack: { qty: 500, label: '500 g tub', price: 5.5 }, contains: ['dairy'] },
  { id: 'milk_skim', name: 'Skim milk', aisle: 'Dairy & Eggs', unit: 'ml', per100: [35, 3.5, 5, 0.1, 0], pack: { qty: 2000, label: '2 L bottle', price: 3.3 }, ownBrand: true, contains: ['dairy'] },
  { id: 'milk_full', name: 'Full cream milk', aisle: 'Dairy & Eggs', unit: 'ml', per100: [64, 3.4, 4.8, 3.4, 0], pack: { qty: 2000, label: '2 L bottle', price: 3.3 }, ownBrand: true, contains: ['dairy'] },
  { id: 'almond_milk', name: 'Almond milk, unsweetened', aisle: 'Pantry', unit: 'ml', per100: [15, 0.5, 0.3, 1.2, 0], pack: { qty: 1000, label: '1 L carton', price: 2.6 }, contains: ['nuts'] },
  { id: 'soy_milk', name: 'Soy milk, unsweetened', aisle: 'Pantry', unit: 'ml', per100: [40, 3.3, 1.8, 1.9, 0], pack: { qty: 1000, label: '1 L carton', price: 2.6 }, contains: ['soy'] },
  { id: 'cheddar', name: 'Tasty cheese block', aisle: 'Dairy & Eggs', per100: [404, 25, 1.3, 33, 0], pack: { qty: 500, label: '500 g block', price: 8.0 }, ownBrand: true, contains: ['dairy'] },
  { id: 'feta', name: 'Feta', aisle: 'Dairy & Eggs', per100: [264, 14, 4, 21, 0], pack: { qty: 200, label: '200 g tub', price: 5.5 }, contains: ['dairy'] },
  { id: 'parmesan', name: 'Parmesan, grated', aisle: 'Dairy & Eggs', per100: [392, 35, 3.2, 26, 0], pack: { qty: 250, label: '250 g wedge', price: 8.0 }, contains: ['dairy'] },
  { id: 'haloumi', name: 'Haloumi', aisle: 'Dairy & Eggs', per100: [321, 22, 2, 25, 0], pack: { qty: 180, label: '180 g pack', price: 6.5 }, contains: ['dairy'] },

  /* ---------------- Plant proteins ---------------- */
  { id: 'tofu_firm', name: 'Firm tofu', aisle: 'Dairy & Eggs', per100: [144, 15, 3, 8, 1], pack: { qty: 300, label: '300 g block', price: 4.0 }, contains: ['soy'] },
  { id: 'tempeh', name: 'Tempeh', aisle: 'Dairy & Eggs', per100: [192, 20, 7.6, 11, 5], pack: { qty: 300, label: '300 g block', price: 6.5 }, contains: ['soy'] },
  { id: 'chickpeas_can', name: 'Chickpeas, canned', aisle: 'Pantry', per100: [119, 7, 16, 2.6, 7], pack: { qty: 400, label: '400 g can', price: 1.3 }, ownBrand: true, contains: [] },
  { id: 'black_beans_can', name: 'Black beans, canned', aisle: 'Pantry', per100: [114, 7, 15, 0.5, 7], pack: { qty: 400, label: '400 g can', price: 1.6 }, ownBrand: true, contains: [] },
  { id: 'kidney_beans_can', name: 'Red kidney beans, canned', aisle: 'Pantry', per100: [103, 7, 13, 0.4, 6], pack: { qty: 400, label: '400 g can', price: 1.3 }, ownBrand: true, contains: [] },
  { id: 'lentils_dry', name: 'Red lentils, dried', aisle: 'Pantry', per100: [352, 25, 60, 1, 30], pack: { qty: 500, label: '500 g bag', price: 3.0 }, ownBrand: true, contains: [] },
  { id: 'lentils_can', name: 'Brown lentils, canned', aisle: 'Pantry', per100: [116, 9, 12, 0.4, 5], pack: { qty: 400, label: '400 g can', price: 1.5 }, ownBrand: true, contains: [] },
  { id: 'whey_protein', name: 'Whey protein powder', aisle: 'Health Foods', per100: [380, 78, 7, 5, 0], pack: { qty: 1000, label: '1 kg tub', price: 55.0 }, contains: ['dairy'] },
  { id: 'pea_protein', name: 'Plant protein powder (pea/soy)', aisle: 'Health Foods', per100: [370, 78, 6, 5, 2], pack: { qty: 1000, label: '1 kg tub', price: 50.0 }, contains: [] },
  { id: 'soy_yoghurt', name: 'Coconut or soy yoghurt', aisle: 'Dairy & Eggs', per100: [72, 4, 7, 3, 0.5], pack: { qty: 500, label: '500 g tub', price: 5.5 }, contains: ['soy'] },
  { id: 'edamame', name: 'Frozen edamame', aisle: 'Freezer', per100: [121, 12, 9, 5, 5], pack: { qty: 500, label: '500 g bag', price: 6.0 }, contains: ['soy'] },
  { id: 'protein_bar', name: 'Protein bar', aisle: 'Health Foods', per100: [380, 30, 35, 12, 5], eaG: 60, pack: { qty: 300, label: '5 pack', price: 12.0 }, contains: ['dairy'] },

  /* ---------------- Grains, bread, pasta ---------------- */
  { id: 'oats', name: 'Rolled oats', aisle: 'Pantry', per100: [379, 13, 60, 7, 10], pack: { qty: 1000, label: '1 kg bag', price: 2.5 }, ownBrand: true, contains: ['gluten'] },
  { id: 'weetbix', name: 'Wheat biscuits (Weet-Bix style)', aisle: 'Pantry', per100: [350, 12, 67, 1.5, 11], eaG: 30, pack: { qty: 750, label: '750 g box', price: 5.5 }, contains: ['gluten'] },
  { id: 'rice_basmati', name: 'Basmati rice, dry', aisle: 'Pantry', per100: [355, 8, 78, 1, 1.5], pack: { qty: 1000, label: '1 kg bag', price: 3.5 }, ownBrand: true, contains: [] },
  { id: 'rice_brown', name: 'Brown rice, dry', aisle: 'Pantry', per100: [362, 7.5, 76, 2.7, 3.5], pack: { qty: 1000, label: '1 kg bag', price: 3.5 }, ownBrand: true, contains: [] },
  { id: 'pasta', name: 'Pasta, dry', aisle: 'Pantry', per100: [360, 12.5, 71, 1.5, 3], pack: { qty: 500, label: '500 g pack', price: 1.5 }, ownBrand: true, contains: ['gluten'] },
  { id: 'pasta_wholemeal', name: 'Wholemeal pasta, dry', aisle: 'Pantry', per100: [348, 14, 63, 2.5, 8], pack: { qty: 500, label: '500 g pack', price: 2.2 }, ownBrand: true, contains: ['gluten'] },
  { id: 'noodles_rice', name: 'Rice noodles, dry', aisle: 'Pantry', per100: [364, 6, 82, 0.6, 1.5], pack: { qty: 375, label: '375 g pack', price: 3.0 }, contains: [] },
  { id: 'quinoa', name: 'Quinoa, dry', aisle: 'Pantry', per100: [368, 14, 64, 6, 7], pack: { qty: 500, label: '500 g bag', price: 6.0 }, contains: [] },
  { id: 'couscous', name: 'Couscous, dry', aisle: 'Pantry', per100: [376, 13, 72, 0.6, 5], pack: { qty: 500, label: '500 g box', price: 3.0 }, contains: ['gluten'] },
  { id: 'bread_wholemeal', name: 'Wholemeal bread', aisle: 'Bakery', per100: [240, 10, 40, 3, 6], eaG: 40, pack: { qty: 700, label: '700 g loaf', price: 3.5 }, ownBrand: true, contains: ['gluten'] },
  { id: 'bread_sourdough', name: 'Sourdough loaf', aisle: 'Bakery', per100: [260, 9, 48, 1.5, 3], eaG: 50, pack: { qty: 600, label: '600 g loaf', price: 5.5 }, contains: ['gluten'] },
  { id: 'wrap', name: 'Wholemeal wraps', aisle: 'Bakery', per100: [290, 9, 46, 6, 5], eaG: 60, pack: { qty: 480, label: '8 pack', price: 4.0 }, ownBrand: true, contains: ['gluten'] },
  { id: 'english_muffin', name: 'English muffins', aisle: 'Bakery', per100: [230, 9, 44, 1.5, 3], eaG: 67, pack: { qty: 400, label: '6 pack', price: 3.5 }, contains: ['gluten'] },
  { id: 'rice_cakes', name: 'Rice cakes', aisle: 'Snacks & Drinks', per100: [387, 8, 80, 3, 3], eaG: 9, pack: { qty: 150, label: '150 g pack', price: 2.5 }, ownBrand: true, contains: [] },
  { id: 'potato', name: 'Potatoes (washed)', aisle: 'Fruit & Veg', per100: [77, 2, 17, 0.1, 2.2], pack: { qty: 2000, label: '2 kg bag', price: 5.0 }, contains: [] },
  { id: 'sweet_potato', name: 'Sweet potato', aisle: 'Fruit & Veg', per100: [86, 1.6, 20, 0.1, 3], pack: { qty: 1000, label: '~1 kg (2 medium)', price: 5.0 }, contains: [] },

  /* ---------------- Vegetables ---------------- */
  { id: 'broccoli', name: 'Broccoli', aisle: 'Fruit & Veg', per100: [34, 2.8, 4, 0.4, 2.6], pack: { qty: 400, label: '1 head (~400 g)', price: 3.5 }, contains: [] },
  { id: 'carrot', name: 'Carrots', aisle: 'Fruit & Veg', per100: [41, 0.9, 8, 0.2, 2.8], pack: { qty: 1000, label: '1 kg bag', price: 2.5 }, contains: [] },
  { id: 'capsicum', name: 'Capsicum', aisle: 'Fruit & Veg', per100: [26, 1, 5, 0.3, 1.7], eaG: 160, pack: { qty: 320, label: '2 pieces', price: 5.0 }, contains: [] },
  { id: 'onion', name: 'Brown onions', aisle: 'Fruit & Veg', per100: [40, 1.1, 9, 0.1, 1.7], eaG: 120, pack: { qty: 1000, label: '1 kg bag', price: 2.5 }, contains: [] },
  { id: 'garlic', name: 'Garlic', aisle: 'Fruit & Veg', per100: [149, 6, 33, 0.5, 2], eaG: 4, pack: { qty: 100, label: '1 bulb pack', price: 2.0 }, contains: [] },
  { id: 'tomato', name: 'Tomatoes', aisle: 'Fruit & Veg', per100: [18, 0.9, 3.9, 0.2, 1.2], eaG: 120, pack: { qty: 600, label: '~600 g', price: 4.5 }, contains: [] },
  { id: 'cherry_tomato', name: 'Cherry tomatoes', aisle: 'Fruit & Veg', per100: [18, 0.9, 3.9, 0.2, 1.2], pack: { qty: 250, label: '250 g punnet', price: 4.0 }, contains: [] },
  { id: 'cucumber', name: 'Continental cucumber', aisle: 'Fruit & Veg', per100: [15, 0.7, 3.6, 0.1, 0.5], eaG: 350, pack: { qty: 350, label: '1 each', price: 3.0 }, contains: [] },
  { id: 'spinach', name: 'Baby spinach', aisle: 'Fruit & Veg', per100: [23, 2.9, 1.4, 0.4, 2.2], pack: { qty: 280, label: '280 g bag', price: 4.5 }, contains: [] },
  { id: 'salad_leaves', name: 'Mixed salad leaves', aisle: 'Fruit & Veg', per100: [17, 1.5, 2, 0.2, 1.5], pack: { qty: 250, label: '250 g bag', price: 4.5 }, contains: [] },
  { id: 'cos_lettuce', name: 'Cos lettuce', aisle: 'Fruit & Veg', per100: [15, 1.2, 2.2, 0.2, 1.5], eaG: 400, pack: { qty: 400, label: '1 each', price: 3.5 }, contains: [] },
  { id: 'zucchini', name: 'Zucchini', aisle: 'Fruit & Veg', per100: [17, 1.2, 3.1, 0.3, 1], eaG: 200, pack: { qty: 400, label: '~400 g', price: 3.5 }, contains: [] },
  { id: 'mushrooms', name: 'Button mushrooms', aisle: 'Fruit & Veg', per100: [22, 3.1, 3.3, 0.3, 1], pack: { qty: 400, label: '~400 g', price: 5.0 }, contains: [] },
  { id: 'green_beans', name: 'Green beans', aisle: 'Fruit & Veg', per100: [31, 1.8, 7, 0.2, 3.4], pack: { qty: 300, label: '~300 g', price: 3.5 }, contains: [] },
  { id: 'cauliflower', name: 'Cauliflower', aisle: 'Fruit & Veg', per100: [25, 1.9, 5, 0.3, 2], pack: { qty: 700, label: '1 head', price: 5.0 }, contains: [] },
  { id: 'pumpkin', name: 'Pumpkin', aisle: 'Fruit & Veg', per100: [26, 1, 6.5, 0.1, 0.5], pack: { qty: 1000, label: '~1 kg piece', price: 4.0 }, contains: [] },
  { id: 'asparagus', name: 'Asparagus', aisle: 'Fruit & Veg', per100: [20, 2.2, 3.9, 0.1, 2.1], pack: { qty: 170, label: '1 bunch', price: 4.0 }, contains: [] },
  { id: 'avocado', name: 'Avocado', aisle: 'Fruit & Veg', per100: [160, 2, 9, 15, 7], eaG: 150, pack: { qty: 300, label: '2 each', price: 5.0 }, contains: [] },
  { id: 'peas_frozen', name: 'Frozen peas', aisle: 'Freezer', per100: [81, 5, 14, 0.4, 5], pack: { qty: 1000, label: '1 kg bag', price: 3.5 }, ownBrand: true, contains: [] },
  { id: 'corn_frozen', name: 'Frozen sweetcorn', aisle: 'Freezer', per100: [86, 3.3, 19, 1.2, 2.5], pack: { qty: 500, label: '500 g bag', price: 3.0 }, ownBrand: true, contains: [] },
  { id: 'stirfry_veg', name: 'Frozen stir-fry vegetables', aisle: 'Freezer', per100: [40, 2, 6, 0.3, 2.5], pack: { qty: 1000, label: '1 kg bag', price: 5.0 }, ownBrand: true, contains: [] },
  { id: 'ginger', name: 'Ginger', aisle: 'Fruit & Veg', per100: [80, 1.8, 18, 0.8, 2], pack: { qty: 100, label: '~100 g piece', price: 1.5 }, contains: [] },

  /* ---------------- Fruit ---------------- */
  { id: 'banana', name: 'Bananas', aisle: 'Fruit & Veg', per100: [89, 1.1, 23, 0.3, 2.6], eaG: 118, pack: { qty: 800, label: '~7 bananas', price: 4.0 }, contains: [] },
  { id: 'apple', name: 'Apples', aisle: 'Fruit & Veg', per100: [52, 0.3, 14, 0.2, 2.4], eaG: 150, pack: { qty: 1000, label: '1 kg bag', price: 5.0 }, contains: [] },
  { id: 'orange', name: 'Oranges', aisle: 'Fruit & Veg', per100: [47, 0.9, 12, 0.1, 2.4], eaG: 180, pack: { qty: 2000, label: '2 kg bag', price: 6.0 }, contains: [] },
  { id: 'strawberries', name: 'Strawberries', aisle: 'Fruit & Veg', per100: [32, 0.7, 7.7, 0.3, 2], pack: { qty: 250, label: '250 g punnet', price: 4.5 }, contains: [] },
  { id: 'berries_frozen', name: 'Frozen mixed berries', aisle: 'Freezer', per100: [50, 1, 10, 0.3, 4], pack: { qty: 500, label: '500 g bag', price: 6.5 }, ownBrand: true, contains: [] },
  { id: 'blueberries', name: 'Blueberries', aisle: 'Fruit & Veg', per100: [57, 0.7, 14, 0.3, 2.4], pack: { qty: 125, label: '125 g punnet', price: 4.5 }, contains: [] },
  { id: 'lemon', name: 'Lemons', aisle: 'Fruit & Veg', per100: [29, 1.1, 9, 0.3, 2.8], eaG: 100, pack: { qty: 300, label: '3 each', price: 3.0 }, contains: [] },
  { id: 'dates', name: 'Medjool dates', aisle: 'Pantry', per100: [282, 2.5, 75, 0.4, 8], eaG: 24, pack: { qty: 400, label: '400 g pack', price: 8.0 }, contains: [] },

  /* ---------------- Fats, nuts, spreads ---------------- */
  { id: 'olive_oil', name: 'Extra virgin olive oil', aisle: 'Pantry', unit: 'ml', per100: [884, 0, 0, 100, 0], pack: { qty: 750, label: '750 ml bottle', price: 9.0 }, ownBrand: true, contains: [] },
  { id: 'spray_oil', name: 'Olive oil spray', aisle: 'Pantry', unit: 'ml', per100: [884, 0, 0, 100, 0], pack: { qty: 200, label: '200 ml can', price: 4.5 }, contains: [] },
  { id: 'peanut_butter', name: 'Peanut butter, natural', aisle: 'Pantry', per100: [588, 25, 20, 50, 6], pack: { qty: 500, label: '500 g jar', price: 5.5 }, ownBrand: true, contains: ['nuts'] },
  { id: 'almonds', name: 'Almonds', aisle: 'Pantry', per100: [579, 21, 22, 50, 12], pack: { qty: 400, label: '400 g bag', price: 8.0 }, contains: ['nuts'] },
  { id: 'walnuts', name: 'Walnuts', aisle: 'Pantry', per100: [654, 15, 14, 65, 7], pack: { qty: 250, label: '250 g bag', price: 8.0 }, contains: ['nuts'] },
  { id: 'cashews', name: 'Cashews', aisle: 'Pantry', per100: [553, 18, 30, 44, 3], pack: { qty: 375, label: '375 g bag', price: 9.0 }, contains: ['nuts'] },
  { id: 'chia', name: 'Chia seeds', aisle: 'Health Foods', per100: [486, 17, 42, 31, 34], pack: { qty: 500, label: '500 g bag', price: 8.0 }, contains: [] },
  { id: 'mixed_seeds', name: 'Mixed seeds (pepita/sunflower)', aisle: 'Health Foods', per100: [550, 20, 15, 45, 8], pack: { qty: 400, label: '400 g bag', price: 6.0 }, contains: [] },
  { id: 'tahini', name: 'Tahini', aisle: 'Pantry', per100: [595, 17, 21, 54, 9], pack: { qty: 375, label: '375 g jar', price: 7.0 }, contains: [] },
  { id: 'hummus', name: 'Hummus', aisle: 'Dairy & Eggs', per100: [166, 8, 14, 10, 6], pack: { qty: 200, label: '200 g tub', price: 4.0 }, contains: [] },

  /* ---------------- Pantry / sauces ---------------- */
  { id: 'passata', name: 'Tomato passata', aisle: 'Pantry', per100: [35, 1.5, 6, 0.2, 1.5], pack: { qty: 700, label: '700 g jar', price: 2.0 }, ownBrand: true, contains: [] },
  { id: 'tinned_tomatoes', name: 'Diced tomatoes, canned', aisle: 'Pantry', per100: [32, 1.5, 5, 0.2, 1.4], pack: { qty: 400, label: '400 g can', price: 1.2 }, ownBrand: true, contains: [] },
  { id: 'tomato_paste', name: 'Tomato paste', aisle: 'Pantry', per100: [82, 4, 19, 0.5, 4], pack: { qty: 140, label: '140 g tube', price: 1.5 }, ownBrand: true, contains: [] },
  { id: 'coconut_milk_light', name: 'Light coconut milk', aisle: 'Pantry', unit: 'ml', per100: [73, 1, 2, 7, 0], pack: { qty: 400, label: '400 ml can', price: 1.6 }, ownBrand: true, contains: [] },
  { id: 'curry_paste', name: 'Curry paste (green/red)', aisle: 'Pantry', per100: [150, 3, 12, 10, 3], pack: { qty: 200, label: '200 g jar', price: 4.0 }, contains: ['fish'] },
  { id: 'soy_sauce', name: 'Soy sauce, salt reduced', aisle: 'Pantry', unit: 'ml', per100: [53, 8, 5, 0, 0], pack: { qty: 500, label: '500 ml bottle', price: 4.0 }, contains: ['soy', 'gluten'] },
  { id: 'sriracha', name: 'Sriracha / chilli sauce', aisle: 'Pantry', per100: [93, 1, 19, 1, 1], pack: { qty: 435, label: '435 ml bottle', price: 5.0 }, contains: [] },
  { id: 'mustard', name: 'Dijon mustard', aisle: 'Pantry', per100: [66, 4, 6, 3, 3], pack: { qty: 200, label: '200 g jar', price: 3.0 }, contains: [] },
  { id: 'mayo_light', name: 'Light mayonnaise', aisle: 'Pantry', per100: [200, 1, 8, 18, 0], pack: { qty: 470, label: '470 g jar', price: 4.5 }, ownBrand: true, contains: ['egg'] },
  { id: 'balsamic', name: 'Balsamic vinegar', aisle: 'Pantry', unit: 'ml', per100: [88, 0.5, 17, 0, 0], pack: { qty: 500, label: '500 ml bottle', price: 4.0 }, ownBrand: true, contains: [] },
  { id: 'salsa', name: 'Tomato salsa', aisle: 'Pantry', per100: [36, 1.5, 7, 0.2, 1.5], pack: { qty: 300, label: '300 g jar', price: 3.5 }, contains: [] },
  { id: 'pesto', name: 'Basil pesto', aisle: 'Pantry', per100: [460, 5, 6, 46, 2], pack: { qty: 190, label: '190 g jar', price: 4.5 }, contains: ['dairy', 'nuts'] },
  { id: 'stock', name: 'Salt-reduced stock', aisle: 'Pantry', unit: 'ml', per100: [4, 0.4, 0.5, 0, 0], pack: { qty: 1000, label: '1 L carton', price: 2.0 }, ownBrand: true, contains: [] },
  { id: 'honey', name: 'Honey', aisle: 'Pantry', per100: [304, 0.3, 82, 0, 0], pack: { qty: 500, label: '500 g jar', price: 7.0 }, ownBrand: true, contains: [] },
  { id: 'spices', name: 'Spices & dried herbs', aisle: 'Pantry', per100: [250, 10, 45, 6, 25], pack: { qty: 50, label: 'jar', price: 2.5 }, contains: [] },
  { id: 'dark_chocolate', name: 'Dark chocolate (70%)', aisle: 'Snacks & Drinks', per100: [546, 7, 46, 31, 11], pack: { qty: 180, label: '180 g block', price: 5.0 }, contains: ['dairy'] },
  { id: 'popcorn_kernels', name: 'Popcorn kernels', aisle: 'Pantry', per100: [387, 12, 78, 4, 15], pack: { qty: 500, label: '500 g bag', price: 3.0 }, contains: [] },
  { id: 'coffee', name: 'Ground coffee', aisle: 'Pantry', per100: [4, 0.3, 0.5, 0, 0], pack: { qty: 500, label: '500 g bag', price: 12.0 }, contains: [] }
];

const FOOD_BY_ID = INGREDIENTS.reduce((m, f) => { m[f.id] = f; return m; }, {});

/* Nutrition of `grams` of an ingredient. */
function nutritionOf(id, grams) {
  const f = FOOD_BY_ID[id];
  if (!f) return { kcal: 0, p: 0, c: 0, fat: 0, fib: 0 };
  const k = grams / 100;
  return {
    kcal: f.per100[0] * k,
    p: f.per100[1] * k,
    c: f.per100[2] * k,
    fat: f.per100[3] * k,
    fib: (f.per100[4] || 0) * k
  };
}

const emptyNutrition = () => ({ kcal: 0, p: 0, c: 0, fat: 0, fib: 0 });

function addNutrition(a, b, mult) {
  const m = mult == null ? 1 : mult;
  a.kcal += b.kcal * m; a.p += b.p * m; a.c += b.c * m; a.fat += b.fat * m; a.fib += b.fib * m;
  return a;
}

/* Diet presets -> the `contains` markers they rule out. */
const DIET_EXCLUSIONS = {
  vegetarian: ['meat', 'pork', 'fish', 'shellfish'],
  vegan: ['meat', 'pork', 'fish', 'shellfish', 'egg', 'dairy'],
  pescatarian: ['meat', 'pork'],
  no_pork: ['pork'],
  no_shellfish: ['shellfish'],
  gluten_free: ['gluten'],
  dairy_free: ['dairy'],
  nut_free: ['nuts']
};

const DIET_LABELS = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  pescatarian: 'Pescatarian',
  no_pork: 'No pork',
  no_shellfish: 'No shellfish',
  gluten_free: 'Gluten free',
  dairy_free: 'Dairy free',
  nut_free: 'Nut free'
};

function exclusionsFor(diets) {
  const out = new Set();
  (diets || []).forEach((d) => (DIET_EXCLUSIONS[d] || []).forEach((x) => out.add(x)));
  return out;
}
