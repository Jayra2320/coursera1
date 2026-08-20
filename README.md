# Fuel

A personal health dashboard that lives on your laptop. No install, no build step, no account, no server — open `index.html` in a browser and it runs.

It does three things:

1. **An assistant** that asks about you, calculates your BMI, body fat percentage, resting and total daily energy burn, and sets calorie and macro targets for your goal.
2. **A food log** that works out calories and macros from what you actually ate.
3. **A grocery list** generated from your meal plan, grouped the way Coles and Woolworths lay out a store.

Plus a weekly meal plan and a training split built around the same numbers, because the targets are useless on their own.

---

**Hosted copy:** <https://claude.ai/code/artifact/0d88eaf5-469d-4cb6-8da8-2c9ac1f7dd19> — private to you, opens on any device including your phone. It keeps its own saved data, separate from the local copy, and the conversational assistant is local-only (see below).

## Getting started

```
git clone <this repo>
cd coursera1
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows
```

Or just double-click `index.html`. That is the whole installation.

On the first run the assistant asks you a series of questions — sex, age, height, weight, optional tape measurements, activity level, goal, food restrictions, how many meals you like, how much time you'll spend cooking, and how you train. It then calculates everything and builds your first week.

**Bookmark it.** Your data is stored in that browser's `localStorage`, keyed to the file location, so keep the folder where it is and always open it from the same browser. Settings → *Export backup* writes a JSON file you should keep somewhere safe.

---

## The three features

### 1. The assistant

Works in two modes, and everything below is available in both.

**Guided mode** (the default, no internet needed). A scripted intake that asks one question at a time, then does the maths. Afterwards it understands a short list of commands: `setup`, `recalculate`, `meal plan`, `workout`, `groceries`, `help`.

**Claude mode** (optional). Put an Anthropic API key in Settings and the assistant becomes a real conversation running on Claude, with tools that change the app rather than just describe changes:

| Tool | What it does |
|---|---|
| `get_status` | Reads your profile, body composition, targets, today's log and current plans |
| `update_profile` | Changes profile fields and recalculates every target |
| `generate_meal_plan` | Builds a new plan against your targets |
| `list_recipes` / `swap_meal` | Finds a specific alternative and puts it in the plan |
| `log_food` | Logs food by name — "I had 200g of chicken and rice" |
| `generate_workout_plan` | Rebuilds your training week |
| `build_grocery_list` | Rebuilds the shop |

So "swap Thursday's dinner for something under 20 minutes" or "I had two eggs on toast" actually changes the app.

The key is stored in your browser's `localStorage` and sent only to `api.anthropic.com`. Anyone who can use your laptop profile can read it — on a shared machine, leave Claude mode off. Get a key at [console.anthropic.com](https://console.anthropic.com); the app defaults to Claude Opus 5, and you can switch to Sonnet or Haiku in Settings if you'd rather spend less.

### 2. The food log

Search across 113 Australian supermarket ingredients and every recipe in the app, enter grams (or serves), and it works out calories, protein, carbs, fat and fibre against your daily target. There's a quick-add for calories when you eat out, and a custom-food form for anything with a label the app doesn't know — enter it once and it's searchable forever.

*Australian labels show kilojoules. Divide by 4.184 to get calories.*

You can also log a whole planned day in one click and then edit whatever you actually ate differently.

### 3. The grocery list

Built from the meal plan: every ingredient across the days you select, summed, rounded up to the pack size the shops actually sell, and grouped by department in roughly the order you walk a store. Tick items off as you shop, switch between Coles and Woolworths own-brand naming, and set real prices — they stick and are used for future estimates.

Pantry staples (oil, spices, sauces, protein powder) are flagged "check the cupboard" and left out of the weekly total, since a $50 tub of protein powder is not a weekly cost. That figure appears separately.

**Prices are rough estimates, not live pricing.** The app does not connect to Coles or Woolworths. Tap any price to set what you actually pay.

---

## Where the numbers come from

| | |
|---|---|
| **BMI** | weight ÷ height², WHO categories |
| **Body fat** | US Navy circumference method if you give waist/neck (and hips); otherwise the Deurenberg BMI-based estimate. Your own DEXA/caliper/smart-scale figure overrides both |
| **Lean mass, FFMI** | derived from body fat, height-normalised |
| **Resting burn** | Katch-McArdle when lean mass is known (it's the better equation), otherwise Mifflin-St Jeor |
| **Daily burn** | resting burn × activity factor (1.2 sedentary → 1.9 extremely active) |
| **Deficit / surplus** | 7,700 kcal per kg, spread over the week, with a floor so a cut never drops below 1.05 × resting burn or 1,500 kcal (male) / 1,200 kcal (female) |
| **Protein** | 2.2–2.5 g per kg of *lean* mass when body fat is known, otherwise 1.8–2.0 g per kg bodyweight, biased up in a deficit |
| **Fat** | at least 0.8 g/kg and at least ~22% of calories |
| **Carbs** | whatever energy is left |
| **Food data** | typical values for Australian supermarket products, per 100 g raw/as purchased |

Get a tape measure. A waist and neck measurement moves the body fat estimate from "a guess based on your BMI" to something genuinely useful, and it changes which BMR equation the app can use.

### What this is not

These are population equations, not measurements of you. Two people with identical stats can have maintenance calories 300 kcal apart. Treat the first fortnight as an experiment: log honestly, weigh yourself a few mornings a week, and judge the **trend**, not any single day. If your weight isn't moving the way the app predicted after two or three weeks, the activity multiplier was wrong — adjust it and the rest follows.

The nutrition data is good enough for planning and tracking. The label on the pack in front of you is always more accurate.

**This is general fitness information, not medical advice.** If you have a diagnosed condition, take medication, are pregnant, or have any history of disordered eating, talk to your GP or an Accredited Practising Dietitian before changing how you eat. The calorie floor in this app is a blunt safety rail, not clinical supervision.

---

## Project layout

```
index.html          the shell — nav and the single view container
css/styles.css      one stylesheet, light and dark themes
js/util.js          helpers: dates, formatting, seeded RNG, markdown, SVG rings
js/foods.js         113 ingredients: nutrition per 100 g, pack sizes, aisles, allergens
js/recipes.js       56 recipes, each written for one serve
js/health.js        BMI, body fat, lean mass, FFMI, BMR, TDEE, macro targets
js/store.js         localStorage persistence, export/import
js/planner.js       meal plan generation and balancing
js/workouts.js      exercise library and split generation
js/grocery.js       plan → shopping list
js/assistant.js     guided intake, offline commands, Claude client and tools
js/views.js         every screen
js/app.js           routing, event delegation, boot
```

Plain scripts, no modules and no bundler — so it works over `file://` with nothing running. Files load in the order listed in `index.html`.

`node build.js` is optional and only for distribution. It inlines everything into `dist/fuel.html` (a complete standalone document you can email or carry on a USB stick) and `dist/fuel.artifact.html` (the same page as a fragment, for publishing as a hosted Artifact).

### The hosted copy differs in two ways

- **Claude mode does not run there.** A published page is not allowed to call outside services, so it cannot reach the Anthropic API. Guided mode, every calculation, the plan, the log, workouts and the shopping list all work normally. The Settings screen says so rather than offering a key field that could not work.
- **Exports go through the host.** A published page cannot start a download itself, so the app asks the viewer to confirm the save. Locally it just downloads.

### Adding your own foods and recipes

An ingredient in `js/foods.js`:

```js
{
  id: 'kangaroo_steak',
  name: 'Kangaroo steak',
  aisle: 'Meat & Seafood',
  per100: [98, 22, 0, 1, 0],           // kcal, protein, carbs, fat, fibre
  pack: { qty: 500, label: '500 g pack', price: 11.0 },
  contains: ['meat']                    // meat, pork, fish, shellfish, egg, dairy, gluten, nuts, soy
}
```

A recipe in `js/recipes.js`, always for **one serve** — the planner scales it:

```js
{
  id: 'roo_stirfry',
  name: 'Kangaroo & greens stir-fry',
  slots: ['dinner'],                    // breakfast | lunch | dinner | snack
  mins: 20,
  batch: true,                          // eligible to become tomorrow's lunch
  ing: [['kangaroo_steak', 180], ['stirfry_veg', 200], ['rice_basmati', 70]],
  steps: ['...']
}
```

Nutrition, allergen filtering, portion scaling and the shopping list all follow automatically. Diet restrictions come from the `contains` markers, so tag ingredients honestly and the vegan/gluten-free filters just work.

---

## Notes

- **Backups.** Clearing site data or "clear browsing history including cookies" wipes everything. Export occasionally.
- **Printing.** The meal plan, workouts and grocery list all print cleanly — navigation and buttons are hidden.
- **Second device.** Export on one, import on the other. There is no sync, deliberately.
- **Determinism.** Plans are generated from a seed, so *Regenerate* is a genuine re-roll rather than a shuffle.
