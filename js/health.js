/* health.js — body composition and energy maths.
 *
 * Every formula used here is named in the return value so the UI can show you
 * where a number came from. These are population estimates: useful for setting
 * a starting point and tracking a trend, not diagnostic.
 */

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary', factor: 1.2, hint: 'Desk job, little deliberate movement' },
  { id: 'light', label: 'Lightly active', factor: 1.375, hint: 'Light exercise 1–3 days, some walking' },
  { id: 'moderate', label: 'Moderately active', factor: 1.55, hint: 'Training 3–5 days a week' },
  { id: 'very', label: 'Very active', factor: 1.725, hint: 'Hard training 6–7 days, or on your feet all day' },
  { id: 'extreme', label: 'Extremely active', factor: 1.9, hint: 'Physical job plus daily training' }
];

const GOALS = [
  { id: 'cut', label: 'Lose fat', hint: 'Calorie deficit, protein held high' },
  { id: 'maintain', label: 'Maintain / recomp', hint: 'Eat at maintenance, train hard' },
  { id: 'gain', label: 'Build muscle', hint: 'Small surplus for lean gain' }
];

function activityFactor(id) {
  const a = ACTIVITY_LEVELS.find((x) => x.id === id);
  return a ? a.factor : 1.375;
}

/* ------------------------------- BMI ------------------------------- */

function bmi(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
}

function bmiCategory(value) {
  if (value == null) return { label: '—', tone: '' };
  if (value < 18.5) return { label: 'Underweight', tone: 'warn' };
  if (value < 25) return { label: 'Healthy range', tone: 'good' };
  if (value < 30) return { label: 'Overweight', tone: 'warn' };
  return { label: 'Obese', tone: 'warn' };
}

/* Weight range that puts BMI between 18.5 and 24.9. */
function healthyWeightRange(heightCm) {
  const m = heightCm / 100;
  return { min: 18.5 * m * m, max: 24.9 * m * m };
}

/* --------------------------- Body fat ------------------------------ */

/* US Navy circumference method. All measurements in cm.
   Considerably more accurate than a BMI-derived estimate if you own a tape. */
function bodyFatNavy(profile) {
  const { sex, heightCm, neckCm, waistCm, hipCm } = profile;
  if (!heightCm || !neckCm || !waistCm) return null;
  if (sex === 'female' && !hipCm) return null;
  let bf;
  if (sex === 'female') {
    const x = waistCm + hipCm - neckCm;
    if (x <= 0) return null;
    bf = 495 / (1.29579 - 0.35004 * Math.log10(x) + 0.221 * Math.log10(heightCm)) - 450;
  } else {
    const x = waistCm - neckCm;
    if (x <= 0) return null;
    bf = 495 / (1.0324 - 0.19077 * Math.log10(x) + 0.15456 * Math.log10(heightCm)) - 450;
  }
  return bf > 2 && bf < 70 ? bf : null;
}

/* Deurenberg equation — a BMI-based fallback when there are no tape measures. */
function bodyFatDeurenberg(profile) {
  const b = bmi(profile.weightKg, profile.heightCm);
  if (!b || !profile.age) return null;
  const male = profile.sex === 'male' ? 1 : 0;
  const bf = 1.2 * b + 0.23 * profile.age - 10.8 * male - 5.4;
  return bf > 2 && bf < 70 ? bf : null;
}

/* Prefers what you measured, then tape, then BMI estimate. */
function bodyFat(profile) {
  if (profile.bodyFatPct) {
    return { pct: Number(profile.bodyFatPct), method: 'Your own measurement', quality: 'high' };
  }
  const navy = bodyFatNavy(profile);
  if (navy != null) return { pct: navy, method: 'US Navy tape method', quality: 'medium' };
  const deu = bodyFatDeurenberg(profile);
  if (deu != null) return { pct: deu, method: 'Deurenberg (BMI-based estimate)', quality: 'low' };
  return null;
}

/* Reference bands (ACE / ACSM style). */
function bodyFatCategory(pct, sex) {
  const bands = sex === 'female'
    ? [[13, 'Essential fat'], [20, 'Athletic'], [24, 'Fitness'], [31, 'Average'], [100, 'Above average']]
    : [[5, 'Essential fat'], [13, 'Athletic'], [17, 'Fitness'], [24, 'Average'], [100, 'Above average']];
  for (const [limit, label] of bands) {
    if (pct < limit) {
      const tone = label === 'Athletic' || label === 'Fitness' ? 'good' : label === 'Average' ? '' : 'warn';
      return { label, tone };
    }
  }
  return { label: '—', tone: '' };
}

function leanMass(profile) {
  const bf = bodyFat(profile);
  if (!bf || !profile.weightKg) return null;
  return profile.weightKg * (1 - bf.pct / 100);
}

/* Fat Free Mass Index — how much muscle you carry for your height.
   ~19 is a well-trained natural male, ~16 a well-trained natural female. */
function ffmi(profile) {
  const lm = leanMass(profile);
  if (!lm || !profile.heightCm) return null;
  const m = profile.heightCm / 100;
  const raw = lm / (m * m);
  return raw + 6.1 * (1.8 - m); // height-normalised
}

/* --------------------------- Energy -------------------------------- */

/* Mifflin-St Jeor — the default BMR equation in clinical practice. */
function bmrMifflin(profile) {
  const { weightKg, heightCm, age, sex } = profile;
  if (!weightKg || !heightCm || !age) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'female' ? base - 161 : base + 5;
}

/* Katch-McArdle — better when body fat is actually known, since it works off
   lean mass rather than total weight. */
function bmrKatch(profile) {
  const lm = leanMass(profile);
  if (!lm) return null;
  return 370 + 21.6 * lm;
}

function restingEnergy(profile) {
  const bf = bodyFat(profile);
  if (bf && (bf.quality === 'high' || bf.quality === 'medium')) {
    const k = bmrKatch(profile);
    if (k) return { kcal: k, method: 'Katch-McArdle (uses lean mass)' };
  }
  const m = bmrMifflin(profile);
  return m ? { kcal: m, method: 'Mifflin-St Jeor' } : null;
}

/* --------------------------- Targets ------------------------------- */

/* 1 kg of body fat ≈ 7700 kcal. A 0.5 kg/week change is ~550 kcal/day. */
const KCAL_PER_KG = 7700;

function computeTargets(profile) {
  const rest = restingEnergy(profile);
  if (!rest) return null;

  const tdee = rest.kcal * activityFactor(profile.activity);
  const goal = profile.goal || 'maintain';
  const rate = Number(profile.rateKgPerWeek || (goal === 'cut' ? 0.5 : goal === 'gain' ? 0.25 : 0));
  const dailyDelta = (rate * KCAL_PER_KG) / 7;

  let calories = tdee;
  if (goal === 'cut') calories = tdee - dailyDelta;
  if (goal === 'gain') calories = tdee + dailyDelta;

  /* Never program below a sensible floor: the higher of ~1.05× BMR or the
     conventional 1500 (male) / 1200 (female) kcal minimum. */
  const floor = Math.max(rest.kcal * 1.05, profile.sex === 'female' ? 1200 : 1500);
  const flooredAt = goal === 'cut' && calories < floor ? floor : null;
  if (flooredAt) calories = floor;

  const lm = leanMass(profile);
  const weight = profile.weightKg;

  /* Protein: 1.8–2.2 g per kg bodyweight, biased up in a deficit to protect
     muscle. If lean mass is known, use 2.2–2.6 g per kg of lean mass instead. */
  let protein;
  if (lm) protein = lm * (goal === 'cut' ? 2.5 : goal === 'gain' ? 2.2 : 2.3);
  else protein = weight * (goal === 'cut' ? 2.0 : goal === 'gain' ? 1.8 : 1.9);
  protein = clamp(protein, weight * 1.4, weight * 2.6);

  /* Fat: at least 0.7 g/kg for hormones, and at least 20% of calories. */
  let fat = Math.max(weight * 0.8, (calories * 0.22) / 9);

  /* Carbs get whatever energy is left. */
  let carbs = (calories - protein * 4 - fat * 9) / 4;
  if (carbs < weight * 1.0) {
    /* Very low carbs left — pull fat back a little rather than starve training. */
    carbs = weight * 1.0;
    fat = Math.max(weight * 0.6, (calories - protein * 4 - carbs * 4) / 9);
  }

  const fibre = Math.max(25, Math.round((calories / 1000) * 14));
  const waterL = round(clamp(weight * 0.035, 1.8, 4.5), 1);

  return {
    bmr: Math.round(rest.kcal),
    bmrMethod: rest.method,
    tdee: Math.round(tdee),
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
    fibre,
    waterL,
    goal,
    rateKgPerWeek: rate,
    flooredAt: flooredAt ? Math.round(flooredAt) : null,
    weeklyWeightChangeKg: goal === 'maintain' ? 0 : (goal === 'cut' ? -rate : rate),
    computedAt: new Date().toISOString()
  };
}

/* A full read of where the body is right now, for the dashboard + assistant. */
function bodySnapshot(profile) {
  const b = bmi(profile.weightKg, profile.heightCm);
  const bf = bodyFat(profile);
  const lm = leanMass(profile);
  const f = ffmi(profile);
  const range = profile.heightCm ? healthyWeightRange(profile.heightCm) : null;
  return {
    bmi: b == null ? null : round(b, 1),
    bmiCategory: bmiCategory(b),
    bodyFatPct: bf ? round(bf.pct, 1) : null,
    bodyFatMethod: bf ? bf.method : null,
    bodyFatQuality: bf ? bf.quality : null,
    bodyFatCategory: bf ? bodyFatCategory(bf.pct, profile.sex) : null,
    leanMassKg: lm == null ? null : round(lm, 1),
    fatMassKg: lm == null ? null : round(profile.weightKg - lm, 1),
    ffmi: f == null ? null : round(f, 1),
    healthyWeightRange: range ? { min: round(range.min, 1), max: round(range.max, 1) } : null
  };
}

/* Is the profile complete enough to compute targets? */
function missingProfileFields(profile) {
  const need = [
    ['sex', 'sex'],
    ['age', 'age'],
    ['heightCm', 'height'],
    ['weightKg', 'weight'],
    ['activity', 'activity level'],
    ['goal', 'goal']
  ];
  return need.filter(([k]) => !profile || !profile[k]).map(([, label]) => label);
}
