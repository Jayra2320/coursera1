/* app.js — routing, event wiring, boot. */

function render() {
  const view = Views[UI.view] ? UI.view : 'dashboard';
  $('#view').innerHTML = Views[view]();
  $$('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  const mount = Views[view + 'Mount'];
  if (mount) mount();
  const brandSub = $('#brandSub');
  if (brandSub && Store.state.profile.name) brandSub.textContent = Store.state.profile.name + ' · Newcastle';
}

function go(view) {
  UI.view = view;
  UI.openRecipe = null;
  window.location.hash = view;
  render();
  window.scrollTo({ top: 0 });
}

/* ---------------------------- theme ---------------------------- */

/* The viewer's own theme choice arrives as a data-theme stamp on <html> from
   whatever is hosting the page. Setting the app's theme explicitly overrides
   it; going back to "auto" hands control back — but only if the user asked
   for auto, so a host stamp survives an ordinary page load. */
function applyTheme(userChose) {
  const t = Store.state.settings.theme || 'auto';
  if (t === 'auto') {
    if (userChose) document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', t);
  }
}

/* ---------------------------- modal ---------------------------- */

function openModal(opts) {
  return new Promise((resolve) => {
    const dlg = $('#modal');
    const body = $('#modalBody');
    body.innerHTML = `
      <h2>${escapeHtml(opts.title)}</h2>
      ${opts.intro ? `<p class="muted">${escapeHtml(opts.intro)}</p>` : ''}
      ${opts.fields.map((f) => `<div class="field">
        <label>${escapeHtml(f.label)}</label>
        ${f.type === 'select'
          ? `<select name="${f.name}">${f.options.map((o) => `<option value="${escapeHtml(o.v)}">${escapeHtml(o.l)}</option>`).join('')}</select>`
          : `<input name="${f.name}" type="${f.type || 'text'}" value="${escapeHtml(f.value == null ? '' : f.value)}" ${f.step ? `step="${f.step}"` : ''} placeholder="${escapeHtml(f.placeholder || '')}">`}
        ${f.hint ? `<div class="hint">${escapeHtml(f.hint)}</div>` : ''}
      </div>`).join('')}
      <div class="modal-foot">
        <button class="ghost" value="cancel" type="submit">Cancel</button>
        <button value="ok" type="submit">${escapeHtml(opts.submitLabel || 'Save')}</button>
      </div>`;

    const onClose = () => {
      dlg.removeEventListener('close', onClose);
      if (dlg.returnValue !== 'ok') return resolve(null);
      const values = {};
      opts.fields.forEach((f) => {
        const el = body.querySelector(`[name="${f.name}"]`);
        values[f.name] = el ? el.value : '';
      });
      resolve(values);
    };
    dlg.addEventListener('close', onClose);
    dlg.showModal();
    const first = body.querySelector('input, select');
    if (first) setTimeout(() => first.focus(), 30);
  });
}

/* --------------------------- actions --------------------------- */

const multiSelection = new Set();

const Actions = {
  go(el) { go(el.dataset.view); },

  print() { window.print(); },

  'start-setup'() {
    multiSelection.clear();
    Assistant.startIntake();
    go('assistant');
  },

  recalculate() {
    Store.recomputeTargets();
    Store.mutate((s) => {
      s.chat.push({ role: 'assistant', mode: 'guided', content: [{ type: 'text', text: Assistant.summaryText() }] });
    });
    go('assistant');
  },

  'clear-chat'() {
    if (!confirm('Clear the conversation?')) return;
    Assistant.clearChat();
  },

  'intake-choice'(el) {
    const res = Assistant.answerIntake(el.dataset.value);
    if (!res.ok) toast(res.error);
    setTimeout(() => {
      const chat = $('#chat');
      if (chat) chat.scrollTop = chat.scrollHeight;
    }, 20);
  },

  'intake-multi'(el) {
    const v = el.dataset.value;
    if (multiSelection.has(v)) multiSelection.delete(v); else multiSelection.add(v);
    el.classList.toggle('on');
  },

  'intake-multi-done'() {
    const values = Array.from(multiSelection);
    multiSelection.clear();
    const res = Assistant.answerIntake(values.length ? values : 'skip');
    if (!res.ok) toast(res.error);
  },

  'regen-plan'() {
    const s = Store.state;
    if (!s.targets) { toast('I need your profile first.'); return go('assistant'); }
    Store.mutate((st) => {
      st.plan = generatePlan(st.profile, st.targets, { days: 7, startDate: todayISO(), seed: Date.now() });
      st.groceries.checked = {};
    });
    UI.planDay = 0;
    toast('New 7-day plan.');
    if (UI.view !== 'plan') go('plan');
  },

  'regen-workout'() {
    const s = Store.state;
    Store.mutate((st) => { st.workoutPlan = generateWorkoutPlan(st.profile, st.targets); });
    toast('Training week rebuilt.');
    if (UI.view !== 'workouts') go('workouts');
  },

  'plan-day'(el) {
    UI.planDay = Number(el.dataset.index);
    UI.openRecipe = null;
    if (UI.view !== 'plan') return go('plan');
    render();
  },

  'toggle-recipe'(el) {
    const key = el.dataset.day + ':' + el.dataset.key;
    UI.openRecipe = UI.openRecipe === key ? null : key;
    render();
  },

  'swap-meal'(el) {
    const s = Store.state;
    Store.mutate((st) => {
      swapMeal(st.plan, Number(el.dataset.day), el.dataset.key, st.profile, st.targets);
    });
    toast('Swapped.');
  },

  /* Shared name: in the log view these chips choose which meal you're adding to;
     in the plan/dashboard they log a planned meal. */
  'log-meal'(el) {
    if (el.dataset.meal) {
      UI.logMeal = el.dataset.meal;
      return render();
    }
    const s = Store.state;
    const day = s.plan && s.plan.days[Number(el.dataset.day)];
    const meal = day && day.meals.find((m) => m.key === el.dataset.key);
    if (!meal) return;
    const recipe = RECIPE_BY_ID[meal.recipeId];
    Store.addLogEntry(todayISO(), {
      kind: 'recipe', ref: meal.recipeId, amount: meal.scale, meal: meal.slot,
      label: `${recipe.name} × ${meal.scale} serve${meal.scale === 1 ? '' : 's'}`,
      nutrition: recipeNutrition(recipe, meal.scale)
    });
    toast(`Logged ${recipe.name}.`);
  },

  'log-todays-plan'() {
    const s = Store.state;
    const day = s.plan && s.plan.days.find((d) => d.date === UI.logDate);
    if (!day) return toast('No planned day matches this date.');
    Store.mutate((st) => {
      day.meals.forEach((m) => {
        const r = RECIPE_BY_ID[m.recipeId];
        if (!r) return;
        if (!st.log[UI.logDate]) st.log[UI.logDate] = [];
        st.log[UI.logDate].push({
          id: uid('log'), at: new Date().toISOString(),
          kind: 'recipe', ref: m.recipeId, amount: m.scale, meal: m.slot,
          label: `${r.name} × ${m.scale} serve${m.scale === 1 ? '' : 's'}`,
          nutrition: recipeNutrition(r, m.scale)
        });
      });
    });
    toast('Planned meals logged — edit anything you actually ate differently.');
  },

  'log-date'(el) {
    UI.logDate = addDays(UI.logDate, Number(el.dataset.delta));
    render();
  },

  'log-today'() { UI.logDate = todayISO(); render(); },

  'pick-food'(el) {
    const hit = UI.searchResults.find((r) => r.id === el.dataset.id && r.kind === el.dataset.kind);
    UI.selectedFood = hit || null;
    UI.searchResults = [];
    render();
  },

  'clear-pick'() { UI.selectedFood = null; render(); },

  'del-entry'(el) {
    Store.removeLogEntry(UI.logDate, el.dataset.id);
  },

  async 'quick-add'() {
    const v = await openModal({
      title: 'Quick add calories',
      intro: 'For meals out, or anything you cannot be bothered breaking down.',
      fields: [
        { name: 'label', label: 'What was it?', value: '', placeholder: 'Pub parma' },
        { name: 'kcal', label: 'Calories', type: 'number', value: 500, step: '10' }
      ],
      submitLabel: 'Add'
    });
    if (!v) return;
    const kcal = Number(v.kcal) || 0;
    Store.addLogEntry(UI.logDate, {
      kind: 'quick', ref: null, amount: kcal, meal: UI.logMeal,
      label: (v.label || 'Quick add') + ` — ${Math.round(kcal)} kcal`,
      nutrition: { kcal, p: 0, c: 0, fat: 0, fib: 0 }
    });
  },

  async 'custom-food'() {
    const v = await openModal({
      title: 'Create a custom food',
      intro: 'Copy the numbers straight off the pack — per 100 g, not per serve.',
      fields: [
        { name: 'name', label: 'Name', placeholder: 'Brand X protein bread' },
        { name: 'kcal', label: 'Energy (kcal per 100 g)', type: 'number', value: 250, step: '1', hint: 'Australian labels show kilojoules — divide by 4.184.' },
        { name: 'p', label: 'Protein (g per 100 g)', type: 'number', value: 10, step: '0.1' },
        { name: 'c', label: 'Carbs (g per 100 g)', type: 'number', value: 30, step: '0.1' },
        { name: 'f', label: 'Fat (g per 100 g)', type: 'number', value: 5, step: '0.1' },
        { name: 'fib', label: 'Fibre (g per 100 g)', type: 'number', value: 0, step: '0.1' }
      ],
      submitLabel: 'Create'
    });
    if (!v || !v.name.trim()) return;
    const id = Store.addCustomFood({
      name: v.name.trim(),
      per100: [Number(v.kcal) || 0, Number(v.p) || 0, Number(v.c) || 0, Number(v.f) || 0, Number(v.fib) || 0]
    });
    UI.selectedFood = { kind: 'ingredient', id, name: v.name.trim(), unit: 'g' };
    UI.search = '';
    UI.searchResults = [];
    toast('Custom food saved — it will show up in search from now on.');
  },

  tick(el) {
    Store.mutate((s) => {
      if (el.checked) s.groceries.checked[el.dataset.id] = true;
      else delete s.groceries.checked[el.dataset.id];
    }, { render: false });
    el.closest('.g-item').classList.toggle('done', el.checked);
  },

  'uncheck-all'() {
    Store.mutate((s) => { s.groceries.checked = {}; });
  },

  'grocery-store'(el) {
    Store.mutate((s) => { s.groceries.store = el.dataset.store; });
  },

  async 'edit-price'(el) {
    const id = el.dataset.id;
    const food = FOOD_BY_ID[id];
    if (!food) return;
    const s = Store.state;
    const current = s.groceries.prices[id] != null ? s.groceries.prices[id] : food.pack.price;
    const v = await openModal({
      title: food.name,
      intro: `Price for ${food.pack.label}. Set it once and it is used every time you rebuild the list.`,
      fields: [
        { name: 'price', label: 'Price (AUD)', type: 'number', value: current, step: '0.05' },
        { name: 'have', label: 'Already have it?', type: 'select', options: [{ v: 'no', l: 'No — put it on the list' }, { v: 'yes', l: 'Yes — skip it' }] }
      ],
      submitLabel: 'Save'
    });
    if (!v) return;
    Store.mutate((st) => {
      st.groceries.prices[id] = Number(v.price) || 0;
      const idx = st.groceries.pantry.indexOf(id);
      if (v.have === 'yes' && idx === -1) st.groceries.pantry.push(id);
      if (v.have === 'no' && idx !== -1) st.groceries.pantry.splice(idx, 1);
    });
  },

  'del-extra'(el) {
    Store.mutate((s) => { s.groceries.extra = s.groceries.extra.filter((e) => e.id !== el.dataset.id); });
  },

  'copy-list'() {
    const s = Store.state;
    const list = buildGroceryList(s.plan, { days: s.groceries.days, store: s.groceries.store, pantry: s.groceries.pantry, prices: s.groceries.prices, extra: s.groceries.extra });
    const text = groceryListText(list, s.profile.name ? s.profile.name + "'s plan" : '');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast('Copied to the clipboard.'), () => download('shopping-list.txt', text, 'text/plain'));
    } else {
      download('shopping-list.txt', text, 'text/plain');
    }
  },

  'toggle-diet'(el) {
    const d = el.dataset.diet;
    Store.mutate((s) => {
      const i = s.profile.diets.indexOf(d);
      if (i === -1) s.profile.diets.push(d); else s.profile.diets.splice(i, 1);
    });
  },

  'toggle-dislike'(el) {
    Store.mutate((s) => {
      s.profile.dislikes = s.profile.dislikes.filter((x) => x !== el.dataset.id);
    });
  },

  async export() {
    if (await download(`fuel-backup-${todayISO()}.json`, Store.exportJSON())) toast('Backup saved.');
  },

  import() { $('#importFile').click(); },

  async 'export-log'() {
    const rows = [['date', 'meal', 'item', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'fibre_g']];
    Object.keys(Store.state.log).sort().forEach((date) => {
      Store.state.log[date].forEach((e) => {
        rows.push([date, e.meal, e.label.replace(/"/g, "'"), Math.round(e.nutrition.kcal), round(e.nutrition.p, 1), round(e.nutrition.c, 1), round(e.nutrition.fat, 1), round(e.nutrition.fib, 1)]);
      });
    });
    const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? `"${c}"` : c)).join(',')).join('\n');
    if (await download(`fuel-log-${todayISO()}.csv`, csv, 'text/csv')) toast('Food log saved.');
  },

  reset() {
    if (!confirm('This erases your profile, log, plans and chat from this browser. Export a backup first if you might want it back. Continue?')) return;
    Store.reset();
    UI.view = 'dashboard';
    toast('Everything erased.');
  }
};

/* ---------------------- event delegation ---------------------- */

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  if (el.tagName === 'INPUT' || el.tagName === 'SELECT') return;   // handled on change
  const fn = Actions[el.dataset.action];
  if (!fn) return;
  e.preventDefault();
  fn(el);
});

document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  if (el.dataset.action === 'tick') return Actions.tick(el);
  if (el.dataset.action === 'grocery-days') {
    return Store.mutate((s) => { s.groceries.days = Number(el.value); });
  }
});

$('#nav').addEventListener('click', (e) => {
  const b = e.target.closest('.nav-item');
  if (b) go(b.dataset.view);
});

$('#themeToggle').addEventListener('click', () => {
  const order = ['auto', 'light', 'dark'];
  Store.mutate((s) => {
    s.settings.theme = order[(order.indexOf(s.settings.theme || 'auto') + 1) % 3];
  }, { render: false });
  applyTheme(true);
  toast('Theme: ' + Store.state.settings.theme);
});

window.addEventListener('hashchange', () => {
  const v = window.location.hash.replace('#', '');
  if (Views[v] && v !== UI.view) { UI.view = v; render(); }
});

/* ------------------------------ boot ------------------------------ */

Store.load();
Store.subscribe(() => render());
applyTheme();

const startView = window.location.hash.replace('#', '');
UI.view = Views[startView] ? startView : (Store.state.targets ? 'dashboard' : 'assistant');

/* Keep targets in step with the profile if the app was updated since last use. */
if (!Store.state.targets && !missingProfileFields(Store.state.profile).length) {
  Store.recomputeTargets();
}

render();

/* A gentle first-run nudge rather than a wall of onboarding. */
if (!Store.state.chat.length && !Store.state.targets) {
  Store.mutate((s) => {
    s.chat.push({
      role: 'assistant', mode: 'guided',
      content: [{ type: 'text', text: [
        "**Welcome.** I'm the coach for this dashboard — everything here runs on your laptop and stays there.",
        '',
        'Give me a few numbers and I will work out your BMI, body fat percentage, resting and total daily energy burn, and the calorie and macro targets that match your goal. Then I will build a week of meals around them, a training split you can actually keep to, and the Coles/Woolworths shop that goes with it.',
        '',
        'Say **setup** below, or hit *Guided setup*.'
      ].join('\n') }]
    });
  });
}
