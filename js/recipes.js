/* recipes.js — meal library.
 *
 * Every recipe is written for ONE SERVE, so the planner can scale it by a
 * factor (0.7–1.6) to hit your calorie target without doing fractional maths on
 * whole recipes. Ingredient amounts are grams (or ml) of the raw item, matching
 * the units in foods.js.
 */

const RECIPES = [
  /* ---------------------------- breakfast ---------------------------- */
  {
    id: 'overnight_oats',
    name: 'Protein overnight oats',
    slots: ['breakfast'],
    mins: 5,
    ing: [['oats', 60], ['greek_yoghurt', 150], ['whey_protein', 20], ['berries_frozen', 80], ['chia', 10]],
    steps: [
      'Stir oats, yoghurt, protein powder and chia together with a splash of water or milk.',
      'Top with the berries, cover and leave in the fridge overnight.',
      'Eat cold straight from the container — it keeps 3 days, so make several at once.'
    ]
  },
  {
    id: 'eggs_on_toast',
    name: 'Scrambled eggs, spinach & toast',
    slots: ['breakfast'],
    mins: 10,
    ing: [['eggs', 150], ['bread_wholemeal', 80], ['spinach', 40], ['cherry_tomato', 60], ['olive_oil', 5]],
    steps: [
      'Wilt the spinach and tomatoes in a pan with the oil, 1 minute.',
      'Beat the eggs, pour in, stir gently over low heat until just set.',
      'Toast the bread and pile it on. Salt, pepper, chilli flakes.'
    ]
  },
  {
    id: 'weetbix_bowl',
    name: 'Weet-Bix, milk & banana',
    slots: ['breakfast'],
    mins: 3,
    ing: [['weetbix', 60], ['milk_skim', 250], ['banana', 100], ['honey', 8]],
    steps: ['Bowl. Biscuits. Milk. Sliced banana. Drizzle of honey. Done in 90 seconds.']
  },
  {
    id: 'yoghurt_bowl',
    name: 'Greek yoghurt & berry bowl',
    slots: ['breakfast', 'snack'],
    mins: 3,
    ing: [['greek_yoghurt', 250], ['berries_frozen', 100], ['almonds', 20], ['honey', 10]],
    steps: ['Yoghurt in a bowl, berries on top (they thaw in a few minutes), scatter almonds, drizzle honey.']
  },
  {
    id: 'veggie_omelette',
    name: 'Veggie & feta omelette',
    slots: ['breakfast', 'lunch'],
    mins: 12,
    ing: [['eggs', 150], ['mushrooms', 60], ['capsicum', 60], ['feta', 30], ['olive_oil', 6], ['bread_wholemeal', 40]],
    steps: [
      'Fry mushrooms and capsicum in the oil until the water cooks off.',
      'Pour over beaten eggs, cook on low until nearly set, crumble feta over one half and fold.',
      'Serve with a slice of toast.'
    ]
  },
  {
    id: 'protein_smoothie',
    name: 'Banana peanut protein smoothie',
    slots: ['breakfast', 'snack'],
    mins: 3,
    ing: [['milk_skim', 300], ['banana', 120], ['whey_protein', 30], ['peanut_butter', 20], ['oats', 30]],
    steps: ['Everything in the blender, 45 seconds. Add ice if you want it thicker.']
  },
  {
    id: 'avo_egg_toast',
    name: 'Smashed avo & egg on sourdough',
    slots: ['breakfast'],
    mins: 8,
    ing: [['bread_sourdough', 80], ['avocado', 70], ['eggs', 100], ['lemon', 5], ['spinach', 30]],
    steps: [
      'Poach or fry the eggs.',
      'Smash the avocado with lemon juice, salt and pepper; spread on toast.',
      'Spinach, then eggs on top.'
    ]
  },
  {
    id: 'cottage_toast',
    name: 'Cottage cheese toast with strawberries',
    slots: ['breakfast', 'snack'],
    mins: 4,
    ing: [['bread_wholemeal', 60], ['cottage_cheese', 120], ['strawberries', 80], ['honey', 6]],
    steps: ['Toast, spread thickly with cottage cheese, sliced strawberries, honey, crack of pepper.']
  },

  {
    id: 'vegan_oats',
    name: 'Peanut butter & banana oats (plant based)',
    slots: ['breakfast'],
    mins: 6,
    ing: [['oats', 70], ['soy_milk', 250], ['banana', 100], ['peanut_butter', 25], ['chia', 10], ['pea_protein', 25]],
    steps: [
      'Oats and soy milk in a pot, 4 minutes on medium, stirring.',
      'Off the heat, stir the peanut butter and protein powder through until they disappear — off the heat matters, or it goes gluey.',
      'Sliced banana and chia on top.'
    ]
  },
  {
    id: 'tofu_scramble',
    name: 'Tofu scramble on toast',
    slots: ['breakfast'],
    mins: 12,
    ing: [['tofu_firm', 180], ['bread_wholemeal', 80], ['spinach', 50], ['cherry_tomato', 60], ['olive_oil', 8], ['spices', 4]],
    steps: [
      'Crumble the tofu into a hot oiled pan.',
      'Turmeric, cumin, salt and pepper — cook 5 minutes until the edges catch.',
      'Spinach and tomatoes in at the end, pile onto toast.'
    ]
  },
  {
    id: 'vegan_smoothie',
    name: 'Plant protein smoothie',
    slots: ['breakfast', 'snack'],
    mins: 3,
    ing: [['soy_milk', 350], ['banana', 120], ['oats', 40], ['peanut_butter', 20], ['chia', 10], ['pea_protein', 35]],
    steps: ['Blend until smooth. Soy milk matters here — it carries far more protein than almond or oat.']
  },

  {
    id: 'soy_yoghurt_bowl',
    name: 'Plant yoghurt & berry protein bowl',
    slots: ['breakfast', 'snack'],
    mins: 3,
    ing: [['soy_yoghurt', 200], ['pea_protein', 25], ['berries_frozen', 100], ['mixed_seeds', 20], ['oats', 30]],
    steps: ['Stir the protein powder through the yoghurt with a splash of water, then berries, seeds and oats on top.']
  },

  /* ------------------------------ lunch ------------------------------ */
  {
    id: 'chicken_rice_bowl',
    name: 'Chicken & rice bowl with greens',
    slots: ['lunch', 'dinner'],
    mins: 25,
    batch: true,
    ing: [['chicken_breast', 180], ['rice_basmati', 75], ['broccoli', 120], ['carrot', 60], ['soy_sauce', 12], ['olive_oil', 8], ['spices', 3]],
    steps: [
      'Rice on (1 part rice : 1.5 parts water, 12 min covered, rest 5).',
      'Season and pan-fry the chicken 5–6 min a side, rest, then slice.',
      'Steam or microwave the broccoli and carrot.',
      'Assemble, splash of soy, chilli if you like. Doubles easily for tomorrow.'
    ]
  },
  {
    id: 'tuna_wrap',
    name: 'Tuna salad wrap',
    slots: ['lunch'],
    mins: 6,
    ing: [['wrap', 60], ['tuna_can', 95], ['mayo_light', 20], ['salad_leaves', 40], ['cucumber', 50], ['tomato', 50]],
    steps: ['Drain the tuna, mix with mayo and pepper. Load the wrap, roll tightly, cut on the diagonal.']
  },
  {
    id: 'chickpea_feta_salad',
    name: 'Chickpea, feta & cucumber salad',
    slots: ['lunch'],
    mins: 8,
    ing: [['chickpeas_can', 240], ['feta', 40], ['cucumber', 100], ['cherry_tomato', 100], ['olive_oil', 10], ['lemon', 10], ['spinach', 40]],
    steps: ['Rinse the chickpeas, chop everything, toss with oil, lemon, salt and pepper. Better after an hour in the fridge.']
  },
  {
    id: 'salmon_sweet_potato',
    name: 'Salmon & roast sweet potato salad',
    slots: ['lunch', 'dinner'],
    mins: 30,
    ing: [['salmon_fillet', 150], ['sweet_potato', 200], ['spinach', 60], ['olive_oil', 10], ['lemon', 10], ['mixed_seeds', 10]],
    steps: [
      'Sweet potato in 2 cm cubes, oil and salt, 200°C for 25 min.',
      'Salmon skin-side down in a hot pan 4 min, flip 2 min.',
      'Toss through spinach with lemon and the seeds.'
    ]
  },
  {
    id: 'burrito_bowl',
    name: 'Beef burrito bowl',
    slots: ['lunch', 'dinner'],
    mins: 20,
    batch: true,
    ing: [['beef_mince_lean', 150], ['black_beans_can', 120], ['rice_basmati', 70], ['salsa', 60], ['avocado', 50], ['corn_frozen', 60], ['spices', 5]],
    steps: [
      'Brown the mince hard, then add spices (cumin, paprika, oregano) and the drained beans.',
      'Rice, mince, corn, salsa, avocado. Squeeze of lime if you have one.'
    ]
  },
  {
    id: 'chicken_caesar',
    name: 'Lighter chicken caesar salad',
    slots: ['lunch'],
    mins: 15,
    ing: [['chicken_breast', 150], ['cos_lettuce', 120], ['parmesan', 15], ['bread_wholemeal', 30], ['mayo_light', 20], ['mustard', 5], ['olive_oil', 5]],
    steps: [
      'Cube and toast the bread in a pan with the oil for croutons.',
      'Grill the chicken and slice.',
      'Dressing: mayo, mustard, lemon, black pepper, a splash of water to loosen.'
    ]
  },
  {
    id: 'haloumi_salad_box',
    name: 'Haloumi, quinoa & roast veg box',
    slots: ['lunch'],
    mins: 25,
    ing: [['haloumi', 80], ['quinoa', 60], ['pumpkin', 150], ['capsicum', 80], ['spinach', 40], ['olive_oil', 10], ['balsamic', 10]],
    steps: [
      'Roast the pumpkin and capsicum at 200°C, 25 min.',
      'Quinoa in 2× water, 12 min.',
      'Dry-fry the haloumi until it squeaks and browns. Layer it all into a container.'
    ]
  },
  {
    id: 'egg_salad_sandwich',
    name: 'Egg & salad sandwich',
    slots: ['lunch'],
    mins: 12,
    ing: [['bread_wholemeal', 80], ['eggs', 150], ['mayo_light', 15], ['salad_leaves', 30], ['tomato', 60], ['cucumber', 40]],
    steps: ['Hard-boil the eggs 8 min, cool, mash with mayo, salt and pepper. Build the sandwich with the salad.']
  },

  {
    id: 'hummus_chickpea_wrap',
    name: 'Hummus, chickpea & salad wrap',
    slots: ['lunch'],
    mins: 7,
    ing: [['wrap', 60], ['hummus', 60], ['chickpeas_can', 150], ['salad_leaves', 40], ['tomato', 60], ['cucumber', 50], ['mixed_seeds', 10]],
    steps: ['Hummus across the wrap, chickpeas roughly crushed with a fork, salad and seeds, roll it tight.']
  },
  {
    id: 'quinoa_bean_salad',
    name: 'Quinoa, black bean & avocado salad',
    slots: ['lunch'],
    mins: 20,
    ing: [['quinoa', 70], ['black_beans_can', 150], ['avocado', 70], ['corn_frozen', 60], ['cherry_tomato', 80], ['lemon', 15], ['olive_oil', 10], ['spices', 3]],
    steps: [
      'Quinoa in double the water, 12 min, then cool it under the tap.',
      'Everything else folded through with lemon, oil, cumin and salt.',
      'Keeps three days — this is the plant-based meal prep box.'
    ]
  },

  {
    id: 'tofu_edamame_bowl',
    name: 'Tofu, edamame & rice bowl',
    slots: ['lunch', 'dinner'],
    mins: 20,
    ing: [['tofu_firm', 200], ['edamame', 150], ['rice_basmati', 70], ['carrot', 60], ['soy_sauce', 15], ['tahini', 15], ['olive_oil', 8], ['ginger', 6]],
    steps: [
      'Rice on. Edamame boiled 4 minutes, then podded.',
      'Tofu cubed and fried hard until golden on every side.',
      'Grated carrot raw over the top, tahini thinned with water and soy as the dressing.'
    ]
  },

  /* ------------------------------ dinner ----------------------------- */
  {
    id: 'spag_bol',
    name: 'Spaghetti bolognese',
    slots: ['dinner'],
    mins: 35,
    batch: true,
    ing: [['beef_mince_lean', 150], ['pasta', 90], ['passata', 200], ['onion', 60], ['carrot', 60], ['garlic', 8], ['olive_oil', 8], ['tomato_paste', 20], ['spices', 3]],
    steps: [
      'Soften diced onion, carrot and garlic in the oil.',
      'Brown the mince, stir in the paste, then the passata. Simmer 20 min.',
      'Pasta to the packet time. Combine, parmesan on top if you have it.'
    ]
  },
  {
    id: 'green_curry',
    name: 'Thai green chicken curry with rice',
    slots: ['dinner'],
    mins: 25,
    batch: true,
    ing: [['chicken_thigh', 180], ['curry_paste', 30], ['coconut_milk_light', 150], ['stirfry_veg', 150], ['rice_basmati', 70], ['ginger', 5]],
    steps: [
      'Fry the paste and ginger 1 min until it smells like a Thai restaurant.',
      'Add chicken, seal, then coconut milk. Simmer 12 min.',
      'Vegetables in for the last 4 min. Serve over rice.'
    ]
  },
  {
    id: 'beef_stirfry',
    name: 'Beef & veg stir-fry with noodles',
    slots: ['dinner'],
    mins: 20,
    ing: [['beef_strips', 160], ['stirfry_veg', 200], ['noodles_rice', 80], ['soy_sauce', 18], ['olive_oil', 8], ['garlic', 8], ['ginger', 6]],
    steps: [
      'Noodles soaking in boiled water.',
      'Screaming hot pan: beef in one layer, do not touch it for 60 seconds, then toss and remove.',
      'Garlic, ginger, vegetables, 3 min. Beef and noodles back in with the soy.'
    ]
  },
  {
    id: 'baked_barra',
    name: 'Baked barramundi, potato & greens',
    slots: ['dinner'],
    mins: 35,
    ing: [['barramundi', 180], ['potato', 250], ['green_beans', 120], ['olive_oil', 12], ['lemon', 15], ['garlic', 6]],
    steps: [
      'Potato in wedges, oil, salt, 200°C for 30 min.',
      'Fish on a tray with lemon and garlic for the last 12 min.',
      'Beans steamed 4 min.'
    ]
  },
  {
    id: 'chicken_traybake',
    name: 'Chicken & roast veg tray bake',
    slots: ['dinner'],
    mins: 40,
    batch: true,
    ing: [['chicken_thigh', 180], ['pumpkin', 180], ['capsicum', 100], ['zucchini', 100], ['red_onion_sub', 0], ['olive_oil', 12], ['spices', 5]],
    steps: [
      'Everything on one tray, oil, paprika, oregano, salt.',
      '200°C for 35 min, turning once.',
      'One tray, one wash-up. Make double and you have tomorrow\'s lunch.'
    ]
  },
  {
    id: 'lentil_dahl',
    name: 'Red lentil dahl with rice',
    slots: ['dinner'],
    mins: 30,
    batch: true,
    ing: [['lentils_dry', 90], ['coconut_milk_light', 100], ['tinned_tomatoes', 200], ['curry_paste', 20], ['spinach', 60], ['rice_basmati', 60], ['onion', 60], ['garlic', 8]],
    steps: [
      'Onion and garlic soft, add paste and spices, 1 min.',
      'Lentils, tomatoes and 400 ml water. Simmer 20 min until the lentils collapse.',
      'Coconut milk and spinach at the end. Rice alongside.'
    ]
  },
  {
    id: 'tofu_stirfry',
    name: 'Crispy tofu & vegetable stir-fry',
    slots: ['dinner'],
    mins: 22,
    ing: [['tofu_firm', 200], ['stirfry_veg', 200], ['rice_basmati', 70], ['soy_sauce', 18], ['olive_oil', 10], ['garlic', 8], ['sriracha', 10]],
    steps: [
      'Press the tofu 10 min, cube, toss in a little cornflour if you have it.',
      'Fry until every side is golden — patience here is the whole dish.',
      'Remove, cook the veg hard and fast, return tofu with soy and sriracha.'
    ]
  },
  {
    id: 'chilli_con_carne',
    name: 'Chilli con carne',
    slots: ['dinner'],
    mins: 35,
    batch: true,
    ing: [['beef_mince_lean', 150], ['kidney_beans_can', 120], ['tinned_tomatoes', 200], ['onion', 60], ['capsicum', 80], ['rice_basmati', 70], ['spices', 6], ['olive_oil', 8]],
    steps: [
      'Onion and capsicum soft, mince browned.',
      'Cumin, paprika, chilli, tomatoes and beans. Simmer 20 min.',
      'Over rice. Better on day two — make a double batch.'
    ]
  },
  {
    id: 'pork_mash',
    name: 'Pork loin, mash & salad',
    slots: ['dinner'],
    mins: 30,
    ing: [['pork_loin', 180], ['potato', 250], ['milk_skim', 40], ['salad_leaves', 60], ['olive_oil', 10], ['mustard', 8]],
    steps: [
      'Potatoes boiled 18 min, mashed with milk, salt and a little oil.',
      'Pork 4 min a side in a hot pan, rest 5 min — it should still be juicy.',
      'Salad with mustard vinaigrette.'
    ]
  },
  {
    id: 'prawn_pasta',
    name: 'Garlic prawn & zucchini pasta',
    slots: ['dinner'],
    mins: 20,
    ing: [['prawns', 180], ['pasta', 90], ['zucchini', 120], ['garlic', 12], ['olive_oil', 12], ['parmesan', 15], ['lemon', 15]],
    steps: [
      'Pasta on. Keep a mug of the cooking water.',
      'Garlic gently in oil, zucchini ribbons, then prawns 2 min until just pink.',
      'Toss with pasta, splash of pasta water, lemon and parmesan.'
    ]
  },
  {
    id: 'lamb_couscous',
    name: 'Lamb & couscous salad',
    slots: ['dinner'],
    mins: 25,
    ing: [['lamb_leg', 160], ['couscous', 70], ['cucumber', 80], ['cherry_tomato', 80], ['feta', 30], ['olive_oil', 10], ['lemon', 10], ['spices', 4]],
    steps: [
      'Couscous: equal volume boiling stock, cover 5 min, fluff.',
      'Lamb rubbed with cumin and salt, 3 min a side, rest and slice.',
      'Fold the salad through the couscous, feta over the top.'
    ]
  },
  {
    id: 'chicken_burrito_wraps',
    name: 'Chicken fajita wraps',
    slots: ['dinner'],
    mins: 25,
    ing: [['chicken_breast', 180], ['wrap', 120], ['capsicum', 120], ['onion', 80], ['salsa', 50], ['cheddar', 25], ['olive_oil', 8], ['spices', 5]],
    steps: [
      'Sliced chicken, capsicum and onion in a hot pan with the spices until charred at the edges.',
      'Warm the wraps 20 seconds in the pan.',
      'Fill, add salsa and a little cheese, roll.'
    ]
  },
  {
    id: 'tempeh_bowl',
    name: 'Tempeh, brown rice & greens bowl',
    slots: ['dinner', 'lunch'],
    mins: 25,
    ing: [['tempeh', 150], ['rice_brown', 70], ['broccoli', 120], ['carrot', 60], ['tahini', 20], ['soy_sauce', 15], ['olive_oil', 8]],
    steps: [
      'Brown rice on (25 min).',
      'Slice and pan-fry tempeh until dark and crisp, glaze with soy.',
      'Steam the greens. Tahini thinned with water and lemon as the sauce.'
    ]
  },

  {
    id: 'protein_pasta_bake',
    name: 'High-protein spinach & tomato pasta bake',
    slots: ['dinner'],
    mins: 35,
    batch: true,
    ing: [['pasta', 90], ['cottage_cheese', 200], ['passata', 200], ['spinach', 70], ['mushrooms', 80], ['parmesan', 20], ['garlic', 8], ['olive_oil', 8]],
    steps: [
      'Pasta to 2 minutes under the packet time.',
      'Mushrooms and garlic in the oil, then passata and the wilted spinach.',
      'Fold the cottage cheese through off the heat — it melts into a ricotta-like sauce and carries the protein.',
      'Into a dish, parmesan over, 15 min at 200°C until it browns.'
    ]
  },
  {
    id: 'shakshuka',
    name: 'Shakshuka with chickpeas & feta',
    slots: ['dinner', 'breakfast'],
    mins: 25,
    ing: [['eggs', 150], ['tinned_tomatoes', 200], ['chickpeas_can', 150], ['capsicum', 80], ['onion', 60], ['feta', 30], ['bread_sourdough', 60], ['olive_oil', 10], ['spices', 5]],
    steps: [
      'Onion and capsicum soft, cumin and paprika in for a minute.',
      'Tomatoes and chickpeas, simmer 10 min until thick.',
      'Make wells, crack the eggs in, lid on, 6 min until the whites set.',
      'Feta crumbled over, bread for mopping.'
    ]
  },
  {
    id: 'chickpea_curry',
    name: 'Coconut chickpea & spinach curry',
    slots: ['dinner'],
    mins: 25,
    batch: true,
    ing: [['chickpeas_can', 240], ['coconut_milk_light', 150], ['tinned_tomatoes', 200], ['spinach', 80], ['onion', 60], ['garlic', 10], ['ginger', 8], ['rice_basmati', 70], ['spices', 8], ['olive_oil', 10]],
    steps: [
      'Onion, garlic and ginger soft in the oil.',
      'Cumin, coriander, turmeric, garam masala — 1 minute until fragrant.',
      'Tomatoes and chickpeas, simmer 15 min, then coconut milk and spinach.',
      'Over rice. No curry paste needed, so it stays fully plant based.'
    ]
  },
  {
    id: 'haloumi_lentil_bowl',
    name: 'Haloumi, lentil & roast pumpkin bowl',
    slots: ['dinner', 'lunch'],
    mins: 30,
    ing: [['haloumi', 90], ['lentils_can', 200], ['quinoa', 60], ['pumpkin', 150], ['spinach', 50], ['olive_oil', 8], ['lemon', 12], ['spices', 4]],
    steps: [
      'Pumpkin roasted at 200°C for 25 min with cumin.',
      'Quinoa in double water, 12 min; lentils rinsed and warmed through.',
      'Haloumi dry-fried until it browns, sliced over the top with lemon.',
      'Naturally gluten free and one of the highest-protein meatless plates here.'
    ]
  },
  {
    id: 'peanut_noodles',
    name: 'Peanut tofu noodles',
    slots: ['dinner'],
    mins: 20,
    ing: [['tofu_firm', 200], ['noodles_rice', 80], ['stirfry_veg', 200], ['peanut_butter', 30], ['soy_sauce', 20], ['sriracha', 10], ['olive_oil', 8], ['garlic', 8]],
    steps: [
      'Sauce: peanut butter, soy, sriracha and 60 ml hot water whisked smooth.',
      'Fry the tofu until golden, remove; vegetables hard and fast.',
      'Noodles, tofu and sauce back in, toss for a minute.'
    ]
  },
  {
    id: 'veg_chilli',
    name: 'Two-bean vegetable chilli',
    slots: ['dinner'],
    mins: 30,
    batch: true,
    ing: [['kidney_beans_can', 200], ['black_beans_can', 150], ['tinned_tomatoes', 200], ['capsicum', 100], ['onion', 70], ['corn_frozen', 70], ['rice_basmati', 70], ['spices', 8], ['olive_oil', 10]],
    steps: [
      'Onion and capsicum soft, spices in, then beans, corn and tomatoes.',
      'Simmer 20 min until it thickens.',
      'Over rice, with avocado if you have one going spare.'
    ]
  },

  /* ------------------------------ snacks ----------------------------- */
  {
    id: 'snack_yoghurt_nuts',
    name: 'Greek yoghurt & almonds',
    slots: ['snack'],
    mins: 2,
    ing: [['greek_yoghurt', 170], ['almonds', 20]],
    steps: ['Tub of yoghurt, small handful of almonds.']
  },
  {
    id: 'snack_apple_pb',
    name: 'Apple with peanut butter',
    slots: ['snack'],
    mins: 2,
    ing: [['apple', 150], ['peanut_butter', 25]],
    steps: ['Slice the apple, dip.']
  },
  {
    id: 'snack_shake',
    name: 'Protein shake',
    slots: ['snack'],
    mins: 1,
    ing: [['whey_protein', 30], ['milk_skim', 300]],
    steps: ['Shaker, milk first, then powder. Shake.']
  },
  {
    id: 'snack_rice_cake_tuna',
    name: 'Rice cakes with tuna',
    slots: ['snack'],
    mins: 3,
    ing: [['rice_cakes', 27], ['tuna_can', 95], ['mayo_light', 10], ['cucumber', 40]],
    steps: ['Tuna mixed with mayo, spooned onto rice cakes, cucumber on top.']
  },
  {
    id: 'snack_hummus_veg',
    name: 'Hummus with carrot & cucumber',
    slots: ['snack'],
    mins: 3,
    ing: [['hummus', 60], ['carrot', 100], ['cucumber', 80]],
    steps: ['Cut the vegetables into sticks. Dip.']
  },
  {
    id: 'snack_protein_bar',
    name: 'Protein bar',
    slots: ['snack'],
    mins: 0,
    ing: [['protein_bar', 60]],
    steps: ['For the days that get away from you.']
  },
  {
    id: 'snack_boiled_eggs',
    name: 'Two boiled eggs',
    slots: ['snack'],
    mins: 10,
    ing: [['eggs', 100]],
    steps: ['8 minutes in boiling water, straight into cold water. Boil six on Sunday.']
  },
  {
    id: 'snack_banana_walnuts',
    name: 'Banana & walnuts',
    slots: ['snack'],
    mins: 1,
    ing: [['banana', 120], ['walnuts', 20]],
    steps: ['Exactly what it sounds like.']
  },
  {
    id: 'snack_cottage_rice_cakes',
    name: 'Cottage cheese on rice cakes',
    slots: ['snack'],
    mins: 3,
    ing: [['rice_cakes', 27], ['cottage_cheese', 100], ['cherry_tomato', 60]],
    steps: ['Spread, top with halved tomatoes, black pepper.']
  },
  {
    id: 'snack_plant_shake',
    name: 'Plant protein shake',
    slots: ['snack'],
    mins: 1,
    ing: [['pea_protein', 35], ['soy_milk', 350]],
    steps: ['Shaker, soy milk first, then powder.']
  },
  {
    id: 'snack_edamame',
    name: 'Salted edamame',
    slots: ['snack'],
    mins: 6,
    ing: [['edamame', 200]],
    steps: ['Boiled 4 minutes from frozen, drained, heavily salted. Pod them with your teeth.']
  },
  {
    id: 'snack_pb_rice_cakes',
    name: 'Peanut butter rice cakes',
    slots: ['snack'],
    mins: 2,
    ing: [['rice_cakes', 27], ['peanut_butter', 25], ['banana', 60]],
    steps: ['Spread, top with banana coins.']
  },
  {
    id: 'snack_dates_almonds',
    name: 'Dates & almonds',
    slots: ['snack'],
    mins: 1,
    ing: [['dates', 48], ['almonds', 20]],
    steps: ['Two dates, a small handful of almonds. Good 30 minutes before training.']
  },
  {
    id: 'snack_choc_berries',
    name: 'Dark chocolate & berries',
    slots: ['snack'],
    mins: 1,
    ing: [['dark_chocolate', 20], ['strawberries', 120]],
    steps: ['Two squares and a punnet. Planned treats stop unplanned ones.']
  }
];

/* Drop the placeholder ingredient rows that carry no weight. */
RECIPES.forEach((r) => { r.ing = r.ing.filter((x) => x[1] > 0 && FOOD_BY_ID[x[0]]); });

const RECIPE_BY_ID = RECIPES.reduce((m, r) => { m[r.id] = r; return m; }, {});

/* Nutrition for one serve of a recipe, optionally scaled. */
function recipeNutrition(recipe, scale) {
  const s = scale == null ? 1 : scale;
  const total = emptyNutrition();
  recipe.ing.forEach(([id, g]) => addNutrition(total, nutritionOf(id, g * s)));
  return total;
}

/* Everything a recipe `contains`, for diet filtering. */
function recipeContains(recipe) {
  const set = new Set();
  recipe.ing.forEach(([id]) => (FOOD_BY_ID[id].contains || []).forEach((c) => set.add(c)));
  return set;
}

function recipeAllowed(recipe, exclusions, dislikedIds) {
  const has = recipeContains(recipe);
  for (const x of exclusions) if (has.has(x)) return false;
  if (dislikedIds && dislikedIds.length) {
    for (const [id] of recipe.ing) if (dislikedIds.indexOf(id) !== -1) return false;
  }
  return true;
}
