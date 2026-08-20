/* grocery.js — turns the meal plan into a shop.
 *
 * Amounts are summed across the days you select, then rounded up to the pack
 * size Coles and Woolworths actually sell, and grouped by department so the
 * list follows the way you walk the store rather than the order the recipes
 * happened to need things. */

/* Things a kitchen buys once every month or two, not every week: oils, sauces,
   spices, a tub of protein powder. They still appear on the list — you might be
   out — but they are marked "check the cupboard" and left out of the weekly
   estimate, which would otherwise be wildly overstated by a $55 whey tub. */
const STAPLE_IDS = ['olive_oil', 'spray_oil', 'soy_sauce', 'spices', 'honey', 'mustard', 'balsamic', 'stock', 'garlic', 'sriracha', 'coffee', 'tomato_paste', 'whey_protein', 'tahini', 'peanut_butter', 'chia', 'curry_paste', 'mayo_light'];

const STORE_LABELS = { coles: 'Coles', woolworths: 'Woolworths', both: 'Coles / Woolworths' };

function ownBrandName(food, store) {
  if (!food.ownBrand || store === 'both') return null;
  return `${STORE_LABELS[store]} ${food.name.replace(/,.*$/, '')}`;
}

/* Sum every ingredient across the chosen days of the plan. */
function aggregateIngredients(plan, dayIndexes) {
  const totals = {};
  (dayIndexes || plan.days.map((_, i) => i)).forEach((i) => {
    const day = plan.days[i];
    if (!day) return;
    day.meals.forEach((meal) => {
      mealIngredients(meal).forEach(({ id, grams }) => {
        totals[id] = (totals[id] || 0) + grams;
      });
    });
  });
  return totals;
}

function buildGroceryList(plan, opts) {
  const options = Object.assign({ days: 7, store: 'both', pantry: [], prices: {}, extra: [] }, opts || {});
  const dayIndexes = plan ? plan.days.map((_, i) => i).slice(0, options.days) : [];
  const totals = plan ? aggregateIngredients(plan, dayIndexes) : {};

  const byAisle = {};
  let estimated = 0;

  Object.keys(totals).forEach((id) => {
    const food = FOOD_BY_ID[id];
    if (!food) return;
    const grams = totals[id];
    const haveIt = options.pantry.indexOf(id) !== -1;
    const pack = food.pack || { qty: grams, label: 'as needed', price: 0 };
    const staple = STAPLE_IDS.indexOf(id) !== -1;
    const packs = Math.max(1, Math.ceil(grams / pack.qty));
    const price = options.prices[id] != null ? Number(options.prices[id]) : pack.price;
    const cost = haveIt ? 0 : packs * price;
    if (!staple) estimated += cost;

    const unit = food.unit === 'ml' ? 'ml' : 'g';
    const item = {
      id,
      name: food.name,
      brand: ownBrandName(food, options.store),
      grams,
      unit,
      needLabel: food.eaG
        ? `${fmtQty(grams, unit)} (about ${Math.ceil(grams / food.eaG)})`
        : fmtQty(grams, unit),
      packs,
      packLabel: pack.label,
      price,
      cost,
      staple,
      have: haveIt
    };

    const aisle = item.staple ? 'Pantry' : food.aisle;
    (byAisle[aisle] = byAisle[aisle] || []).push(item);
  });

  const aisles = AISLES
    .filter((a) => byAisle[a] && byAisle[a].length)
    .map((a) => ({
      aisle: a,
      items: byAisle[a].sort((x, y) => (x.staple - y.staple) || x.name.localeCompare(y.name))
    }));

  const extras = (options.extra || []).map((e) =>
    Object.assign({ id: e.id, name: e.name, needLabel: e.qty || '', packs: 1, packLabel: '', cost: 0, extra: true }, {}));

  return {
    aisles,
    extras,
    days: dayIndexes.length,
    stapleCost: round(aisles.reduce((n, a) => n + a.items.filter((i) => i.staple && !i.have).reduce((m, i) => m + i.cost, 0), 0), 2),
    store: options.store,
    estimated: round(estimated, 2),
    itemCount: aisles.reduce((n, a) => n + a.items.length, 0) + extras.length
  };
}

/* Plain-text version for printing, or pasting into Notes / a shared list. */
function groceryListText(list, planLabel) {
  const lines = [];
  lines.push(`Shopping list — ${list.days} day${list.days === 1 ? '' : 's'}${planLabel ? ' · ' + planLabel : ''}`);
  lines.push(`${STORE_LABELS[list.store] || 'Coles / Woolworths'} · approx $${list.estimated.toFixed(2)}` +
    (list.stapleCost ? ` (plus about $${list.stapleCost.toFixed(2)} of pantry staples, if you are out)` : ''));
  lines.push('');
  list.aisles.forEach((a) => {
    lines.push(a.aisle.toUpperCase());
    a.items.forEach((i) => {
      const buy = i.packs > 1 ? `${i.packs} × ${i.packLabel}` : i.packLabel;
      lines.push(`  ${i.have ? '(have)' : '[ ]'} ${i.name} — need ${i.needLabel}${buy ? ` · buy ${buy}` : ''}`);
    });
    lines.push('');
  });
  if (list.extras.length) {
    lines.push('EXTRAS');
    list.extras.forEach((e) => lines.push(`  [ ] ${e.name}${e.needLabel ? ' — ' + e.needLabel : ''}`));
    lines.push('');
  }
  lines.push('Prices are rough estimates — edit them in the app to match what you actually pay.');
  return lines.join('\n');
}
