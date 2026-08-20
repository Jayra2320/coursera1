/* assistant.js — the coach.
 *
 * Two modes, and the app is fully usable in either:
 *
 *  1. Guided mode (no API key, works offline). A scripted intake that asks the
 *     questions needed to compute BMI, body fat, BMR/TDEE and macro targets,
 *     then drives the planners directly.
 *  2. Claude mode (your own Anthropic API key). The same data, but you can talk
 *     to it in plain English. Claude gets tools that read and write the real
 *     app state — it can update your profile, regenerate the plan, swap a meal,
 *     log food and rebuild the shopping list.
 *
 * The key is stored in this browser's localStorage and sent only to
 * api.anthropic.com. Anyone with access to this laptop profile can read it — if
 * that matters to you, leave Claude mode off and use guided mode.
 */

const Assistant = {

  /* =====================================================================
   * Guided intake — the offline question flow
   * ===================================================================== */

  steps: [
    {
      key: 'name', type: 'text', optional: true,
      q: "Let's set you up. What should I call you?",
      apply: (s, v) => ({ name: v })
    },
    {
      key: 'sex', type: 'choice',
      options: [{ v: 'male', l: 'Male' }, { v: 'female', l: 'Female' }],
      q: 'Which set of equations should I use for your metabolic rate and body fat estimate? They differ by biological sex.',
      apply: (s, v) => ({ sex: v })
    },
    {
      key: 'age', type: 'number', min: 14, max: 100, unit: 'years',
      q: 'How old are you?',
      apply: (s, v) => ({ age: v })
    },
    {
      key: 'heightCm', type: 'number', min: 120, max: 230, unit: 'cm',
      q: 'Height in centimetres?',
      apply: (s, v) => ({ heightCm: v })
    },
    {
      key: 'weightKg', type: 'number', min: 35, max: 250, unit: 'kg',
      q: 'Current weight in kilograms? Morning, after the toilet, before breakfast is the most consistent time to weigh.',
      apply: (s, v) => ({ weightKg: v })
    },
    {
      key: 'waistCm', type: 'number', min: 40, max: 200, unit: 'cm', optional: true,
      q: 'Do you have a tape measure? Waist circumference at the navel, in cm — this gets your body fat estimate much closer than height and weight alone. Skip if you have not got a tape.',
      apply: (s, v) => ({ waistCm: v })
    },
    {
      key: 'neckCm', type: 'number', min: 20, max: 70, unit: 'cm', optional: true,
      q: 'Neck circumference, just below the larynx, in cm?',
      skipIf: (s) => !s.profile.waistCm,
      apply: (s, v) => ({ neckCm: v })
    },
    {
      key: 'hipCm', type: 'number', min: 50, max: 200, unit: 'cm', optional: true,
      q: 'Hip circumference at the widest point, in cm?',
      skipIf: (s) => !s.profile.waistCm || s.profile.sex !== 'female',
      apply: (s, v) => ({ hipCm: v })
    },
    {
      key: 'activity', type: 'choice',
      options: ACTIVITY_LEVELS.map((a) => ({ v: a.id, l: a.label + ' — ' + a.hint })),
      q: 'How active are you outside of deliberate training? Be honest here — most people overestimate, and this is the single biggest input into your calorie target.',
      apply: (s, v) => ({ activity: v })
    },
    {
      key: 'goal', type: 'choice',
      options: GOALS.map((g) => ({ v: g.id, l: g.label + ' — ' + g.hint })),
      q: 'What are we aiming at?',
      apply: (s, v) => ({ goal: v })
    },
    {
      key: 'rateKgPerWeek', type: 'choice',
      options: [
        { v: '0.25', l: '0.25 kg a week — slow and very sustainable' },
        { v: '0.5', l: '0.5 kg a week — the usual recommendation' },
        { v: '0.75', l: '0.75 kg a week — aggressive, needs discipline' }
      ],
      q: 'How fast do you want that to happen?',
      skipIf: (s) => s.profile.goal === 'maintain',
      apply: (s, v) => ({ rateKgPerWeek: Number(v) })
    },
    {
      key: 'diets', type: 'multi',
      options: Object.keys(DIET_LABELS).map((k) => ({ v: k, l: DIET_LABELS[k] })),
      q: 'Anything you do not eat? Pick as many as apply, or skip.',
      optional: true,
      apply: (s, v) => ({ diets: v })
    },
    {
      key: 'mealsPerDay', type: 'choice',
      options: [{ v: '3', l: '3 — three solid meals' }, { v: '4', l: '4 — three meals and a snack' }, { v: '5', l: '5 — smaller and more often' }],
      q: 'How many times a day do you like to eat?',
      apply: (s, v) => ({ mealsPerDay: Number(v) })
    },
    {
      key: 'cookingTime', type: 'choice',
      options: [
        { v: 'quick', l: 'Quick — 15 minutes on a weeknight, maximum' },
        { v: 'medium', l: 'Normal — up to about 30–40 minutes for dinner' },
        { v: 'any', l: 'I enjoy cooking — no limit' }
      ],
      q: 'How much time do you actually want to spend cooking?',
      apply: (s, v) => ({ cookingTime: v })
    },
    {
      key: 'leftovers', type: 'choice',
      options: [{ v: 'yes', l: 'Yes — cook once, eat twice' }, { v: 'no', l: 'No — I want variety every meal' }],
      q: 'Happy to eat last night\'s dinner for lunch? It cuts your cooking and your shop considerably.',
      apply: (s, v) => ({ leftovers: v === 'yes' })
    },
    {
      key: 'workoutDays', type: 'choice',
      options: [2, 3, 4, 5, 6].map((n) => ({ v: String(n), l: n + ' days a week' })),
      q: 'How many days a week can you realistically train?',
      apply: (s, v) => ({ workoutDays: Number(v) })
    },
    {
      key: 'equipment', type: 'choice',
      options: [
        { v: 'gym', l: 'Full gym' },
        { v: 'home', l: 'Home setup — dumbbells and/or bands' },
        { v: 'none', l: 'Bodyweight only' }
      ],
      q: 'What do you have to train with?',
      apply: (s, v) => ({ equipment: v })
    },
    {
      key: 'experience', type: 'choice',
      options: [
        { v: 'beginner', l: 'Beginner — under a year of consistent lifting' },
        { v: 'intermediate', l: 'Intermediate — 1–3 years, know my way around' },
        { v: 'advanced', l: 'Advanced — 3+ years, training is programmed' }
      ],
      q: 'How much lifting experience do you have?',
      apply: (s, v) => ({ experience: v })
    },
    {
      key: 'injuries', type: 'text', optional: true,
      q: 'Anything I should work around — injuries, joints, a dodgy shoulder? Type it, or skip.',
      apply: (s, v) => ({ injuries: v })
    }
  ],

  nextStepIndex(state, from) {
    for (let i = from; i < this.steps.length; i++) {
      const step = this.steps[i];
      if (step.skipIf && step.skipIf(state)) continue;
      return i;
    }
    return -1;
  },

  currentStep() {
    const s = Store.state;
    if (!s.intake.active) return null;
    const i = this.nextStepIndex(s, s.intake.step);
    return i === -1 ? null : Object.assign({ index: i }, this.steps[i]);
  },

  startIntake() {
    Store.mutate((s) => {
      s.intake = { step: 0, active: true };
      s.chat.push({
        role: 'assistant', mode: 'guided',
        content: [{ type: 'text', text: this.steps[0].q }]
      });
    });
  },

  /* Returns { ok, error } — the view re-renders from Store afterwards. */
  answerIntake(raw) {
    const step = this.currentStep();
    if (!step) return { ok: false, error: 'Setup is already finished.' };
    const s = Store.state;
    const value = raw;
    const skipped = typeof value === 'string' && /^(skip|none|no|-)$/i.test(value.trim());

    if (skipped && !step.optional) {
      return { ok: false, error: 'I need this one to do the maths — ' + step.q };
    }

    let patch = null;
    if (!skipped) {
      if (step.type === 'number') {
        const n = Number(String(value).replace(/[^\d.]/g, ''));
        if (!isFinite(n) || n < step.min || n > step.max) {
          return { ok: false, error: `That should be a number between ${step.min} and ${step.max} ${step.unit}.` };
        }
        patch = step.apply(s, n);
      } else if (step.type === 'multi') {
        patch = step.apply(s, Array.isArray(value) ? value : []);
      } else {
        patch = step.apply(s, value);
      }
    }

    Store.mutate((st) => {
      if (patch) Object.assign(st.profile, patch);
      st.chat.push({ role: 'user', content: [{ type: 'text', text: this.describeAnswer(step, value, skipped) }] });
      st.intake.step = step.index + 1;
      const t = computeTargets(st.profile);
      if (t) st.targets = t;
    }, { render: false });

    const next = this.currentStep();
    if (next) {
      Store.mutate((st) => {
        st.chat.push({ role: 'assistant', mode: 'guided', content: [{ type: 'text', text: next.q }] });
      });
      return { ok: true, done: false };
    }

    /* Finished — compute everything and report back. */
    Store.mutate((st) => {
      st.intake.active = false;
      const t = computeTargets(st.profile);
      if (t) st.targets = t;
      st.workoutPlan = generateWorkoutPlan(st.profile, st.targets);
      if (st.targets) {
        st.plan = generatePlan(st.profile, st.targets, { days: 7, startDate: todayISO(), seed: Date.now() });
      }
      st.chat.push({ role: 'assistant', mode: 'guided', content: [{ type: 'text', text: this.summaryText() }] });
    });
    return { ok: true, done: true };
  },

  describeAnswer(step, value, skipped) {
    if (skipped) return 'Skip';
    if (step.type === 'multi') {
      const arr = Array.isArray(value) ? value : [];
      return arr.length ? arr.map((v) => DIET_LABELS[v] || v).join(', ') : 'None';
    }
    if (step.type === 'choice') {
      const opt = (step.options || []).find((o) => o.v === value);
      return opt ? opt.l.split(' — ')[0] : String(value);
    }
    if (step.type === 'number') return String(value) + (step.unit ? ' ' + step.unit : '');
    return String(value);
  },

  /* The report produced at the end of setup — and by "recalculate" later. */
  summaryText() {
    const s = Store.state;
    const p = s.profile;
    const t = s.targets;
    const snap = bodySnapshot(p);
    if (!t) return 'I still need a few numbers before I can calculate anything — open the Profile tab.';

    const lines = [];
    lines.push(`**Here's where you are${p.name ? ', ' + p.name : ''}.**`);
    lines.push('');
    lines.push(`- **BMI ${snap.bmi}** — ${snap.bmiCategory.label}. A healthy weight for ${p.heightCm} cm is roughly ${snap.healthyWeightRange.min}–${snap.healthyWeightRange.max} kg.`);
    if (snap.bodyFatPct != null) {
      lines.push(`- **Body fat ≈ ${snap.bodyFatPct}%** (${snap.bodyFatMethod}) — ${snap.bodyFatCategory.label} range. That is about ${snap.leanMassKg} kg of lean mass and ${snap.fatMassKg} kg of fat.`);
      if (snap.ffmi != null) lines.push(`- **FFMI ${snap.ffmi}** — how much muscle you carry for your height.`);
    }
    lines.push(`- **Resting burn ${t.bmr} kcal** (${t.bmrMethod}), **total daily burn ≈ ${t.tdee} kcal** once your activity level is applied.`);
    lines.push('');
    lines.push(`**Your daily targets**`);
    lines.push(`- ${t.calories} kcal`);
    lines.push(`- Protein ${t.protein} g · Carbs ${t.carbs} g · Fat ${t.fat} g`);
    lines.push(`- Fibre ${t.fibre} g · Water ${t.waterL} L`);
    if (t.flooredAt) lines.push(`- I raised your calories to ${t.flooredAt} — the deficit you asked for went below a sensible floor.`);
    if (t.goal !== 'maintain') {
      lines.push(`- At this intake you should see about ${Math.abs(t.weeklyWeightChangeKg)} kg ${t.goal === 'cut' ? 'off' : 'on'} per week. Judge it on a 2-week average, not day to day.`);
    }
    lines.push('');
    lines.push(`I've built you a 7-day meal plan and a ${s.workoutPlan ? s.workoutPlan.daysPerWeek + '-day' : ''} training week to match. The shopping list for it is under **Groceries** — it is grouped by department for Coles and Woolworths.`);
    lines.push('');
    lines.push(`Weigh yourself a few mornings a week and log what you eat; in two weeks the trend tells us whether these numbers were right for *you*, and I'll adjust them.`);
    return lines.join('\n');
  },

  /* =====================================================================
   * Offline replies — used when there is no API key
   * ===================================================================== */

  offlineReply(text) {
    const q = text.toLowerCase();
    const s = Store.state;

    if (/\b(setup|start|set me up|begin|onboard)\b/.test(q)) {
      this.startIntake();
      return null;
    }
    if (/\b(recalc|recalculate|targets?|bmi|body fat|bmr|tdee|maintenance)\b/.test(q)) {
      Store.recomputeTargets();
      return this.summaryText();
    }
    if (/\b(meal plan|plan my meals|new plan|regenerate|menu)\b/.test(q)) {
      if (!s.targets) return 'I need your numbers first — say **setup** and I will ask you the questions.';
      Store.mutate((st) => {
        st.plan = generatePlan(st.profile, st.targets, { days: 7, startDate: todayISO(), seed: Date.now() });
      });
      const plan = Store.state.plan;
      const t = dayTotals(plan.days[0]);
      const warn = (plan.warnings || []).length ? '\n\n⚠️ ' + plan.warnings.join(' ') : '';
      return `Done — a fresh 7-day plan is under **Meal plan**. Day one comes to ${Math.round(t.kcal)} kcal with ${Math.round(t.p)} g protein, against a target of ${s.targets.calories} kcal / ${s.targets.protein} g.` + warn;
    }
    if (/\b(workout|training|gym|program|programme|split)\b/.test(q)) {
      if (!s.targets) return 'Tell me a bit about yourself first — say **setup**.';
      Store.mutate((st) => { st.workoutPlan = generateWorkoutPlan(st.profile, st.targets); });
      const w = Store.state.workoutPlan;
      return `Built you a ${w.daysPerWeek}-day split (${w.sessions.map((x) => x.name).join(', ')}) — it's under **Workouts**, along with the cardio and step targets for your goal.`;
    }
    if (/\b(grocer|shopping|shop|coles|woolworths|woolies|list)\b/.test(q)) {
      if (!s.plan) return 'Generate a meal plan first and the shopping list builds itself from it.';
      const list = buildGroceryList(s.plan, { days: s.groceries.days, store: s.groceries.store, pantry: s.groceries.pantry, prices: s.groceries.prices });
      return `Your list has **${list.itemCount} items** across ${list.aisles.length} departments, roughly **$${list.estimated.toFixed(2)}** for ${list.days} days. It's under **Groceries** — you can tick items off as you walk the store.`;
    }
    if (/\b(log|ate|eaten|had)\b/.test(q)) {
      return 'Open the **Food log** tab and start typing a food — it searches the ingredient list and the recipes, and you enter grams or serves. Anything missing you can add as a custom food once and reuse forever.';
    }
    if (/\b(help|what can you)\b/.test(q)) {
      return [
        'In guided mode I can do all of this without an internet connection:',
        '- **setup** — I ask the questions and calculate your BMI, body fat, BMR, TDEE and macros',
        '- **recalculate** — redo the numbers after a weight change',
        '- **meal plan** — build a fresh 7 days that hits your targets',
        '- **workout** — build a training week around your days, equipment and experience',
        '- **groceries** — turn the plan into a Coles/Woolworths shop',
        '',
        'For proper back-and-forth conversation, add an Anthropic API key under **Settings** and I will run on Claude instead.'
      ].join('\n');
    }
    return [
      "I'm in guided mode (no API key), so I understand a short list of commands rather than free conversation:",
      '**setup**, **recalculate**, **meal plan**, **workout**, **groceries**, **help**.',
      '',
      'Add an Anthropic API key in **Settings** to talk to me properly.'
    ].join('\n');
  },

  /* =====================================================================
   * Claude mode
   * ===================================================================== */

  hasKey() {
    return !!(Store.state.settings.apiKey || '').trim();
  },

  tools: [
    {
      name: 'get_status',
      description: 'Read the current state of the app: profile, body composition, calculated targets, today\'s food log, and summaries of the current meal plan, workout plan and grocery list. Call this before giving any advice that depends on the user\'s numbers.',
      input_schema: { type: 'object', properties: {}, additionalProperties: false }
    },
    {
      name: 'update_profile',
      description: 'Update one or more profile fields and recalculate BMI, body fat, BMR, TDEE and macro targets. Only send the fields that change.',
      input_schema: {
        type: 'object',
        properties: {
          sex: { type: 'string', enum: ['male', 'female'] },
          age: { type: 'number' },
          heightCm: { type: 'number' },
          weightKg: { type: 'number' },
          neckCm: { type: 'number' },
          waistCm: { type: 'number' },
          hipCm: { type: 'number' },
          bodyFatPct: { type: 'number', description: 'Only if measured directly, e.g. DEXA or smart scales.' },
          activity: { type: 'string', enum: ['sedentary', 'light', 'moderate', 'very', 'extreme'] },
          goal: { type: 'string', enum: ['cut', 'maintain', 'gain'] },
          rateKgPerWeek: { type: 'number', description: 'Target rate of weight change, 0.25 to 0.75.' },
          diets: { type: 'array', items: { type: 'string', enum: Object.keys(DIET_LABELS) } },
          dislikes: { type: 'array', items: { type: 'string' }, description: 'Ingredient ids from list_foods to never include.' },
          mealsPerDay: { type: 'number' },
          cookingTime: { type: 'string', enum: ['quick', 'medium', 'any'] },
          leftovers: { type: 'boolean' },
          workoutDays: { type: 'number' },
          equipment: { type: 'string', enum: ['gym', 'home', 'none'] },
          experience: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
          injuries: { type: 'string' }
        },
        additionalProperties: false
      }
    },
    {
      name: 'generate_meal_plan',
      description: 'Build a new meal plan that hits the current calorie and macro targets. Replaces the existing plan.',
      input_schema: {
        type: 'object',
        properties: { days: { type: 'number', description: 'How many days to plan, 1 to 14. Defaults to 7.' } },
        additionalProperties: false
      }
    },
    {
      name: 'list_recipes',
      description: 'List the recipes available for a meal slot, with per-serve nutrition, so you can suggest a specific swap.',
      input_schema: {
        type: 'object',
        properties: {
          slot: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
          maxMinutes: { type: 'number' }
        },
        required: ['slot'],
        additionalProperties: false
      }
    },
    {
      name: 'swap_meal',
      description: 'Replace one meal in the plan. Give a recipeId from list_recipes, or omit it to pick a different recipe at random.',
      input_schema: {
        type: 'object',
        properties: {
          dayIndex: { type: 'number', description: '0 = the first day of the plan.' },
          slot: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
          recipeId: { type: 'string' }
        },
        required: ['dayIndex', 'slot'],
        additionalProperties: false
      }
    },
    {
      name: 'log_food',
      description: 'Add an item to the food log. Search by name across ingredients and recipes; the closest match is used. Amount is grams for an ingredient, or serves for a recipe.',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Food or recipe name, e.g. "chicken breast" or "spaghetti bolognese".' },
          amount: { type: 'number', description: 'Grams for an ingredient, serves for a recipe.' },
          meal: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
          date: { type: 'string', description: 'YYYY-MM-DD. Defaults to today.' }
        },
        required: ['query', 'amount'],
        additionalProperties: false
      }
    },
    {
      name: 'generate_workout_plan',
      description: 'Rebuild the weekly training split from the current profile (days available, equipment, experience, goal).',
      input_schema: { type: 'object', properties: {}, additionalProperties: false }
    },
    {
      name: 'build_grocery_list',
      description: 'Rebuild the shopping list from the meal plan and return it, grouped by supermarket department.',
      input_schema: {
        type: 'object',
        properties: {
          days: { type: 'number', description: 'How many days of the plan to shop for. Defaults to 7.' },
          store: { type: 'string', enum: ['coles', 'woolworths', 'both'] }
        },
        additionalProperties: false
      }
    }
  ],

  runTool(name, input) {
    const s = Store.state;
    try {
      switch (name) {
        case 'get_status': {
          const snap = bodySnapshot(s.profile);
          const today = todayISO();
          const totals = Store.dayTotals(today);
          return {
            profile: s.profile,
            body: snap,
            targets: s.targets,
            today: {
              date: today,
              consumed: { kcal: Math.round(totals.kcal), protein: Math.round(totals.p), carbs: Math.round(totals.c), fat: Math.round(totals.fat), fibre: Math.round(totals.fib) },
              entries: Store.logEntries(today).map((e) => ({ label: e.label, kcal: Math.round(e.nutrition.kcal), meal: e.meal }))
            },
            recentWeights: s.weights.slice(-8),
            mealPlan: s.plan ? {
              startDate: s.plan.startDate,
              days: s.plan.days.map((d, i) => ({
                index: i, date: d.date,
                kcal: Math.round(dayTotals(d).kcal),
                protein: Math.round(dayTotals(d).p),
                meals: d.meals.map((m) => ({
                  slot: m.slot,
                  recipeId: m.recipeId,
                  name: (RECIPE_BY_ID[m.recipeId] || {}).name,
                  serves: m.scale,
                  leftover: !!m.leftover
                }))
              }))
            } : null,
            workoutPlan: s.workoutPlan ? {
              daysPerWeek: s.workoutPlan.daysPerWeek,
              sessions: s.workoutPlan.sessions.map((x) => ({ name: x.name, exercises: x.exercises.map((e) => `${e.name} ${e.sets}×${e.reps}`) })),
              cardio: s.workoutPlan.cardio
            } : null
          };
        }

        case 'update_profile': {
          const missingBefore = missingProfileFields(s.profile);
          Store.setProfile(input);
          return {
            ok: true,
            profile: Store.state.profile,
            body: bodySnapshot(Store.state.profile),
            targets: Store.state.targets,
            stillMissing: missingProfileFields(Store.state.profile),
            note: missingBefore.length && !missingProfileFields(Store.state.profile).length
              ? 'Profile is now complete — targets have been calculated.' : undefined
          };
        }

        case 'generate_meal_plan': {
          if (!s.targets) return { error: 'No targets yet — call update_profile with the missing fields first.' };
          const days = clamp(Math.round(input.days || 7), 1, 14);
          Store.mutate((st) => {
            st.plan = generatePlan(st.profile, st.targets, { days, startDate: todayISO(), seed: Date.now() });
          });
          const plan = Store.state.plan;
          return {
            ok: true,
            warnings: plan.warnings,
            days: plan.days.map((d, i) => {
              const t = dayTotals(d);
              return {
                index: i, date: d.date, kcal: Math.round(t.kcal), protein: Math.round(t.p),
                meals: d.meals.map((m) => `${m.slot}: ${(RECIPE_BY_ID[m.recipeId] || {}).name}${m.leftover ? ' (leftovers)' : ''}`)
              };
            })
          };
        }

        case 'list_recipes': {
          const excl = exclusionsFor(s.profile.diets);
          return {
            recipes: RECIPES
              .filter((r) => r.slots.indexOf(input.slot) !== -1)
              .filter((r) => recipeAllowed(r, excl, s.profile.dislikes))
              .filter((r) => !input.maxMinutes || r.mins <= input.maxMinutes)
              .map((r) => {
                const n = recipeNutrition(r, 1);
                return {
                  id: r.id, name: r.name, minutes: r.mins,
                  perServe: { kcal: Math.round(n.kcal), protein: Math.round(n.p), carbs: Math.round(n.c), fat: Math.round(n.fat) }
                };
              })
          };
        }

        case 'swap_meal': {
          if (!s.plan) return { error: 'There is no meal plan yet.' };
          const day = s.plan.days[input.dayIndex];
          if (!day) return { error: 'That day is not in the plan.' };
          const meal = day.meals.find((m) => m.slot === input.slot);
          if (!meal) return { error: `No ${input.slot} in that day.` };
          let ok = true;
          Store.mutate((st) => {
            if (input.recipeId) ok = setMeal(st.plan, input.dayIndex, meal.key, input.recipeId, st.profile, st.targets);
            else swapMeal(st.plan, input.dayIndex, meal.key, st.profile, st.targets);
          });
          if (!ok) return { error: 'Unknown recipeId — call list_recipes for valid ids.' };
          const newDay = Store.state.plan.days[input.dayIndex];
          const t = dayTotals(newDay);
          return {
            ok: true,
            day: { index: input.dayIndex, kcal: Math.round(t.kcal), protein: Math.round(t.p) },
            meals: newDay.meals.map((m) => `${m.slot}: ${(RECIPE_BY_ID[m.recipeId] || {}).name}`)
          };
        }

        case 'log_food': {
          const date = input.date || todayISO();
          const hit = searchFoods(input.query, 1)[0];
          if (!hit) return { error: `Nothing matched "${input.query}". Try a simpler term, or tell the user to add it as a custom food.` };
          const amount = Number(input.amount);
          const nutrition = entryNutrition(hit.kind, hit.id, amount);
          Store.addLogEntry(date, {
            kind: hit.kind, ref: hit.id, amount,
            meal: input.meal || 'snack',
            label: hit.kind === 'recipe' ? `${hit.name} × ${amount} serve${amount === 1 ? '' : 's'}` : `${hit.name}, ${Math.round(amount)} g`,
            nutrition
          });
          const totals = Store.dayTotals(date);
          return {
            ok: true,
            logged: hit.name,
            entry: { kcal: Math.round(nutrition.kcal), protein: Math.round(nutrition.p) },
            dayTotals: { kcal: Math.round(totals.kcal), protein: Math.round(totals.p), carbs: Math.round(totals.c), fat: Math.round(totals.fat) },
            remaining: s.targets ? {
              kcal: Math.round(s.targets.calories - totals.kcal),
              protein: Math.round(s.targets.protein - totals.p)
            } : null
          };
        }

        case 'generate_workout_plan': {
          Store.mutate((st) => { st.workoutPlan = generateWorkoutPlan(st.profile, st.targets); });
          const w = Store.state.workoutPlan;
          return {
            ok: true,
            daysPerWeek: w.daysPerWeek,
            sessions: w.sessions.map((x) => ({ name: x.name, exercises: x.exercises.map((e) => `${e.name} — ${e.sets}×${e.reps} @ ${e.rpe}`) })),
            cardio: w.cardio,
            progression: w.progression
          };
        }

        case 'build_grocery_list': {
          if (!s.plan) return { error: 'There is no meal plan to shop for yet.' };
          const days = clamp(Math.round(input.days || s.groceries.days || 7), 1, 14);
          const store = input.store || s.groceries.store || 'both';
          Store.mutate((st) => { st.groceries.days = days; st.groceries.store = store; });
          const list = buildGroceryList(Store.state.plan, {
            days, store, pantry: s.groceries.pantry, prices: s.groceries.prices
          });
          return {
            ok: true, days: list.days, store, approxCost: list.estimated, itemCount: list.itemCount,
            aisles: list.aisles.map((a) => ({
              department: a.aisle,
              items: a.items.map((i) => `${i.name} — need ${i.needLabel}, buy ${i.packs} × ${i.packLabel}`)
            }))
          };
        }

        default:
          return { error: 'Unknown tool: ' + name };
      }
    } catch (err) {
      console.error(err);
      return { error: String(err && err.message ? err.message : err) };
    }
  },

  systemPrompt() {
    const s = Store.state;
    const missing = missingProfileFields(s.profile);
    return [
      'You are the coach inside "Fuel", a personal health dashboard that runs entirely on the user\'s own laptop.',
      'The user lives in Newcastle, NSW, Australia and shops at Coles and Woolworths. Use metric units, Australian product names and AUD.',
      '',
      'What you can do: you have tools that read and WRITE the real application state. When the user asks for something actionable — new targets, a meal plan, a swap, logging food, a training week, a shopping list — call the tool and actually do it, then tell them briefly what changed. Do not describe a plan you have not created.',
      'Always call get_status before advice that depends on their numbers, unless you already called it this turn.',
      '',
      missing.length
        ? `Their profile is incomplete — still missing: ${missing.join(', ')}. Ask for the missing pieces conversationally, a couple at a time, then call update_profile.`
        : 'Their profile is complete, so lead with specifics rather than questions.',
      '',
      'Style: direct, warm, concrete. Short paragraphs and tight bullet lists. No preamble, no restating the question. Give one clear recommendation rather than a menu of options. Numbers where numbers help.',
      '',
      'Boundaries: you give general nutrition and training guidance, not medical advice. If they mention a diagnosed condition, medication, pregnancy, an eating disorder, or symptoms that sound clinical, say plainly that this needs their GP or an Accredited Practising Dietitian — and then help with what is safely in scope. Never set an intake below the app\'s calorie floor, and if they push for a very aggressive deficit, explain what it costs (muscle, adherence, energy) and offer the sustainable version.',
      '',
      `Today is ${prettyDate(todayISO())}.`
    ].join('\n');
  },

  /* One request to the Messages API, streamed. Returns the assembled content
     blocks plus stop_reason. onEvent gets ('text'|'thinking'|'tool', payload). */
  async callClaude(messages, onEvent, signal) {
    const cfg = Store.state.settings;
    const key = (cfg.apiKey || '').trim();
    const model = cfg.model || 'claude-opus-5';
    const base = (cfg.baseUrl || 'https://api.anthropic.com').replace(/\/+$/, '');

    const body = {
      model,
      max_tokens: 8000,
      stream: true,
      system: this.systemPrompt(),
      messages,
      tools: this.tools,
      output_config: { effort: cfg.effort || 'medium' }
    };
    if (cfg.thinking !== false) body.thinking = { type: 'adaptive', display: 'summarized' };

    const headers = {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      /* Required to call the API straight from a browser page rather than a server. */
      'anthropic-dangerous-direct-browser-access': 'true'
    };

    /* Server-side fallbacks keep the chat working if a safety classifier
       declines a turn. Retried without them if the account lacks the beta. */
    const wantsFallback = /^(claude-opus-5|claude-fable-5)$/.test(model);
    if (wantsFallback) {
      headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
      body.fallbacks = 'default';
    }

    let res = await fetch(base + '/v1/messages', {
      method: 'POST', headers, body: JSON.stringify(body), signal
    });

    if (!res.ok && res.status === 400 && wantsFallback) {
      const text = await res.text();
      if (/fallback|beta/i.test(text)) {
        delete headers['anthropic-beta'];
        delete body.fallbacks;
        res = await fetch(base + '/v1/messages', {
          method: 'POST', headers, body: JSON.stringify(body), signal
        });
      } else {
        throw new Error(this.explainError(res.status, text));
      }
    }

    if (!res.ok) {
      throw new Error(this.explainError(res.status, await res.text()));
    }

    return await this.readStream(res, onEvent);
  },

  async readStream(res, onEvent) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const blocks = [];
    let stopReason = null;
    let stopDetails = null;
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nl;
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;

        let ev;
        try { ev = JSON.parse(payload); } catch (e) { continue; }

        if (ev.type === 'content_block_start') {
          const cb = ev.content_block;
          blocks[ev.index] = cb.type === 'tool_use'
            ? { type: 'tool_use', id: cb.id, name: cb.name, input: {}, _json: '' }
            : Object.assign({}, cb);
          if (cb.type === 'tool_use') onEvent('tool_start', { name: cb.name });
        } else if (ev.type === 'content_block_delta') {
          const b = blocks[ev.index];
          if (!b) continue;
          const d = ev.delta;
          if (d.type === 'text_delta') {
            b.text = (b.text || '') + d.text;
            onEvent('text', d.text);
          } else if (d.type === 'thinking_delta') {
            b.thinking = (b.thinking || '') + d.thinking;
            onEvent('thinking', d.thinking);
          } else if (d.type === 'signature_delta') {
            b.signature = (b.signature || '') + d.signature;
          } else if (d.type === 'input_json_delta') {
            b._json += d.partial_json;
          }
        } else if (ev.type === 'content_block_stop') {
          const b = blocks[ev.index];
          if (b && b.type === 'tool_use') {
            try { b.input = b._json ? JSON.parse(b._json) : {}; } catch (e) { b.input = {}; }
            delete b._json;
          }
        } else if (ev.type === 'message_delta') {
          if (ev.delta && ev.delta.stop_reason) stopReason = ev.delta.stop_reason;
          if (ev.delta && ev.delta.stop_details) stopDetails = ev.delta.stop_details;
        } else if (ev.type === 'error') {
          throw new Error((ev.error && ev.error.message) || 'The API returned an error mid-response.');
        }
      }
    }

    return { content: blocks.filter(Boolean), stopReason, stopDetails };
  },

  explainError(status, text) {
    let detail = text;
    try {
      const parsed = JSON.parse(text);
      detail = (parsed.error && parsed.error.message) || text;
    } catch (e) { /* keep the raw text */ }
    if (status === 401) return 'That API key was rejected (401). Check it in Settings — it should start with "sk-ant-".';
    if (status === 429) return 'Rate limited (429). Wait a moment and try again.';
    if (status === 529 || status >= 500) return `The API is having trouble (${status}). Try again shortly.`;
    if (status === 403) return `Forbidden (403). ${detail}`;
    return `API error ${status}: ${detail}`;
  },

  /* Full turn: send the user's message, run any tools Claude calls, repeat
     until it stops asking for tools. `on` gets UI callbacks. */
  async send(userText, on) {
    const handlers = Object.assign({ onText() {}, onThinking() {}, onTool() {}, onDone() {} }, on || {});

    Store.mutate((s) => {
      s.chat.push({ role: 'user', content: [{ type: 'text', text: userText }] });
    }, { render: false });

    const history = () => Store.state.chat
      .slice(-40)
      .map((m) => ({ role: m.role, content: m.content }))
      .filter((m) => m.role === 'user' || m.role === 'assistant');

    for (let hop = 0; hop < 6; hop++) {
      const result = await this.callClaude(history(), (kind, payload) => {
        if (kind === 'text') handlers.onText(payload);
        else if (kind === 'thinking') handlers.onThinking(payload);
        else if (kind === 'tool_start') handlers.onTool(payload.name);
      });

      Store.mutate((s) => {
        s.chat.push({ role: 'assistant', mode: 'claude', content: result.content });
      }, { render: false });

      if (result.stopReason === 'refusal') {
        Store.mutate((s) => {
          s.chat.push({
            role: 'assistant', mode: 'claude',
            content: [{ type: 'text', text: 'I can\'t help with that one. If it is health-related and specific to you, your GP or an Accredited Practising Dietitian is the right call.' }]
          });
        });
        handlers.onDone();
        return;
      }

      const toolUses = result.content.filter((b) => b.type === 'tool_use');
      if (!toolUses.length) {
        Store.save();
        handlers.onDone();
        return;
      }

      const results = toolUses.map((tu) => {
        const out = this.runTool(tu.name, tu.input || {});
        return { type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(out) };
      });

      Store.mutate((s) => { s.chat.push({ role: 'user', hidden: true, content: results }); }, { render: false });
    }

    handlers.onDone();
  },

  clearChat() {
    Store.mutate((s) => { s.chat = []; s.intake = { step: 0, active: false }; });
  }
};

/* Shared food search used by the log view and the log_food tool. */
function searchFoods(query, limit) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  const scored = [];

  const consider = (kind, id, name, kcalLabel, extra) => {
    const n = name.toLowerCase();
    let score = -1;
    if (n === q) score = 100;
    else if (n.startsWith(q)) score = 80;
    else if (n.indexOf(q) !== -1) score = 60;
    else {
      const words = q.split(/\s+/).filter(Boolean);
      const hits = words.filter((w) => n.indexOf(w) !== -1).length;
      if (hits) score = 20 + hits * 10;
    }
    if (score > 0) scored.push(Object.assign({ kind, id, name, kcalLabel, score }, extra || {}));
  };

  Store.allFoods().forEach((f) => {
    consider('ingredient', f.id, f.name, `${Math.round(f.per100[0])} kcal / 100${f.unit === 'ml' ? 'ml' : 'g'}`, { unit: f.unit || 'g', eaG: f.eaG });
  });
  RECIPES.forEach((r) => {
    const n = recipeNutrition(r, 1);
    consider('recipe', r.id, r.name, `${Math.round(n.kcal)} kcal / serve`, {});
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit || 12);
}
