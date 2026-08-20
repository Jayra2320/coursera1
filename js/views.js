/* views.js — every screen. Each view returns an HTML string; a matching
 * `*Mount` function wires up anything that needs more than delegated clicks. */

const UI = {
  view: 'dashboard',
  planDay: 0,
  logDate: todayISO(),
  search: '',
  searchResults: [],
  selectedFood: null,
  logMeal: 'breakfast',
  openRecipe: null,
  busy: false
};

const Views = {};

/* ------------------------------------------------------------------ */
/* shared fragments                                                     */
/* ------------------------------------------------------------------ */

function macroBars(totals, targets) {
  if (!targets) return '';
  const row = (label, value, target, cls) => {
    const pct = target ? value / target : 0;
    return `<div style="flex:1">
      <div class="row spread"><small class="muted">${label}</small><small class="mono">${Math.round(value)}/${target}g</small></div>
      <div class="bar ${cls}${pct > 1.08 ? ' over' : ''}"><i style="width:${Math.min(100, pct * 100)}%"></i></div>
    </div>`;
  };
  return `<div class="row wrap" style="gap:14px;margin-top:10px">
    ${row('Protein', totals.p, targets.protein, 'p')}
    ${row('Carbs', totals.c, targets.carbs, 'c')}
    ${row('Fat', totals.fat, targets.fat, 'f')}
  </div>`;
}

function needsSetupCard(message) {
  return `<div class="card">
    <div class="empty">
      <h2>Let's get your numbers first</h2>
      <p class="muted" style="max-width:44ch;margin:8px auto 16px">${escapeHtml(message || 'The assistant will ask about your height, weight, activity and goal, then calculate everything else.')}</p>
      <button data-action="start-setup">Start guided setup</button>
    </div>
  </div>`;
}

function mealCard(meal, dayIndex, opts) {
  const r = RECIPE_BY_ID[meal.recipeId];
  if (!r) return '';
  const n = recipeNutrition(r, meal.scale);
  const open = UI.openRecipe === dayIndex + ':' + meal.key;
  return `<div class="meal">
    <div class="meal-slot">${SLOT_LABEL[meal.slot]}</div>
    <div class="meal-body">
      <h3>${escapeHtml(r.name)}
        ${meal.leftover ? '<span class="tag">leftovers</span>' : ''}
        ${meal.scale !== 1 ? `<span class="tag">${meal.scale}× serve</span>` : ''}
      </h3>
      <div class="meal-macros">${fmtKcal(n.kcal)} kcal · P ${fmtG(n.p)} · C ${fmtG(n.c)} · F ${fmtG(n.fat)} · ${r.mins} min</div>
      ${open ? recipeDetail(r, meal.scale) : ''}
    </div>
    ${opts && opts.readonly ? '' : `<div class="meal-actions">
      <button class="ghost tiny" data-action="toggle-recipe" data-day="${dayIndex}" data-key="${meal.key}">${open ? 'Hide' : 'Recipe'}</button>
      <button class="ghost tiny" data-action="swap-meal" data-day="${dayIndex}" data-key="${meal.key}">Swap</button>
      <button class="ghost tiny" data-action="log-meal" data-day="${dayIndex}" data-key="${meal.key}">Log it</button>
    </div>`}
  </div>`;
}

function recipeDetail(recipe, scale) {
  const ing = recipe.ing.map(([id, g]) => {
    const f = FOOD_BY_ID[id];
    const grams = g * scale;
    const each = f.eaG ? ` (${round(grams / f.eaG, 1)} ×)` : '';
    return `<li>${fmtQty(grams, f.unit)}${each} ${escapeHtml(f.name.toLowerCase())}</li>`;
  }).join('');
  return `<div class="recipe-detail" style="margin-top:10px">
    <strong style="font-size:13px">Ingredients (for this portion)</strong>
    <ul>${ing}</ul>
    <strong style="font-size:13px;display:block;margin-top:8px">Method</strong>
    <ol style="margin:6px 0 0;padding-left:18px">${recipe.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* dashboard                                                            */
/* ------------------------------------------------------------------ */

Views.dashboard = function () {
  const s = Store.state;
  const t = s.targets;
  const p = s.profile;

  if (!t) {
    return `<div class="page-head"><div><h1>Dashboard</h1><p>Nothing here yet.</p></div></div>` + needsSetupCard();
  }

  const snap = bodySnapshot(p);
  const today = todayISO();
  const totals = Store.dayTotals(today);
  const pct = totals.kcal / t.calories;
  const remaining = t.calories - totals.kcal;

  const todayPlan = s.plan && s.plan.days.find((d) => d.date === today);
  const week = s.workoutPlan ? weeklySchedule(s.workoutPlan) : null;
  const todaySession = week ? week[new Date().getDay()].session : null;

  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    last7.push({ date: d, kcal: Store.dayTotals(d).kcal });
  }
  const peak = Math.max(t.calories * 1.1, ...last7.map((d) => d.kcal), 1);

  return `
  <div class="page-head">
    <div>
      <h1>${p.name ? escapeHtml(p.name) + "'s dashboard" : 'Dashboard'}</h1>
      <p>${prettyDate(today)} · ${GOALS.find((g) => g.id === t.goal).label.toLowerCase()} at ${t.calories} kcal a day</p>
    </div>
    <div class="head-actions">
      <button class="secondary" data-action="go" data-view="log">Log food</button>
      <button data-action="go" data-view="assistant">Ask the assistant</button>
    </div>
  </div>

  <div class="grid cols-2">
    <div class="card">
      <div class="card-head"><h2>Today</h2>
        <small class="${remaining < 0 ? 'tag warn' : 'muted'}">${remaining >= 0 ? fmtKcal(remaining) + ' kcal left' : fmtKcal(-remaining) + ' kcal over'}</small>
      </div>
      <div class="ring-wrap">
        ${ringSvg(pct, fmtKcal(totals.kcal), 'of ' + fmtKcal(t.calories))}
        <div style="flex:1">
          ${macroBars(totals, t)}
          <div class="row spread" style="margin-top:12px">
            <small class="dim">Fibre ${Math.round(totals.fib)}/${t.fibre} g</small>
            <button class="link" data-action="go" data-view="log">Open log →</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h2>Body</h2><small class="muted">${escapeHtml(snap.bodyFatMethod || t.bmrMethod)}</small></div>
      <div class="grid cols-2" style="gap:10px">
        <div>
          <div class="k dim" style="font-size:11.5px;text-transform:uppercase;letter-spacing:.04em">BMI</div>
          <div style="font-size:24px;font-weight:650">${snap.bmi ?? '—'}</div>
          <span class="tag ${snap.bmiCategory.tone}">${snap.bmiCategory.label}</span>
        </div>
        <div>
          <div class="k dim" style="font-size:11.5px;text-transform:uppercase;letter-spacing:.04em">Body fat</div>
          <div style="font-size:24px;font-weight:650">${snap.bodyFatPct != null ? snap.bodyFatPct + '%' : '—'}</div>
          ${snap.bodyFatCategory ? `<span class="tag ${snap.bodyFatCategory.tone}">${snap.bodyFatCategory.label}</span>` : '<span class="dim" style="font-size:12px">add a tape measurement</span>'}
        </div>
      </div>
      <div class="divider"></div>
      <div class="row spread"><small class="muted">Weight</small><strong>${p.weightKg} kg</strong></div>
      ${snap.leanMassKg != null ? `<div class="row spread"><small class="muted">Lean / fat mass</small><span class="mono">${snap.leanMassKg} / ${snap.fatMassKg} kg</span></div>` : ''}
      ${snap.ffmi != null ? `<div class="row spread"><small class="muted">FFMI</small><span class="mono">${snap.ffmi}</span></div>` : ''}
      <div class="row spread"><small class="muted">Maintenance</small><span class="mono">${t.tdee} kcal</span></div>
      <div class="divider"></div>
      <form class="row" data-form="weight">
        <input type="number" step="0.1" name="kg" placeholder="Today's weight (kg)" style="flex:1">
        <button class="secondary small" type="submit">Save</button>
      </form>
    </div>
  </div>

  <div class="grid cols-2" style="margin-top:14px">
    <div class="card">
      <div class="card-head"><h2>Today's meals</h2><button class="link" data-action="go" data-view="plan">Full plan →</button></div>
      ${todayPlan
        ? todayPlan.meals.map((m) => mealCard(m, s.plan.days.indexOf(todayPlan))).join('')
        : `<div class="empty"><p>No plan covers today.</p><button class="secondary small" data-action="regen-plan">Generate a 7-day plan</button></div>`}
    </div>

    <div class="stack">
      <div class="card">
        <div class="card-head"><h2>Training today</h2><button class="link" data-action="go" data-view="workouts">Week →</button></div>
        ${todaySession
          ? `<h3>${escapeHtml(todaySession.name)}</h3>
             ${todaySession.exercises.map((e) => `<div class="ex-row"><span class="ex-name">${escapeHtml(e.name)}</span><span class="ex-dose">${e.sets}×${e.reps}</span></div>`).join('')}`
          : s.workoutPlan
            ? `<p class="muted">Rest day. ${escapeHtml(s.workoutPlan.cardio.steps)}.</p>`
            : `<div class="empty"><p>No training plan yet.</p><button class="secondary small" data-action="regen-workout">Build one</button></div>`}
      </div>

      <div class="card">
        <div class="card-head"><h2>Last 7 days</h2><small class="muted">target ${fmtKcal(t.calories)}</small></div>
        <div class="week-bars">
          ${last7.map((d) => `<div class="col ${d.kcal > t.calories * 1.08 ? 'over' : ''}">
            <i style="height:${Math.max(2, (d.kcal / peak) * 100)}%"></i>
            <span>${dayName(d.date).slice(0, 2)}</span>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
};

Views.dashboardMount = function () {
  const form = $('[data-form="weight"]');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const kg = Number(form.kg.value);
      if (!kg) return;
      Store.addWeight(todayISO(), kg);
      toast('Weight saved — targets updated.');
    });
  }
};

/* ------------------------------------------------------------------ */
/* assistant                                                            */
/* ------------------------------------------------------------------ */

Views.assistant = function () {
  const s = Store.state;
  const claude = Assistant.hasKey();
  const step = Assistant.currentStep();

  const messages = s.chat.filter((m) => !m.hidden).map((m) => {
    const text = (m.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    const thinking = (m.content || []).filter((b) => b.type === 'thinking').map((b) => b.thinking).join('\n').trim();
    const tools = (m.content || []).filter((b) => b.type === 'tool_use').map((b) => b.name);
    if (!text && !tools.length && !thinking) return '';
    return `<div class="msg ${m.role}">
      <div class="who">${m.role === 'user' ? 'you' : '✦'}</div>
      <div class="bubble">
        ${thinking ? `<details class="thinking-note"><summary style="cursor:pointer">Reasoning</summary>${escapeHtml(thinking)}</details>` : ''}
        ${tools.length ? `<div class="dim" style="font-size:12.5px;margin-bottom:6px">⚙ ${tools.map((t) => escapeHtml(t.replace(/_/g, ' '))).join(', ')}</div>` : ''}
        ${text ? mdToHtml(text) : ''}
      </div>
    </div>`;
  }).join('');

  let composer;
  if (step && step.type === 'choice') {
    composer = `<div class="quick-replies">
      ${step.options.map((o) => `<button class="chip" data-action="intake-choice" data-value="${escapeHtml(o.v)}">${escapeHtml(o.l)}</button>`).join('')}
      ${step.optional ? '<button class="chip" data-action="intake-choice" data-value="skip">Skip</button>' : ''}
    </div>`;
  } else if (step && step.type === 'multi') {
    composer = `<div class="quick-replies" id="multiWrap">
      ${step.options.map((o) => `<button class="chip" data-action="intake-multi" data-value="${escapeHtml(o.v)}">${escapeHtml(o.l)}</button>`).join('')}
    </div>
    <div class="row" style="margin-top:10px"><button class="small" data-action="intake-multi-done">Continue</button></div>`;
  } else {
    composer = `<form class="composer" data-form="chat">
      <textarea name="text" rows="1" placeholder="${step ? escapeHtml('Your answer' + (step.optional ? ' (or type skip)' : '')) : claude ? 'Ask anything — “swap Thursday dinner for something quicker”, “I had two eggs and toast”, “am I eating enough protein?”' : 'Try: setup, meal plan, workout, groceries, help'}"></textarea>
      <button type="submit" id="sendBtn">Send</button>
    </form>`;
  }

  return `
  <div class="page-head">
    <div>
      <h1>Assistant</h1>
      <p>${claude
        ? 'Running on Claude with access to your profile, plan and log — it can make changes for you, not just describe them.'
        : 'Guided mode: works offline, no API key. Add a key in Settings for full conversation.'}</p>
    </div>
    <div class="head-actions">
      ${s.targets ? '<button class="ghost small" data-action="recalculate">Recalculate</button>' : ''}
      <button class="ghost small" data-action="start-setup">${s.targets ? 'Redo setup' : 'Guided setup'}</button>
      ${s.chat.length ? '<button class="ghost small" data-action="clear-chat">Clear</button>' : ''}
    </div>
  </div>

  <div class="card">
    <div class="chat" id="chat">
      ${messages || `<div class="empty">
        <h2 style="margin-bottom:6px">${claude ? 'Ask me anything' : 'Say “setup” to begin'}</h2>
        <p class="muted" style="max-width:46ch;margin:0 auto">I'll work out your BMI, body fat, resting and total daily burn, then build meals, training and a Coles/Woolies shop around them.</p>
      </div>`}
      <div id="streamTarget"></div>
    </div>
    ${composer}
  </div>

  ${!claude ? `<div class="callout" style="margin-top:14px">Guided mode understands: <strong>setup</strong>, <strong>recalculate</strong>, <strong>meal plan</strong>, <strong>workout</strong>, <strong>groceries</strong>, <strong>help</strong>.</div>` : ''}`;
};

Views.assistantMount = function () {
  const chat = $('#chat');
  if (chat) chat.scrollTop = chat.scrollHeight;

  const form = $('[data-form="chat"]');
  if (!form) return;

  const ta = form.text;
  ta.addEventListener('input', () => {
    ta.style.height = 'auto';
    ta.style.height = Math.min(160, ta.scrollHeight) + 'px';
  });
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
  });
  setTimeout(() => ta.focus(), 30);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = ta.value.trim();
    if (!text || UI.busy) return;
    ta.value = '';
    ta.style.height = 'auto';
    await handleChatInput(text);
  });
};

async function handleChatInput(text) {
  const step = Assistant.currentStep();

  if (step) {
    const res = Assistant.answerIntake(text);
    if (!res.ok) toast(res.error);
    return;
  }

  if (!Assistant.hasKey()) {
    Store.mutate((s) => { s.chat.push({ role: 'user', content: [{ type: 'text', text }] }); }, { render: false });
    const reply = Assistant.offlineReply(text);
    if (reply) {
      Store.mutate((s) => { s.chat.push({ role: 'assistant', mode: 'guided', content: [{ type: 'text', text: reply }] }); });
    } else {
      render();
    }
    return;
  }

  /* Claude mode — stream into a live bubble. */
  UI.busy = true;
  const target = $('#streamTarget');
  const bubble = document.createElement('div');
  bubble.className = 'msg assistant';
  bubble.innerHTML = `<div class="who">✦</div><div class="bubble"><div class="dim" id="liveStatus"><span class="spinner"></span> thinking…</div><div id="liveText"></div></div>`;
  target.appendChild(bubble);
  const chatEl = $('#chat');
  chatEl.scrollTop = chatEl.scrollHeight;

  let acc = '';
  const status = $('#liveStatus', bubble);
  const live = $('#liveText', bubble);

  try {
    await Assistant.send(text, {
      onText(delta) {
        acc += delta;
        status.style.display = 'none';
        live.innerHTML = mdToHtml(acc);
        chatEl.scrollTop = chatEl.scrollHeight;
      },
      onThinking() {
        status.innerHTML = '<span class="spinner"></span> reasoning…';
      },
      onTool(name) {
        status.style.display = '';
        status.innerHTML = `<span class="spinner"></span> ${escapeHtml(name.replace(/_/g, ' '))}…`;
        acc = '';
        live.innerHTML = '';
      }
    });
  } catch (err) {
    console.error(err);
    Store.mutate((s) => {
      s.chat.push({ role: 'assistant', mode: 'claude', content: [{ type: 'text', text: '⚠️ ' + (err.message || 'Something went wrong talking to the API.') }] });
    }, { render: false });
  } finally {
    UI.busy = false;
    render();
  }
}

/* ------------------------------------------------------------------ */
/* meal plan                                                            */
/* ------------------------------------------------------------------ */

Views.plan = function () {
  const s = Store.state;
  if (!s.targets) return `<div class="page-head"><div><h1>Meal plan</h1></div></div>` + needsSetupCard();
  if (!s.plan) {
    return `<div class="page-head"><div><h1>Meal plan</h1><p>Built to hit ${s.targets.calories} kcal and ${s.targets.protein} g protein a day.</p></div></div>
      <div class="card"><div class="empty"><p>No plan yet.</p><button data-action="regen-plan">Generate 7 days</button></div></div>`;
  }

  const dayIndex = clamp(UI.planDay, 0, s.plan.days.length - 1);
  const day = s.plan.days[dayIndex];
  const totals = dayTotals(day);
  const t = s.targets;
  const diff = totals.kcal - t.calories;

  return `
  <div class="page-head">
    <div>
      <h1>Meal plan</h1>
      <p>${s.plan.days.length} days from ${prettyDate(s.plan.startDate)} · target ${t.calories} kcal, ${t.protein} g protein${s.profile.leftovers ? ' · leftovers on' : ''}</p>
    </div>
    <div class="head-actions">
      <button class="ghost small" data-action="print">Print</button>
      <button class="secondary small" data-action="go" data-view="groceries">Shopping list</button>
      <button class="small" data-action="regen-plan">Regenerate</button>
    </div>
  </div>

  ${(s.plan.warnings || []).map((w) => `<div class="callout warn" style="margin-bottom:14px">${escapeHtml(w)}</div>`).join('')}

  <div class="day-tabs">
    ${s.plan.days.map((d, i) => `<button class="day-tab ${i === dayIndex ? 'active' : ''}" data-action="plan-day" data-index="${i}">
      ${dayName(d.date)} ${new Date(d.date + 'T12:00:00').getDate()}
    </button>`).join('')}
  </div>

  <div class="card">
    <div class="card-head">
      <h2>${prettyDate(day.date)}</h2>
      <div class="row">
        <span class="mono">${fmtKcal(totals.kcal)} kcal</span>
        <span class="tag ${Math.abs(diff) < t.calories * 0.06 ? 'good' : 'warn'}">${diff >= 0 ? '+' : ''}${Math.round(diff)}</span>
      </div>
    </div>
    ${macroBars(totals, t)}
    <div class="divider"></div>
    ${day.meals.map((m) => mealCard(m, dayIndex)).join('')}
  </div>

  <div class="card">
    <div class="card-head"><h3>Week at a glance</h3><small class="muted">kcal / protein per day</small></div>
    <table>
      <thead><tr><th>Day</th><th>Meals</th><th class="num">kcal</th><th class="num">Protein</th></tr></thead>
      <tbody>
        ${s.plan.days.map((d, i) => {
          const dt = dayTotals(d);
          return `<tr>
            <td><button class="link" data-action="plan-day" data-index="${i}">${dayName(d.date)} ${new Date(d.date + 'T12:00:00').getDate()}</button></td>
            <td class="muted">${d.meals.map((m) => escapeHtml((RECIPE_BY_ID[m.recipeId] || {}).name || '')).join(' · ')}</td>
            <td class="num mono">${fmtKcal(dt.kcal)}</td>
            <td class="num mono">${Math.round(dt.p)} g</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>`;
};

/* ------------------------------------------------------------------ */
/* food log                                                             */
/* ------------------------------------------------------------------ */

Views.log = function () {
  const s = Store.state;
  const date = UI.logDate;
  const entries = Store.logEntries(date);
  const totals = Store.dayTotals(date);
  const t = s.targets;
  const byMeal = { breakfast: [], lunch: [], dinner: [], snack: [] };
  entries.forEach((e) => (byMeal[e.meal] || byMeal.snack).push(e));

  const sel = UI.selectedFood;
  const isRecipe = sel && sel.kind === 'recipe';

  return `
  <div class="page-head">
    <div>
      <h1>Food log</h1>
      <p>${prettyDate(date)}${t ? ` · ${fmtKcal(totals.kcal)} of ${fmtKcal(t.calories)} kcal` : ''}</p>
    </div>
    <div class="head-actions">
      <button class="ghost small" data-action="log-date" data-delta="-1">← Previous</button>
      <button class="ghost small" data-action="log-today">Today</button>
      <button class="ghost small" data-action="log-date" data-delta="1">Next →</button>
    </div>
  </div>

  ${t ? `<div class="card">
    <div class="ring-wrap">
      ${ringSvg(totals.kcal / t.calories, fmtKcal(totals.kcal), 'of ' + fmtKcal(t.calories))}
      <div style="flex:1">
        ${macroBars(totals, t)}
        <div class="row wrap" style="margin-top:12px;gap:16px">
          <small class="muted">Fibre <span class="mono">${Math.round(totals.fib)}/${t.fibre} g</span></small>
          <small class="muted">Remaining <span class="mono">${fmtKcal(Math.max(0, t.calories - totals.kcal))} kcal</span></small>
          <small class="muted">Protein left <span class="mono">${Math.max(0, Math.round(t.protein - totals.p))} g</span></small>
        </div>
      </div>
    </div>
  </div>` : ''}

  <div class="card">
    <div class="card-head"><h2>Add food</h2>
      <div class="row">
        ${['breakfast', 'lunch', 'dinner', 'snack'].map((m) => `<button class="chip ${UI.logMeal === m ? 'on' : ''}" data-action="log-meal" data-meal="${m}">${SLOT_LABEL[m]}</button>`).join('')}
      </div>
    </div>

    <input id="foodSearch" type="search" placeholder="Search foods and recipes — chicken breast, oats, spag bol…" value="${escapeHtml(UI.search)}" autocomplete="off">

    ${UI.searchResults.length ? `<div class="search-results">
      ${UI.searchResults.map((r) => `<div class="search-item" data-action="pick-food" data-kind="${r.kind}" data-id="${r.id}">
        <span>${escapeHtml(r.name)} ${r.kind === 'recipe' ? '<span class="tag">recipe</span>' : ''}</span>
        <span class="kcal">${escapeHtml(r.kcalLabel)}</span>
      </div>`).join('')}
    </div>` : ''}

    ${sel ? `<form class="row wrap" data-form="add-entry" style="margin-top:12px;align-items:flex-end">
      <div style="flex:2;min-width:180px">
        <label>Food</label>
        <input value="${escapeHtml(sel.name)}" disabled>
      </div>
      <div style="flex:1;min-width:120px">
        <label>${isRecipe ? 'Serves' : 'Amount (' + (sel.unit === 'ml' ? 'ml' : 'g') + ')'}</label>
        <input name="amount" type="number" step="${isRecipe ? '0.25' : '5'}" value="${isRecipe ? 1 : (sel.eaG || 100)}" autofocus>
      </div>
      <button type="submit">Add to ${SLOT_LABEL[UI.logMeal].toLowerCase()}</button>
      <button type="button" class="ghost" data-action="clear-pick">Cancel</button>
      <div id="entryPreview" class="dim" style="flex-basis:100%;font-size:12.5px"></div>
    </form>` : ''}

    <div class="row wrap" style="margin-top:12px;gap:8px">
      <button class="ghost small" data-action="quick-add">Quick add calories</button>
      <button class="ghost small" data-action="custom-food">Create a custom food</button>
      ${s.plan ? '<button class="ghost small" data-action="log-todays-plan">Log today\'s planned meals</button>' : ''}
    </div>
  </div>

  <div class="card">
    <div class="card-head"><h2>${entries.length} item${entries.length === 1 ? '' : 's'}</h2>
      ${entries.length ? `<span class="mono muted">${fmtKcal(totals.kcal)} kcal · P ${Math.round(totals.p)} · C ${Math.round(totals.c)} · F ${Math.round(totals.fat)}</span>` : ''}
    </div>
    ${entries.length ? ['breakfast', 'lunch', 'dinner', 'snack'].map((m) => {
      if (!byMeal[m].length) return '';
      const mt = byMeal[m].reduce((acc, e) => addNutrition(acc, e.nutrition), emptyNutrition());
      return `<div style="margin-bottom:14px">
        <div class="row spread" style="margin-bottom:2px">
          <strong style="font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-3)">${SLOT_LABEL[m]}</strong>
          <small class="mono dim">${fmtKcal(mt.kcal)} kcal</small>
        </div>
        ${byMeal[m].map((e) => `<div class="log-row">
          <div class="name">${escapeHtml(e.label)}</div>
          <div class="macros">${fmtKcal(e.nutrition.kcal)} kcal · P ${Math.round(e.nutrition.p)} · C ${Math.round(e.nutrition.c)} · F ${Math.round(e.nutrition.fat)}</div>
          <button class="ghost tiny" data-action="del-entry" data-id="${e.id}">✕</button>
        </div>`).join('')}
      </div>`;
    }).join('') : '<div class="empty">Nothing logged yet for this day.</div>'}
  </div>`;
};

Views.logMount = function () {
  const input = $('#foodSearch');
  if (input) {
    input.addEventListener('input', debounce((e) => {
      UI.search = e.target.value;
      UI.searchResults = searchFoods(UI.search, 10);
      UI.selectedFood = null;
      render();
      const again = $('#foodSearch');
      if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
    }, 180));
  }

  const form = $('[data-form="add-entry"]');
  if (form) {
    const preview = $('#entryPreview');
    const update = () => {
      const sel = UI.selectedFood;
      const amount = Number(form.amount.value) || 0;
      const n = entryNutrition(sel.kind, sel.id, amount);
      preview.textContent = `${fmtKcal(n.kcal)} kcal · protein ${Math.round(n.p)} g · carbs ${Math.round(n.c)} g · fat ${Math.round(n.fat)} g`;
    };
    form.amount.addEventListener('input', update);
    update();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const sel = UI.selectedFood;
      const amount = Number(form.amount.value);
      if (!amount || amount <= 0) return;
      const n = entryNutrition(sel.kind, sel.id, amount);
      Store.addLogEntry(UI.logDate, {
        kind: sel.kind, ref: sel.id, amount, meal: UI.logMeal,
        label: sel.kind === 'recipe'
          ? `${sel.name} × ${amount} serve${amount === 1 ? '' : 's'}`
          : `${sel.name}, ${Math.round(amount)} ${sel.unit === 'ml' ? 'ml' : 'g'}`,
        nutrition: n
      });
      UI.selectedFood = null;
      UI.search = '';
      UI.searchResults = [];
      toast('Logged.');
    });
  }
};

/* ------------------------------------------------------------------ */
/* workouts                                                             */
/* ------------------------------------------------------------------ */

Views.workouts = function () {
  const s = Store.state;
  if (!s.targets) return `<div class="page-head"><div><h1>Workouts</h1></div></div>` + needsSetupCard();
  if (!s.workoutPlan) {
    return `<div class="page-head"><div><h1>Workouts</h1></div></div>
      <div class="card"><div class="empty"><p>No training plan yet.</p><button data-action="regen-workout">Build my week</button></div></div>`;
  }

  const w = s.workoutPlan;
  const week = weeklySchedule(w);
  const todayIdx = new Date().getDay();

  return `
  <div class="page-head">
    <div>
      <h1>Workouts</h1>
      <p>${w.daysPerWeek} days a week · ${w.equipment === 'gym' ? 'full gym' : w.equipment === 'home' ? 'home setup' : 'bodyweight'} · ${w.experience} · ${GOALS.find((g) => g.id === w.goal).label.toLowerCase()}</p>
    </div>
    <div class="head-actions">
      <button class="ghost small" data-action="print">Print</button>
      <button class="small" data-action="regen-workout">Rebuild</button>
    </div>
  </div>

  <div class="card">
    <div class="card-head"><h2>Your week</h2><small class="muted">rest days spread deliberately</small></div>
    <table>
      <tbody>
        ${week.map((d, i) => `<tr>
          <td style="width:120px"><strong>${d.day}</strong>${i === todayIdx ? ' <span class="tag good">today</span>' : ''}</td>
          <td>${d.session ? escapeHtml(d.session.name) : '<span class="dim">Rest — walk, stretch, live your life</span>'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div class="grid cols-2">
    ${w.sessions.map((sess) => `<div class="card">
      <h3 style="margin-bottom:10px">${escapeHtml(sess.name)}</h3>
      ${sess.exercises.map((e) => `<div class="ex-row">
        <span class="ex-name">${escapeHtml(e.name)}</span>
        <span class="ex-dose">${e.sets} × ${e.reps} · ${e.rpe}</span>
      </div>`).join('')}
    </div>`).join('')}
  </div>

  <div class="card">
    <div class="card-head"><h2>Making it work</h2></div>
    <p><strong>Warm-up.</strong> ${escapeHtml(w.warmup)}</p>
    <p><strong>Progression.</strong> ${escapeHtml(w.progression)}</p>
    <p><strong>Steps.</strong> ${escapeHtml(w.cardio.steps)}.</p>
    <p><strong>Cardio.</strong> ${escapeHtml(w.cardio.sessions)}.</p>
    ${w.notes ? `<div class="callout warn">${escapeHtml(w.notes)}</div>` : ''}
  </div>`;
};

/* ------------------------------------------------------------------ */
/* groceries                                                            */
/* ------------------------------------------------------------------ */

Views.groceries = function () {
  const s = Store.state;
  if (!s.plan) {
    return `<div class="page-head"><div><h1>Groceries</h1><p>The list builds itself from your meal plan.</p></div></div>
      <div class="card"><div class="empty"><p>No meal plan yet.</p><button data-action="regen-plan">Generate a plan first</button></div></div>`;
  }

  const g = s.groceries;
  const list = buildGroceryList(s.plan, { days: g.days, store: g.store, pantry: g.pantry, prices: g.prices });
  const doneCount = list.aisles.reduce((n, a) => n + a.items.filter((i) => g.checked[i.id]).length, 0);

  return `
  <div class="page-head">
    <div>
      <h1>Groceries</h1>
      <p>${list.itemCount} items for ${list.days} days · about <strong>$${list.estimated.toFixed(2)}</strong> at ${STORE_LABELS[list.store]}${list.stapleCost ? ` (+ $${list.stapleCost.toFixed(2)} of staples if you're out)` : ''} · ${doneCount} ticked off</p>
    </div>
    <div class="head-actions">
      <button class="ghost small" data-action="copy-list">Copy as text</button>
      <button class="ghost small" data-action="print">Print</button>
      <button class="ghost small" data-action="uncheck-all">Reset ticks</button>
    </div>
  </div>

  <div class="card">
    <div class="row wrap spread">
      <div class="row wrap" style="gap:14px">
        <div>
          <label>Shop for</label>
          <select data-action="grocery-days">
            ${[3, 4, 5, 7, 10, 14].filter((d) => d <= s.plan.days.length).map((d) => `<option value="${d}" ${g.days === d ? 'selected' : ''}>${d} days</option>`).join('')}
          </select>
        </div>
        <div>
          <label>Store</label>
          <div class="store-toggle">
            ${['coles', 'woolworths', 'both'].map((st) => `<button class="${g.store === st ? 'on' : ''}" data-action="grocery-store" data-store="${st}">${st === 'both' ? 'Either' : STORE_LABELS[st]}</button>`).join('')}
          </div>
        </div>
      </div>
      <div class="dim" style="font-size:12.5px;max-width:34ch">Prices are rough estimates — tap one to set what you actually pay and it sticks.</div>
    </div>
  </div>

  <div class="card">
    ${list.aisles.map((a) => `<div class="aisle">
      <h3>${escapeHtml(a.aisle)}</h3>
      ${a.items.map((i) => `<div class="g-item ${g.checked[i.id] ? 'done' : ''}">
        <input type="checkbox" ${g.checked[i.id] ? 'checked' : ''} data-action="tick" data-id="${i.id}">
        <div class="g-name">
          ${escapeHtml(i.brand || i.name)}${i.staple ? ' <span class="tag">check the cupboard</span>' : ''}
          <small>need ${escapeHtml(i.needLabel)}${i.packs ? ` · buy ${i.packs} × ${escapeHtml(i.packLabel)}` : ''}</small>
        </div>
        <div class="g-qty">
          <button class="link" data-action="edit-price" data-id="${i.id}">${i.have ? 'have it' : money(i.cost)}</button>
        </div>
      </div>`).join('')}
    </div>`).join('')}

    ${list.extras.length ? `<div class="aisle">
      <h3>Extras</h3>
      ${list.extras.map((e) => `<div class="g-item ${g.checked[e.id] ? 'done' : ''}">
        <input type="checkbox" ${g.checked[e.id] ? 'checked' : ''} data-action="tick" data-id="${e.id}">
        <div class="g-name">${escapeHtml(e.name)}<small>${escapeHtml(e.needLabel || '')}</small></div>
        <button class="ghost tiny" data-action="del-extra" data-id="${e.id}">✕</button>
      </div>`).join('')}
    </div>` : ''}

    <form class="row" data-form="extra" style="margin-top:12px">
      <input name="name" placeholder="Add something else — coffee, dog food, sunscreen…" style="flex:1">
      <button class="secondary small" type="submit">Add</button>
    </form>
  </div>

  <div class="callout">Departments follow the way both Coles and Woolworths lay out a store, so the list runs roughly in walk order: fresh produce first, meat and dairy around the edges, pantry through the middle, freezer last.</div>`;
};

Views.groceriesMount = function () {
  const form = $('[data-form="extra"]');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      if (!name) return;
      Store.mutate((s) => { s.groceries.extra.push({ id: uid('x'), name, qty: '' }); });
      form.name.value = '';
    });
  }
};

/* ------------------------------------------------------------------ */
/* profile                                                              */
/* ------------------------------------------------------------------ */

Views.profile = function () {
  const s = Store.state;
  const p = s.profile;
  const t = s.targets;
  const snap = bodySnapshot(p);
  const missing = missingProfileFields(p);

  const num = (key, label, hint, attrs) => `<div class="field">
    <label>${label}</label>
    <input type="number" step="any" data-profile="${key}" value="${p[key] == null ? '' : p[key]}" ${attrs || ''}>
    ${hint ? `<div class="hint">${hint}</div>` : ''}
  </div>`;

  const sel = (key, label, options, hint) => `<div class="field">
    <label>${label}</label>
    <select data-profile="${key}">
      <option value="">—</option>
      ${options.map((o) => `<option value="${o.v}" ${String(p[key]) === String(o.v) ? 'selected' : ''}>${escapeHtml(o.l)}</option>`).join('')}
    </select>
    ${hint ? `<div class="hint">${hint}</div>` : ''}
  </div>`;

  return `
  <div class="page-head">
    <div>
      <h1>Profile</h1>
      <p>Everything the calculations run on. Change a number and the targets update immediately.</p>
    </div>
    <div class="head-actions">
      <button class="ghost small" data-action="start-setup">Guided setup</button>
      ${s.plan ? '<button class="small" data-action="regen-plan">Rebuild plan</button>' : ''}
    </div>
  </div>

  ${missing.length ? `<div class="callout warn">Still needed before I can calculate anything: <strong>${missing.join(', ')}</strong>.</div><div style="height:14px"></div>` : ''}

  <div class="grid cols-2">
    <div class="card">
      <div class="card-head"><h2>You</h2></div>
      <div class="field"><label>Name</label><input data-profile="name" value="${escapeHtml(p.name || '')}"></div>
      ${sel('sex', 'Sex (for the equations)', [{ v: 'male', l: 'Male' }, { v: 'female', l: 'Female' }])}
      ${num('age', 'Age', '', 'min="14" max="100"')}
      ${num('heightCm', 'Height (cm)', '', 'min="120" max="230"')}
      ${num('weightKg', 'Weight (kg)', 'Weigh yourself first thing, a few times a week — judge the trend, not the day.', 'min="35" max="250"')}
      <div class="divider"></div>
      <h3 style="margin-bottom:8px">Tape measurements <span class="dim" style="font-weight:400">optional</span></h3>
      <div class="hint" style="margin-bottom:10px">With a waist and neck measurement I can use the US Navy method, which beats any BMI-based body fat estimate by a wide margin.</div>
      ${num('waistCm', 'Waist at the navel (cm)')}
      ${num('neckCm', 'Neck (cm)')}
      ${p.sex === 'female' ? num('hipCm', 'Hips at the widest point (cm)') : ''}
      ${num('bodyFatPct', 'Known body fat % (DEXA, calipers, smart scales)', 'If you fill this in, it overrides both estimates.')}
    </div>

    <div class="stack">
      <div class="card">
        <div class="card-head"><h2>Goal & activity</h2></div>
        ${sel('activity', 'Activity outside training', ACTIVITY_LEVELS.map((a) => ({ v: a.id, l: a.label + ' — ' + a.hint })))}
        ${sel('goal', 'Goal', GOALS.map((g) => ({ v: g.id, l: g.label })))}
        ${p.goal && p.goal !== 'maintain' ? sel('rateKgPerWeek', 'Rate of change', [
          { v: 0.25, l: '0.25 kg / week — slow, very sustainable' },
          { v: 0.5, l: '0.5 kg / week — the usual recommendation' },
          { v: 0.75, l: '0.75 kg / week — aggressive' }
        ]) : ''}
        ${sel('mealsPerDay', 'Meals a day', [3, 4, 5, 6].map((n) => ({ v: n, l: n + ' meals' })))}
        ${sel('cookingTime', 'Time to cook', [
          { v: 'quick', l: 'Quick — 15 min max' },
          { v: 'medium', l: 'Normal — up to 40 min' },
          { v: 'any', l: 'No limit' }
        ])}
        ${sel('leftovers', 'Leftovers for lunch', [{ v: 'true', l: 'Yes — cook once, eat twice' }, { v: 'false', l: 'No — variety every meal' }])}
      </div>

      <div class="card">
        <div class="card-head"><h2>Training</h2></div>
        ${sel('workoutDays', 'Days a week', [2, 3, 4, 5, 6].map((n) => ({ v: n, l: n + ' days' })))}
        ${sel('equipment', 'Equipment', [{ v: 'gym', l: 'Full gym' }, { v: 'home', l: 'Dumbbells / bands at home' }, { v: 'none', l: 'Bodyweight only' }])}
        ${sel('experience', 'Experience', [{ v: 'beginner', l: 'Beginner' }, { v: 'intermediate', l: 'Intermediate' }, { v: 'advanced', l: 'Advanced' }])}
        <div class="field"><label>Injuries or things to avoid</label><input data-profile="injuries" value="${escapeHtml(p.injuries || '')}"></div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-head"><h2>Food preferences</h2></div>
    <label>I don't eat</label>
    <div class="chips" style="margin-bottom:14px">
      ${Object.keys(DIET_LABELS).map((k) => `<button class="chip ${(p.diets || []).indexOf(k) !== -1 ? 'on' : ''}" data-action="toggle-diet" data-diet="${k}">${DIET_LABELS[k]}</button>`).join('')}
    </div>
    <label>Never plan these ingredients</label>
    <div class="chips">
      ${(p.dislikes || []).map((id) => `<button class="chip on" data-action="toggle-dislike" data-id="${id}">${escapeHtml((FOOD_BY_ID[id] || { name: id }).name)} ✕</button>`).join('') || '<span class="dim" style="font-size:13px">Nothing excluded.</span>'}
    </div>
    <div class="row" style="margin-top:10px">
      <select id="dislikePicker" style="max-width:280px">
        <option value="">Add an ingredient to avoid…</option>
        ${INGREDIENTS.slice().sort((a, b) => a.name.localeCompare(b.name)).map((f) => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('')}
      </select>
    </div>
  </div>

  ${t ? `<div class="card">
    <div class="card-head"><h2>What that gives you</h2><small class="muted">${escapeHtml(t.bmrMethod)}</small></div>
    <div class="grid cols-4">
      <div class="stat"><div class="k">BMI</div><div class="v">${snap.bmi ?? '—'}</div><div class="sub">${snap.bmiCategory.label}</div></div>
      <div class="stat"><div class="k">Body fat</div><div class="v">${snap.bodyFatPct != null ? snap.bodyFatPct + '<small>%</small>' : '—'}</div><div class="sub">${escapeHtml(snap.bodyFatMethod || 'needs more data')}</div></div>
      <div class="stat"><div class="k">Resting burn</div><div class="v">${t.bmr}</div><div class="sub">kcal at complete rest</div></div>
      <div class="stat"><div class="k">Maintenance</div><div class="v">${t.tdee}</div><div class="sub">kcal to hold weight</div></div>
    </div>
    <div class="grid cols-4" style="margin-top:14px">
      <div class="stat"><div class="k">Daily target</div><div class="v">${t.calories}</div><div class="sub">${t.flooredAt ? 'raised to a safe floor' : GOALS.find((g) => g.id === t.goal).label}</div></div>
      <div class="stat"><div class="k">Protein</div><div class="v">${t.protein}<small>g</small></div><div class="sub">${round(t.protein / p.weightKg, 1)} g per kg</div></div>
      <div class="stat"><div class="k">Carbs</div><div class="v">${t.carbs}<small>g</small></div><div class="sub">fuel for training</div></div>
      <div class="stat"><div class="k">Fat</div><div class="v">${t.fat}<small>g</small></div><div class="sub">hormones, satiety</div></div>
    </div>
    ${snap.healthyWeightRange ? `<p class="muted" style="margin-top:14px">A BMI in the healthy range for ${p.heightCm} cm means roughly <strong>${snap.healthyWeightRange.min}–${snap.healthyWeightRange.max} kg</strong>. BMI ignores muscle, so if you lift, read it alongside your body fat percentage rather than on its own.</p>` : ''}
  </div>` : ''}

  ${s.weights.length ? `<div class="card">
    <div class="card-head"><h2>Weight history</h2><small class="muted">${s.weights.length} entries</small></div>
    <table>
      <thead><tr><th>Date</th><th class="num">Weight</th><th class="num">Change</th></tr></thead>
      <tbody>${s.weights.slice(-14).reverse().map((w, i, arr) => {
        const prev = arr[i + 1];
        const delta = prev ? w.kg - prev.kg : null;
        return `<tr><td>${prettyDate(w.date)}</td><td class="num mono">${w.kg} kg</td>
          <td class="num mono ${delta > 0 ? '' : 'muted'}">${delta == null ? '—' : (delta > 0 ? '+' : '') + round(delta, 1) + ' kg'}</td></tr>`;
      }).join('')}</tbody>
    </table>
  </div>` : ''}`;
};

Views.profileMount = function () {
  $$('[data-profile]').forEach((el) => {
    el.addEventListener('change', () => {
      const key = el.dataset.profile;
      let value = el.value;
      if (el.type === 'number') value = value === '' ? null : Number(value);
      if (value === 'true') value = true;
      if (value === 'false') value = false;
      if (['age', 'mealsPerDay', 'workoutDays'].indexOf(key) !== -1 && value != null) value = Number(value);
      if (key === 'rateKgPerWeek') value = Number(value);
      Store.setProfile({ [key]: value });
      toast('Updated.');
    });
  });

  const picker = $('#dislikePicker');
  if (picker) {
    picker.addEventListener('change', () => {
      const id = picker.value;
      if (!id) return;
      Store.mutate((s) => {
        if (s.profile.dislikes.indexOf(id) === -1) s.profile.dislikes.push(id);
      });
    });
  }
};

/* ------------------------------------------------------------------ */
/* settings                                                             */
/* ------------------------------------------------------------------ */

Views.settings = function () {
  const c = Store.state.settings;
  const size = (() => {
    try { return Math.round((localStorage.getItem(STORAGE_KEY) || '').length / 1024); } catch (e) { return 0; }
  })();

  return `
  <div class="page-head">
    <div><h1>Settings</h1><p>Your data never leaves this laptop unless you turn on Claude mode or export it yourself.</p></div>
  </div>

  <div class="card">
    <div class="card-head"><h2>Claude mode <span class="tag ${c.apiKey ? 'good' : ''}">${c.apiKey ? 'on' : 'off'}</span></h2></div>
    <p class="muted">Guided mode does the maths, plans and lists without any connection. Add an Anthropic API key and the assistant becomes a real conversation that can also change your plan, log your food and rebuild your shop.</p>
    <div class="field">
      <label>Anthropic API key</label>
      <input type="password" data-setting="apiKey" value="${escapeHtml(c.apiKey || '')}" placeholder="sk-ant-…" autocomplete="off">
      <div class="hint">Create one at console.anthropic.com. It is stored in this browser's localStorage and sent only to api.anthropic.com — anyone who can use this laptop profile can read it, so skip this on a shared machine.</div>
    </div>
    <div class="grid cols-3">
      <div class="field">
        <label>Model</label>
        <select data-setting="model">
          ${[['claude-opus-5', 'Claude Opus 5 — best'], ['claude-sonnet-5', 'Claude Sonnet 5 — faster, cheaper'], ['claude-haiku-4-5', 'Claude Haiku 4.5 — cheapest']]
            .map(([v, l]) => `<option value="${v}" ${c.model === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Effort</label>
        <select data-setting="effort">
          ${['low', 'medium', 'high'].map((v) => `<option value="${v}" ${(c.effort || 'medium') === v ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
        <div class="hint">Higher thinks longer and costs more.</div>
      </div>
      <div class="field">
        <label>Show reasoning</label>
        <select data-setting="thinking">
          <option value="true" ${c.thinking !== false ? 'selected' : ''}>Yes</option>
          <option value="false" ${c.thinking === false ? 'selected' : ''}>No</option>
        </select>
      </div>
    </div>
    <div class="field">
      <label>API base URL</label>
      <input data-setting="baseUrl" value="${escapeHtml(c.baseUrl || '')}" placeholder="https://api.anthropic.com">
      <div class="hint">Only change this if you are routing through your own proxy.</div>
    </div>
  </div>

  <div class="card">
    <div class="card-head"><h2>Your data</h2><small class="muted">${size} KB stored</small></div>
    <p class="muted">Everything — profile, log, plans, chat — lives in this browser's storage. Clearing site data or "clear browsing history including cookies" will wipe it, so export a backup now and then.</p>
    <div class="row wrap">
      <button class="secondary" data-action="export">Export backup (.json)</button>
      <button class="secondary" data-action="import">Import backup</button>
      <button class="ghost" data-action="export-log">Export food log (.csv)</button>
      <button class="danger" data-action="reset">Erase everything</button>
    </div>
    <input type="file" id="importFile" accept="application/json" style="display:none">
  </div>

  <div class="card">
    <div class="card-head"><h2>Where the numbers come from</h2></div>
    <table>
      <tbody>
        <tr><td><strong>BMI</strong></td><td class="muted">weight ÷ height², with WHO categories.</td></tr>
        <tr><td><strong>Body fat</strong></td><td class="muted">US Navy circumference method when you supply a tape measurement; otherwise the Deurenberg BMI-based estimate. Your own DEXA or caliper figure overrides both.</td></tr>
        <tr><td><strong>Resting burn</strong></td><td class="muted">Katch-McArdle when lean mass is known (it is the better equation), otherwise Mifflin-St Jeor.</td></tr>
        <tr><td><strong>Daily burn</strong></td><td class="muted">resting burn × an activity multiplier from 1.2 to 1.9.</td></tr>
        <tr><td><strong>Deficit / surplus</strong></td><td class="muted">7,700 kcal per kg of body mass, spread across the week, with a floor so a cut never goes below 1.05 × resting burn.</td></tr>
        <tr><td><strong>Food data</strong></td><td class="muted">typical values for Australian supermarket products, per 100 g raw. Always trust the label on the pack over this.</td></tr>
      </tbody>
    </table>
    <div class="callout warn" style="margin-top:14px">These are population equations, not measurements of you. They are a starting point — the trend in your weight, measurements and training over two to three weeks is what tells you whether the numbers are right. For anything medical (a diagnosed condition, medication, pregnancy, a history of disordered eating), talk to your GP or an Accredited Practising Dietitian.</div>
  </div>`;
};

Views.settingsMount = function () {
  $$('[data-setting]').forEach((el) => {
    el.addEventListener('change', () => {
      let value = el.value;
      if (value === 'true') value = true;
      if (value === 'false') value = false;
      Store.mutate((s) => { s.settings[el.dataset.setting] = value; }, { render: false });
      toast('Saved.');
    });
  });

  const file = $('#importFile');
  if (file) {
    file.addEventListener('change', () => {
      const f = file.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          Store.importJSON(String(reader.result));
          toast('Backup restored.');
        } catch (err) {
          toast('That file could not be read as a Fuel backup.');
        }
      };
      reader.readAsText(f);
    });
  }
};
