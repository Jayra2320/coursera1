/* planner.js — builds a week of meals that lands on your calorie and protein
 * targets, respects your diet, and doesn't feed you the same dinner twice in a
 * row. Deterministic given a seed, so "regenerate" is a real re-roll and a plan
 * can be reproduced exactly. */

const SLOT_SPLITS = {
  3: [['breakfast', 0.30], ['lunch', 0.35], ['dinner', 0.35]],
  4: [['breakfast', 0.25], ['lunch', 0.30], ['dinner', 0.33], ['snack', 0.12]],
  5: [['breakfast', 0.23], ['snack', 0.10], ['lunch', 0.27], ['dinner', 0.30], ['snack', 0.10]],
  6: [['breakfast', 0.21], ['snack', 0.09], ['lunch', 0.25], ['snack', 0.09], ['dinner', 0.27], ['snack', 0.09]]
};

const SLOT_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };

function slotSplit(mealsPerDay) {
  return SLOT_SPLITS[clamp(mealsPerDay || 4, 3, 6)] || SLOT_SPLITS[4];
}

function timeAllows(recipe, slot, cookingTime) {
  if (cookingTime === 'any') return true;
  if (cookingTime === 'quick') return recipe.mins <= (slot === 'dinner' ? 25 : 12);
  return recipe.mins <= (slot === 'dinner' ? 45 : 25);
}

/* Candidates for a slot, relaxing constraints in order of least harm:
   time limit first, then the slot itself, and only ever the dislikes as a last
   resort. The diet restrictions are never relaxed. */
function candidatesFor(slot, profile) {
  const excl = exclusionsFor(profile.diets);
  const dislikes = profile.dislikes || [];
  const inSlot = RECIPES.filter((r) => r.slots.indexOf(slot) !== -1);

  let pool = inSlot.filter((r) => recipeAllowed(r, excl, dislikes) && timeAllows(r, slot, profile.cookingTime));
  if (pool.length >= 2) return pool;

  pool = inSlot.filter((r) => recipeAllowed(r, excl, dislikes));
  if (pool.length) return pool;

  /* Nothing in this slot survives the diet — borrow from the whole library
     (a lunch bowl for breakfast beats an empty meal). */
  pool = RECIPES.filter((r) => recipeAllowed(r, excl, dislikes));
  if (pool.length) return pool;

  return RECIPES.filter((r) => recipeAllowed(r, excl, []));
}

/* How far a single recipe may be scaled up or down. Recipes are written around
   a ~500 kcal serve, so somebody eating 3,400 kcal across three meals needs to
   be allowed a genuinely bigger plate than somebody eating 1,600 across five. */
function portionLimits(profile, targets) {
  const mealCount = slotSplit(profile.mealsPerDay).length;
  const perMeal = targets.calories / mealCount;
  return {
    min: round(clamp(perMeal / 900, 0.25, 0.6), 2),
    max: round(clamp(perMeal / 380, 2.0, 3.2), 2)
  };
}

/* Scale a recipe toward a calorie target, within a sane portion range. */
function scaleFor(recipe, targetKcal, limits) {
  const base = recipeNutrition(recipe, 1).kcal;
  if (!base) return 1;
  const lo = limits ? limits.min + 0.1 : 0.6;
  const hi = limits ? limits.max : 1.75;
  return clamp(targetKcal / base, lo, hi);
}

function generatePlan(profile, targets, opts) {
  const options = Object.assign({ days: 7, startDate: todayISO(), seed: Date.now() }, opts || {});
  const rand = rng(options.seed);
  const split = slotSplit(profile.mealsPerDay);
  const recentBySlot = {};   // slot -> recipe ids used in the last few days
  const limits = portionLimits(profile, targets);
  const days = [];

  for (let d = 0; d < options.days; d++) {
    const date = addDays(options.startDate, d);
    const meals = [];
    const usedToday = [];
    const prevDinner = d > 0 ? days[d - 1].meals.find((m) => m.slot === 'dinner') : null;

    split.forEach(([slot, share], slotIndex) => {
      const targetKcal = targets.calories * share;

      /* Cook once, eat twice: yesterday's batch-friendly dinner becomes today's
         lunch, which is how most people actually eat during the week. */
      if (slot === 'lunch' && profile.leftovers && prevDinner && RECIPE_BY_ID[prevDinner.recipeId] &&
          RECIPE_BY_ID[prevDinner.recipeId].batch && d > 0) {
        const r = RECIPE_BY_ID[prevDinner.recipeId];
        meals.push({
          slot,
          recipeId: r.id,
          scale: round(scaleFor(r, targetKcal, limits), 2),
          leftover: true,
          key: slot + slotIndex
        });
        usedToday.push(r.id);
        return;
      }

      const pool = candidatesFor(slot, profile);
      if (!pool.length) return;   // nothing on earth fits — leave the slot out
      const recent = recentBySlot[slot] || [];
      /* Never the same dish twice in one day, and not the same one as the last
         few days in this slot. */
      const notToday = pool.filter((r) => usedToday.indexOf(r.id) === -1);
      const base = notToday.length ? notToday : pool;
      const fresh = base.filter((r) => recent.indexOf(r.id) === -1);
      const usable = fresh.length ? fresh : base;

      /* Prefer recipes whose protein density suits the goal — a cut wants the
         protein-dense end of the list, a bulk is happy anywhere. */
      /* How protein-dense the day has to be overall. A vegetarian cutting at
         2.5 g/kg needs nearly a third of their calories from protein, so the
         selection has to weight density far more heavily than for someone
         maintaining. */
      const requiredDensity = (targets.protein * 4) / targets.calories;
      const proteinWeight = clamp(requiredDensity * 9, 1.2, 4.5);
      const scored = usable.map((r) => {
        const n = recipeNutrition(r, 1);
        const density = n.kcal ? (n.p * 4) / n.kcal : 0;
        /* Penalise recipes that would need an odd portion to fit the slot — a
           600 kcal dinner at 0.4× is a sad plate, and 3× is a trough. */
        const fit = n.kcal ? Math.abs(Math.log(targetKcal / n.kcal)) : 3;
        return { r, score: density * proteinWeight - fit * 0.7 + rand() * 0.6 };
      }).sort((a, b) => b.score - a.score);

      const chosen = scored[Math.floor(rand() * Math.min(3, scored.length))].r;
      recentBySlot[slot] = [chosen.id].concat(recent).slice(0, slot === 'snack' ? 2 : 3);
      usedToday.push(chosen.id);

      meals.push({
        slot,
        recipeId: chosen.id,
        scale: round(scaleFor(chosen, targetKcal, limits), 2),
        leftover: false,
        key: slot + slotIndex
      });
    });

    days.push({ date, meals });
    balanceDay(days[d], targets, profile, limits);
  }

  const shortDays = days.filter((d) => dayTotals(d).p < targets.protein * 0.9).length;
  const warnings = [];
  if (shortDays) {
    warnings.push(`${shortDays} of ${days.length} days land more than 10% under your ${targets.protein} g protein target. ` +
      (exclusionsFor(profile.diets).size
        ? 'Your food restrictions make that target hard from whole foods alone — a daily protein powder, or a slightly lower protein goal, closes the gap.'
        : 'Add a protein shake or swap a snack for something denser.'));
  }

  return {
    seed: options.seed,
    createdAt: new Date().toISOString(),
    startDate: options.startDate,
    warnings,
    days,
    targetsSnapshot: { calories: targets.calories, protein: targets.protein, carbs: targets.carbs, fat: targets.fat }
  };
}

/* Bring a day onto target. Calories are the easy part — snacks absorb the gap.
   Protein is the one that actually needs work: shifting portions from the
   least protein-dense meal to the most keeps calories flat while lifting
   protein, and if that is not enough the weakest meal gets replaced outright. */
function balanceDay(day, targets, profile, limits) {
  const lim = limits || (profile ? portionLimits(profile, targets) : { min: 0.5, max: 2.0 });
  const byDensity = () => day.meals
    .map((m) => {
      const r = RECIPE_BY_ID[m.recipeId];
      if (!r) return null;
      const n = recipeNutrition(r, 1);
      return { m, r, density: n.kcal ? n.p / n.kcal : 0 };
    })
    .filter(Boolean)
    .sort((a, b) => b.density - a.density);

  /* Snacks absorb a small gap on their own; anything bigger is closed by
     scaling the whole day proportionally, which converges even when individual
     portions are pinned at their limits. */
  const fixCalories = () => {
    for (let pass = 0; pass < 8; pass++) {
      const t = dayTotals(day);
      if (!t.kcal) return;
      const gap = targets.calories - t.kcal;
      if (Math.abs(gap) < targets.calories * 0.02) return;

      const snacks = day.meals.filter((m) => m.slot === 'snack');
      const smallGap = Math.abs(gap) < targets.calories * 0.15;

      if (smallGap && snacks.length) {
        const perMeal = gap / snacks.length;
        let moved = false;
        snacks.forEach((m) => {
          const r = RECIPE_BY_ID[m.recipeId];
          const base = r ? recipeNutrition(r, 1).kcal : 0;
          if (!base) return;
          const next = round(clamp(m.scale + perMeal / base, lim.min, lim.max), 2);
          if (next !== m.scale) { m.scale = next; moved = true; }
        });
        if (moved) continue;   // snacks did the work; re-measure
      }

      const factor = targets.calories / t.kcal;
      let changed = false;
      day.meals.forEach((m) => {
        const next = round(clamp(m.scale * factor, lim.min, lim.max), 2);
        if (next !== m.scale) { m.scale = next; changed = true; }
      });
      if (!changed) return;    // everything is pinned — this is as close as it gets
    }
  };

  const shiftTowardProtein = () => {
    const ranked = byDensity();
    if (ranked.length < 2) return;
    const top = ranked[0];
    const bottom = ranked[ranked.length - 1];
    if (top.m === bottom.m) return;
    top.m.scale = round(clamp(top.m.scale * 1.18, lim.min, lim.max), 2);
    bottom.m.scale = round(clamp(bottom.m.scale * 0.85, lim.min, lim.max), 2);
  };

  fixCalories();
  for (let pass = 0; pass < 4; pass++) {
    if (dayTotals(day).p >= targets.protein * 0.95) break;
    shiftTowardProtein();
    fixCalories();
  }

  /* Still short after redistributing portions — the meals themselves are the
     problem. Replace the weakest ones, worst first, with the densest option
     their slot allows, until the target is met or nothing better exists. */
  if (profile) {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (dayTotals(day).p >= targets.protein * 0.93) break;

      const ranked = byDensity();
      let swapped = false;

      for (let i = ranked.length - 1; i >= 0 && !swapped; i--) {
        const weakest = ranked[i];
        const alreadyToday = day.meals.map((m) => m.recipeId);
        const best = candidatesFor(weakest.m.slot, profile)
          .filter((r) => alreadyToday.indexOf(r.id) === -1)
          .map((r) => {
            const n = recipeNutrition(r, 1);
            return { r, density: n.kcal ? n.p / n.kcal : 0 };
          })
          .sort((a, b) => b.density - a.density)[0];

        if (best && best.density > weakest.density * 1.05) {
          const share = recipeNutrition(weakest.r, weakest.m.scale).kcal;
          weakest.m.recipeId = best.r.id;
          weakest.m.scale = round(scaleFor(best.r, share, lim), 2);
          weakest.m.leftover = false;
          swapped = true;
          fixCalories();
        }
      }

      if (!swapped) break;
      for (let pass = 0; pass < 2; pass++) { shiftTowardProtein(); fixCalories(); }
    }
  }

  day.totals = dayTotals(day);
  return day;
}

function dayTotals(day) {
  const total = emptyNutrition();
  day.meals.forEach((m) => {
    const r = RECIPE_BY_ID[m.recipeId];
    if (r) addNutrition(total, recipeNutrition(r, m.scale));
  });
  return total;
}

function planTotals(plan) {
  const total = emptyNutrition();
  plan.days.forEach((d) => addNutrition(total, dayTotals(d)));
  return total;
}

/* Swap one meal for a different option in the same slot. */
function swapMeal(plan, dayIndex, mealKey, profile, targets) {
  const day = plan.days[dayIndex];
  const meal = day.meals.find((m) => m.key === mealKey);
  if (!meal) return plan;

  const pool = candidatesFor(meal.slot, profile).filter((r) => r.id !== meal.recipeId);
  if (!pool.length) return plan;

  const rand = rng(Date.now() + dayIndex + mealKey);
  const chosen = pool[Math.floor(rand() * pool.length)];
  const share = (slotSplit(profile.mealsPerDay).find(([s]) => s === meal.slot) || [null, 0.25])[1];
  const limits = portionLimits(profile, targets);

  meal.recipeId = chosen.id;
  meal.scale = round(scaleFor(chosen, targets.calories * share, limits), 2);
  meal.leftover = false;
  balanceDay(day, targets, profile);
  return plan;
}

/* Set a specific recipe into a slot (used by the assistant's swap tool). */
function setMeal(plan, dayIndex, mealKey, recipeId, profile, targets) {
  const day = plan.days[dayIndex];
  const meal = day && day.meals.find((m) => m.key === mealKey);
  const recipe = RECIPE_BY_ID[recipeId];
  if (!meal || !recipe) return false;
  const share = (slotSplit(profile.mealsPerDay).find(([s]) => s === meal.slot) || [null, 0.25])[1];
  const limits = portionLimits(profile, targets);
  meal.recipeId = recipeId;
  meal.scale = round(scaleFor(recipe, targets.calories * share, limits), 2);
  meal.leftover = false;
  balanceDay(day, targets, profile);
  return true;
}

/* Ingredients for one meal at its planned scale, in grams. */
function mealIngredients(meal) {
  const r = RECIPE_BY_ID[meal.recipeId];
  if (!r) return [];
  return r.ing.map(([id, g]) => ({ id, grams: g * meal.scale }));
}
