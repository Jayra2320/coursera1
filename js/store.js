/* store.js — all persistence. Everything lives in this browser's localStorage
 * on this laptop; nothing is uploaded anywhere. Settings → Export writes a JSON
 * backup you can keep in Dropbox/iCloud or drop onto another machine. */

const STORAGE_KEY = 'fuel.state.v1';

/* Browser storage is not always there: private windows, blocked cookies and
   sandboxed frames can all make localStorage throw on access. The app stays
   fully usable in that case — it just cannot remember anything between
   reloads, and says so once rather than failing on every keystroke. */
const Storage = (function () {
  let backing = null;
  try {
    const probe = '__fuel_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    backing = window.localStorage;
  } catch (err) {
    backing = null;
  }

  const memory = {};
  return {
    available: !!backing,
    get(key) {
      try { return backing ? backing.getItem(key) : (key in memory ? memory[key] : null); }
      catch (err) { return null; }
    },
    set(key, value) {
      try {
        if (backing) backing.setItem(key, value); else memory[key] = value;
        return true;
      } catch (err) {
        memory[key] = value;
        return false;
      }
    },
    remove(key) {
      try { if (backing) backing.removeItem(key); } catch (err) { /* nothing to undo */ }
      delete memory[key];
    }
  };
})();

const DEFAULT_STATE = {
  version: 1,
  profile: {
    name: '',
    sex: '',
    age: null,
    heightCm: null,
    weightKg: null,
    neckCm: null,
    waistCm: null,
    hipCm: null,
    bodyFatPct: null,
    activity: '',
    goal: '',
    rateKgPerWeek: 0.5,
    diets: [],
    dislikes: [],
    mealsPerDay: 4,
    cookingTime: 'medium',      // quick | medium | any
    leftovers: true,
    workoutDays: 4,
    equipment: 'gym',           // gym | home | none
    experience: 'beginner',     // beginner | intermediate | advanced
    injuries: ''
  },
  targets: null,
  plan: null,
  workoutPlan: null,
  log: {},
  customFoods: [],
  weights: [],
  groceries: { checked: {}, extra: [], pantry: [], store: 'both', days: 7, prices: {} },
  chat: [],
  intake: { step: 0, active: false },
  settings: {
    theme: 'auto',
    apiKey: '',
    model: 'claude-opus-5',
    baseUrl: 'https://api.anthropic.com',
    thinking: true
  }
};

function deepMerge(base, override) {
  if (override === undefined || override === null) return base;
  if (Array.isArray(base) || typeof base !== 'object') return override;
  if (typeof override !== 'object' || Array.isArray(override)) return override;
  const out = Object.assign({}, base);
  Object.keys(override).forEach((k) => {
    out[k] = k in base ? deepMerge(base[k], override[k]) : override[k];
  });
  return out;
}

const Store = {
  state: null,
  listeners: [],

  load() {
    let saved = null;
    try {
      const raw = Storage.get(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch (err) {
      console.warn('Could not read saved data:', err);
      toast('Saved data could not be read — starting fresh.');
    }
    this.state = deepMerge(JSON.parse(JSON.stringify(DEFAULT_STATE)), saved || {});
    return this.state;
  },

  save() {
    const ok = Storage.set(STORAGE_KEY, JSON.stringify(this.state));
    const dot = $('#savedDot');
    if (dot) {
      if (!Storage.available) {
        dot.textContent = 'not saved';
        dot.title = 'This browser is blocking storage, so nothing is being kept between reloads. Export a backup before you close the tab.';
        return;
      }
      if (!ok) {
        dot.textContent = 'save failed';
        dot.title = 'Browser storage is full.';
        if (!this._warned) { this._warned = true; toast('Could not save — browser storage is full.'); }
        return;
      }
      dot.classList.add('flash');
      setTimeout(() => dot.classList.remove('flash'), 700);
    }
  },

  /* mutate(fn) applies a change, persists, and re-renders the current view. */
  mutate(fn, opts) {
    fn(this.state);
    this.save();
    if (!opts || opts.render !== false) this.listeners.forEach((l) => l(this.state));
  },

  subscribe(fn) { this.listeners.push(fn); },

  /* ------------------------- profile & targets ------------------------ */

  setProfile(patch) {
    this.mutate((s) => {
      Object.assign(s.profile, patch);
      const t = computeTargets(s.profile);
      if (t) s.targets = t;
    });
  },

  recomputeTargets() {
    this.mutate((s) => {
      const t = computeTargets(s.profile);
      if (t) s.targets = t;
    });
  },

  /* ------------------------------ log -------------------------------- */

  logEntries(date) {
    return this.state.log[date] || [];
  },

  addLogEntry(date, entry) {
    this.mutate((s) => {
      if (!s.log[date]) s.log[date] = [];
      s.log[date].push(Object.assign({ id: uid('log'), at: new Date().toISOString() }, entry));
    });
  },

  removeLogEntry(date, id) {
    this.mutate((s) => {
      s.log[date] = (s.log[date] || []).filter((e) => e.id !== id);
      if (!s.log[date].length) delete s.log[date];
    });
  },

  dayTotals(date) {
    const total = emptyNutrition();
    this.logEntries(date).forEach((e) => addNutrition(total, e.nutrition));
    return total;
  },

  /* --------------------------- body weight ---------------------------- */

  addWeight(date, kg, waistCm) {
    this.mutate((s) => {
      const existing = s.weights.find((w) => w.date === date);
      if (existing) {
        existing.kg = kg;
        if (waistCm) existing.waistCm = waistCm;
      } else {
        s.weights.push({ date, kg, waistCm: waistCm || null });
      }
      s.weights.sort((a, b) => a.date.localeCompare(b.date));
      s.profile.weightKg = kg;
      if (waistCm) s.profile.waistCm = waistCm;
      const t = computeTargets(s.profile);
      if (t) s.targets = t;
    });
  },

  /* --------------------------- custom foods --------------------------- */

  addCustomFood(food) {
    const id = 'custom_' + uid('f');
    this.mutate((s) => {
      s.customFoods.push(Object.assign({ id, aisle: 'Pantry', contains: [], custom: true }, food));
    });
    return id;
  },

  allFoods() {
    return INGREDIENTS.concat(this.state.customFoods);
  },

  foodById(id) {
    return FOOD_BY_ID[id] || this.state.customFoods.find((f) => f.id === id) || null;
  },

  /* ------------------------------ reset ------------------------------- */

  exportJSON() {
    return JSON.stringify(this.state, null, 2);
  },

  importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') throw new Error('Not a Fuel backup file.');
    this.mutate((s) => {
      const merged = deepMerge(JSON.parse(JSON.stringify(DEFAULT_STATE)), parsed);
      Object.keys(merged).forEach((k) => { s[k] = merged[k]; });
    });
  },

  reset() {
    Storage.remove(STORAGE_KEY);
    this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.save();
    this.listeners.forEach((l) => l(this.state));
  }
};

/* Nutrition of a log entry, whatever kind it is. */
function entryNutrition(kind, ref, amount) {
  if (kind === 'recipe') {
    const r = RECIPE_BY_ID[ref];
    return r ? recipeNutrition(r, amount) : emptyNutrition();
  }
  if (kind === 'quick') {
    return { kcal: amount, p: 0, c: 0, fat: 0, fib: 0 };
  }
  const food = Store.foodById(ref);
  if (!food) return emptyNutrition();
  const k = amount / 100;
  return {
    kcal: food.per100[0] * k,
    p: food.per100[1] * k,
    c: food.per100[2] * k,
    fat: food.per100[3] * k,
    fib: (food.per100[4] || 0) * k
  };
}
