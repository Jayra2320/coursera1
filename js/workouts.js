/* workouts.js — builds a weekly training split from days available, equipment
 * and experience. Movement-pattern based: the template asks for a "horizontal
 * push", the library supplies the best version you can actually do with a
 * gym membership, a set of dumbbells, or nothing at all. */

const EXERCISES = {
  squat: [
    { n: 'Back squat', eq: 'gym' }, { n: 'Goblet squat', eq: 'home' }, { n: 'Bodyweight squat (tempo 3-1-1)', eq: 'none' }
  ],
  hinge: [
    { n: 'Romanian deadlift', eq: 'gym' }, { n: 'Dumbbell Romanian deadlift', eq: 'home' }, { n: 'Single-leg hip hinge', eq: 'none' }
  ],
  deadlift: [
    { n: 'Conventional deadlift', eq: 'gym' }, { n: 'Dumbbell deadlift', eq: 'home' }, { n: 'Glute bridge (single leg)', eq: 'none' }
  ],
  lunge: [
    { n: 'Walking lunge', eq: 'gym' }, { n: 'Dumbbell split squat', eq: 'home' }, { n: 'Reverse lunge', eq: 'none' }
  ],
  quad: [
    { n: 'Leg press', eq: 'gym' }, { n: 'Bulgarian split squat', eq: 'home' }, { n: 'Wall sit', eq: 'none' }
  ],
  hamstring: [
    { n: 'Seated leg curl', eq: 'gym' }, { n: 'Nordic curl (assisted)', eq: 'home' }, { n: 'Nordic curl (assisted)', eq: 'none' }
  ],
  push_h: [
    { n: 'Barbell bench press', eq: 'gym' }, { n: 'Dumbbell floor press', eq: 'home' }, { n: 'Push-up (feet elevated)', eq: 'none' }
  ],
  push_v: [
    { n: 'Overhead press', eq: 'gym' }, { n: 'Dumbbell shoulder press', eq: 'home' }, { n: 'Pike push-up', eq: 'none' }
  ],
  chest_iso: [
    { n: 'Cable fly', eq: 'gym' }, { n: 'Dumbbell fly', eq: 'home' }, { n: 'Deficit push-up', eq: 'none' }
  ],
  pull_h: [
    { n: 'Seated cable row', eq: 'gym' }, { n: 'Dumbbell row', eq: 'home' }, { n: 'Inverted row (under a table)', eq: 'none' }
  ],
  pull_v: [
    { n: 'Lat pulldown', eq: 'gym' }, { n: 'Band pulldown', eq: 'home' }, { n: 'Chin-up / doorway row', eq: 'none' }
  ],
  back_iso: [
    { n: 'Face pull', eq: 'gym' }, { n: 'Band face pull', eq: 'home' }, { n: 'Prone Y-T-W raise', eq: 'none' }
  ],
  shoulder_lat: [
    { n: 'Cable lateral raise', eq: 'gym' }, { n: 'Dumbbell lateral raise', eq: 'home' }, { n: 'Band lateral raise', eq: 'none' }
  ],
  arms_bi: [
    { n: 'EZ-bar curl', eq: 'gym' }, { n: 'Dumbbell curl', eq: 'home' }, { n: 'Isometric towel curl', eq: 'none' }
  ],
  arms_tri: [
    { n: 'Cable triceps pushdown', eq: 'gym' }, { n: 'Overhead dumbbell extension', eq: 'home' }, { n: 'Close-grip push-up', eq: 'none' }
  ],
  core: [
    { n: 'Cable crunch', eq: 'gym' }, { n: 'Weighted plank', eq: 'home' }, { n: 'Hollow body hold', eq: 'none' }
  ],
  calf: [
    { n: 'Standing calf raise', eq: 'gym' }, { n: 'Dumbbell calf raise', eq: 'home' }, { n: 'Single-leg calf raise', eq: 'none' }
  ]
};

const SPLITS = {
  2: [
    { name: 'Full body A', patterns: ['squat', 'push_h', 'pull_h', 'hinge', 'shoulder_lat', 'core'] },
    { name: 'Full body B', patterns: ['deadlift', 'push_v', 'pull_v', 'lunge', 'arms_bi', 'core'] }
  ],
  3: [
    { name: 'Full body A', patterns: ['squat', 'push_h', 'pull_v', 'shoulder_lat', 'core'] },
    { name: 'Full body B', patterns: ['hinge', 'push_v', 'pull_h', 'arms_tri', 'calf'] },
    { name: 'Full body C', patterns: ['lunge', 'chest_iso', 'pull_v', 'arms_bi', 'core'] }
  ],
  4: [
    { name: 'Upper A (strength)', patterns: ['push_h', 'pull_v', 'push_v', 'pull_h', 'arms_tri', 'arms_bi'] },
    { name: 'Lower A (squat focus)', patterns: ['squat', 'hinge', 'quad', 'calf', 'core'] },
    { name: 'Upper B (volume)', patterns: ['push_v', 'pull_h', 'chest_iso', 'pull_v', 'shoulder_lat', 'back_iso'] },
    { name: 'Lower B (hinge focus)', patterns: ['deadlift', 'lunge', 'hamstring', 'calf', 'core'] }
  ],
  5: [
    { name: 'Upper (strength)', patterns: ['push_h', 'pull_v', 'push_v', 'pull_h', 'arms_bi'] },
    { name: 'Lower (squat focus)', patterns: ['squat', 'lunge', 'hamstring', 'calf', 'core'] },
    { name: 'Push', patterns: ['push_v', 'chest_iso', 'shoulder_lat', 'arms_tri', 'core'] },
    { name: 'Pull', patterns: ['pull_v', 'pull_h', 'back_iso', 'arms_bi'] },
    { name: 'Legs', patterns: ['deadlift', 'quad', 'hamstring', 'calf', 'core'] }
  ],
  6: [
    { name: 'Push A', patterns: ['push_h', 'push_v', 'chest_iso', 'arms_tri', 'shoulder_lat'] },
    { name: 'Pull A', patterns: ['pull_v', 'pull_h', 'back_iso', 'arms_bi'] },
    { name: 'Legs A', patterns: ['squat', 'lunge', 'hamstring', 'calf', 'core'] },
    { name: 'Push B', patterns: ['push_v', 'chest_iso', 'shoulder_lat', 'arms_tri', 'core'] },
    { name: 'Pull B', patterns: ['pull_h', 'pull_v', 'back_iso', 'arms_bi'] },
    { name: 'Legs B', patterns: ['deadlift', 'quad', 'hamstring', 'calf', 'core'] }
  ]
};

const COMPOUND = ['squat', 'hinge', 'deadlift', 'push_h', 'push_v', 'pull_h', 'pull_v', 'lunge', 'quad'];

function dose(pattern, experience, goal) {
  const compound = COMPOUND.indexOf(pattern) !== -1;
  if (experience === 'beginner') {
    return compound ? { sets: 3, reps: '8–10', rpe: 'RPE 7' } : { sets: 3, reps: '12–15', rpe: 'RPE 7–8' };
  }
  if (experience === 'advanced') {
    return compound
      ? { sets: goal === 'gain' ? 5 : 4, reps: goal === 'cut' ? '6–8' : '5–8', rpe: 'RPE 8–9' }
      : { sets: 4, reps: '10–15', rpe: 'RPE 9' };
  }
  return compound ? { sets: 4, reps: '6–10', rpe: 'RPE 8' } : { sets: 3, reps: '10–15', rpe: 'RPE 8–9' };
}

function exerciseFor(pattern, equipment) {
  const list = EXERCISES[pattern] || [];
  const exact = list.find((e) => e.eq === equipment);
  if (exact) return exact.n;
  /* Fall back down the equipment ladder: gym → home → bodyweight. */
  const order = equipment === 'gym' ? ['gym', 'home', 'none'] : equipment === 'home' ? ['home', 'none', 'gym'] : ['none', 'home', 'gym'];
  for (const eq of order) {
    const hit = list.find((e) => e.eq === eq);
    if (hit) return hit.n;
  }
  return pattern;
}

function cardioPrescription(goal, days) {
  if (goal === 'cut') {
    return {
      steps: '9,000–11,000 steps a day — this does more for a deficit than any single cardio session',
      sessions: days >= 5
        ? '1 × 20 min easy zone 2 (walk the Bathers Way, ride the Fernleigh Track) on a rest day'
        : '2 × 25–30 min zone 2, kept easy enough to hold a conversation'
    };
  }
  if (goal === 'gain') {
    return {
      steps: '7,000–8,000 steps a day',
      sessions: '1 × 20 min easy cardio for recovery and appetite; avoid long hard sessions that eat into the surplus'
    };
  }
  return {
    steps: '8,000–10,000 steps a day',
    sessions: '2 × 25 min zone 2, or one swim / surf and one walk'
  };
}

function generateWorkoutPlan(profile, targets) {
  const days = clamp(Number(profile.workoutDays) || 4, 2, 6);
  const equipment = profile.equipment || 'gym';
  const experience = profile.experience || 'beginner';
  const goal = (targets && targets.goal) || profile.goal || 'maintain';
  const template = SPLITS[days];

  const sessions = template.map((s) => ({
    name: s.name,
    exercises: s.patterns.map((p) => {
      const d = dose(p, experience, goal);
      return { name: exerciseFor(p, equipment), pattern: p, sets: d.sets, reps: d.reps, rpe: d.rpe };
    })
  }));

  const progression = experience === 'beginner'
    ? 'Add 2.5 kg (lower body) or 1–2.5 kg (upper body) to a lift whenever you finish every set at the top of the rep range with good form. If you miss twice in a row, drop 10% and build back.'
    : experience === 'advanced'
      ? 'Run 4 weeks of accumulation (add a set or ~2.5% load per week), then a deload week at 60% volume. Track e1RM on the main lifts and let that, not soreness, tell you if it is working.'
      : 'Double progression: stay at the same weight until you hit the top of the rep range on every set, then add the smallest available increment and start again at the bottom.';

  return {
    createdAt: new Date().toISOString(),
    daysPerWeek: days,
    equipment,
    experience,
    goal,
    sessions,
    cardio: cardioPrescription(goal, days),
    progression,
    warmup: '5 min easy cardio, then 2 ramp-up sets of the first exercise at 50% and 75% of your working weight.',
    notes: profile.injuries ? `You noted: "${profile.injuries}". Swap anything that provokes it for a pain-free variation of the same pattern, and get it looked at properly.` : ''
  };
}

/* Which sessions land on which weekday, spreading rest days sensibly. */
const WEEKDAY_LAYOUTS = {
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6]
};

function weeklySchedule(plan) {
  const layout = WEEKDAY_LAYOUTS[plan.daysPerWeek] || WEEKDAY_LAYOUTS[4];
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const week = names.map((n) => ({ day: n, session: null }));
  layout.forEach((dayIdx, i) => { week[dayIdx].session = plan.sessions[i] || null; });
  return week;
}
