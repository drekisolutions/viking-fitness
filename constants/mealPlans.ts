// ─── Types ────────────────────────────────────────────────────────────────────

export interface MealItem {
  name: string;
  emoji: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealSlot {
  id: string;
  label: string;
  time: string;
  targetCalories: number;
  options: MealItem[]; // rotated by day-of-week
}

export interface MealPlanInfo {
  key: string;
  name: string;
  tagline: string;
  accentColor: string;
  description: string;
  mealsPerDay: number;
  macroSplit: string; // "P-C-F" display
  tips: string[];
  focusFoods: string[];
  avoidFoods: string[];
  isGlp1?: boolean;
  glp1Note?: string;
  slots: MealSlot[];
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Returns a rotating meal option based on current day */
export function getTodaysMeal(slot: MealSlot): MealItem {
  const idx = new Date().getDay() % slot.options.length;
  return slot.options[idx];
}

export function getDayMeals(plan: MealPlanInfo): { slot: MealSlot; meal: MealItem }[] {
  return plan.slots.map((slot) => ({ slot, meal: getTodaysMeal(slot) }));
}

// ─── Plan Data ────────────────────────────────────────────────────────────────

export const MEAL_PLANS: Record<string, MealPlanInfo> = {

  // ── Balanced ───────────────────────────────────────────────────────────────
  balanced: {
    key: 'balanced',
    name: 'Balanced',
    tagline: 'The Warrior\'s Foundation',
    accentColor: '#4BA3FF',
    description: 'A sustainable, well-rounded approach with equal attention to protein, carbs, and healthy fats. Ideal for long-term performance and overall health.',
    mealsPerDay: 3,
    macroSplit: '30P · 40C · 30F',
    tips: [
      'Eat every 4–5 hours to keep energy stable',
      'Fill half your plate with colorful vegetables',
      'Choose whole grains over refined carbs',
      'Include a protein source at every meal',
      'Stay hydrated — aim for 8 glasses of water daily',
    ],
    focusFoods: ['Chicken breast', 'Brown rice', 'Oatmeal', 'Sweet potato', 'Eggs', 'Greek yogurt', 'Salmon', 'Broccoli', 'Avocado', 'Berries'],
    avoidFoods: ['Processed snacks', 'Sugary drinks', 'Fast food', 'Excessive alcohol'],
    slots: [
      {
        id: 'breakfast', label: 'Breakfast', time: '7:00 AM', targetCalories: 500,
        options: [
          { name: 'Eggs & Oatmeal Bowl', emoji: '🍳', portion: '2 eggs + 1 cup oats', calories: 490, protein: 28, carbs: 58, fat: 12 },
          { name: 'Greek Yogurt Parfait', emoji: '🫙', portion: '1 cup yogurt + granola + berries', calories: 480, protein: 25, carbs: 62, fat: 10 },
          { name: 'Whole Grain Toast & Eggs', emoji: '🍞', portion: '2 slices toast + 3 eggs', calories: 510, protein: 30, carbs: 50, fat: 14 },
          { name: 'Protein Smoothie', emoji: '🥤', portion: '1 scoop protein + banana + milk', calories: 460, protein: 34, carbs: 56, fat: 8 },
          { name: 'Avocado Toast & Eggs', emoji: '🥑', portion: '2 slices toast + ½ avocado + 2 eggs', calories: 520, protein: 24, carbs: 44, fat: 24 },
          { name: 'Cottage Cheese & Fruit', emoji: '🫐', portion: '1 cup cottage cheese + mixed fruit', calories: 440, protein: 30, carbs: 50, fat: 8 },
          { name: 'Overnight Oats', emoji: '🥣', portion: '1 cup oats + milk + banana', calories: 470, protein: 18, carbs: 72, fat: 10 },
        ],
      },
      {
        id: 'lunch', label: 'Lunch', time: '12:00 PM', targetCalories: 650,
        options: [
          { name: 'Grilled Chicken Bowl', emoji: '🍗', portion: '6oz chicken + rice + veggies', calories: 640, protein: 48, carbs: 62, fat: 14 },
          { name: 'Turkey & Veggie Wrap', emoji: '🌯', portion: '4oz turkey + whole wheat wrap', calories: 580, protein: 40, carbs: 56, fat: 14 },
          { name: 'Salmon & Quinoa', emoji: '🐟', portion: '5oz salmon + ¾ cup quinoa', calories: 660, protein: 45, carbs: 52, fat: 20 },
          { name: 'Lean Beef Stir-Fry', emoji: '🥩', portion: '5oz beef + rice + mixed veggies', calories: 680, protein: 44, carbs: 64, fat: 18 },
          { name: 'Tuna Salad Plate', emoji: '🥗', portion: 'Large mixed greens + 5oz tuna', calories: 550, protein: 42, carbs: 30, fat: 18 },
          { name: 'Chicken Caesar Salad', emoji: '🥗', portion: '6oz chicken + romaine + dressing', calories: 610, protein: 48, carbs: 22, fat: 28 },
          { name: 'Ground Turkey Rice Bowl', emoji: '🍚', portion: '5oz turkey + brown rice + beans', calories: 670, protein: 46, carbs: 68, fat: 16 },
        ],
      },
      {
        id: 'dinner', label: 'Dinner', time: '7:00 PM', targetCalories: 700,
        options: [
          { name: 'Baked Salmon & Veggies', emoji: '🐟', portion: '6oz salmon + roasted sweet potato', calories: 680, protein: 46, carbs: 50, fat: 24 },
          { name: 'Grilled Steak & Asparagus', emoji: '🥩', portion: '6oz sirloin + asparagus + potato', calories: 720, protein: 52, carbs: 38, fat: 28 },
          { name: 'Chicken Pasta', emoji: '🍝', portion: '5oz chicken + 1.5 cups pasta', calories: 700, protein: 50, carbs: 72, fat: 16 },
          { name: 'Shrimp & Rice', emoji: '🍤', portion: '8oz shrimp + 1 cup rice + broccoli', calories: 650, protein: 48, carbs: 70, fat: 10 },
          { name: 'Turkey Meatballs & Zucchini Noodles', emoji: '🍜', portion: '5oz turkey + zucchini noodles', calories: 580, protein: 42, carbs: 28, fat: 26 },
          { name: 'Chicken & Sweet Potato', emoji: '🍠', portion: '6oz chicken + sweet potato + salad', calories: 660, protein: 50, carbs: 54, fat: 14 },
          { name: 'White Fish Tacos', emoji: '🌮', portion: '2 corn tortillas + 6oz cod + slaw', calories: 640, protein: 44, carbs: 58, fat: 18 },
        ],
      },
    ],
  },

  // ── High Protein ───────────────────────────────────────────────────────────
  'high-protein': {
    key: 'high-protein',
    name: 'High Protein',
    tagline: 'Forge Muscle, Incinerate Fat',
    accentColor: '#D6A756',
    description: 'Maximum muscle preservation and growth. Protein at every meal keeps you full, supports recovery, and fuels intense training sessions.',
    mealsPerDay: 3,
    macroSplit: '40P · 35C · 25F',
    tips: [
      'Target 1g of protein per pound of body weight',
      'Spread protein across all meals — don\'t stack it',
      'Eat within 30–60 min of training',
      'Leucine-rich foods (whey, chicken, eggs) trigger muscle synthesis',
      'Casein protein before bed reduces overnight muscle breakdown',
    ],
    focusFoods: ['Chicken breast', 'Whey protein', 'Egg whites', 'Greek yogurt', 'Tuna', 'Lean beef', 'Cod', 'Turkey', 'Cottage cheese', 'Shrimp'],
    avoidFoods: ['High-fat dairy', 'Fried foods', 'White bread', 'Candy', 'Sugary protein bars'],
    slots: [
      {
        id: 'breakfast', label: 'Breakfast', time: '7:00 AM', targetCalories: 550,
        options: [
          { name: 'Egg White Scramble', emoji: '🍳', portion: '6 egg whites + 1 whole egg + oats', calories: 520, protein: 46, carbs: 44, fat: 8 },
          { name: 'High-Protein Pancakes', emoji: '🥞', portion: '2 protein pancakes + Greek yogurt', calories: 540, protein: 44, carbs: 48, fat: 12 },
          { name: 'Cottage Cheese Bowl', emoji: '🫙', portion: '1.5 cups cottage cheese + berries + granola', calories: 500, protein: 42, carbs: 46, fat: 10 },
          { name: 'Protein Oats', emoji: '🥣', portion: '1 cup oats + 1 scoop whey + nut butter', calories: 560, protein: 40, carbs: 56, fat: 14 },
          { name: 'Chicken & Egg Bowl', emoji: '🐔', portion: '3oz chicken + 3 eggs + rice cakes', calories: 530, protein: 50, carbs: 30, fat: 16 },
          { name: 'Greek Yogurt Protein Bowl', emoji: '🫐', portion: '2 cups Greek yogurt + protein + berries', calories: 480, protein: 48, carbs: 38, fat: 8 },
          { name: 'Smoked Salmon & Eggs', emoji: '🐟', portion: '3oz salmon + 2 eggs + rice cake', calories: 510, protein: 44, carbs: 22, fat: 22 },
        ],
      },
      {
        id: 'lunch', label: 'Lunch', time: '12:00 PM', targetCalories: 700,
        options: [
          { name: 'Chicken & Rice Power Bowl', emoji: '🍗', portion: '8oz chicken + 1 cup rice + broccoli', calories: 700, protein: 64, carbs: 62, fat: 12 },
          { name: 'Tuna & Sweet Potato', emoji: '🐟', portion: '8oz tuna + sweet potato + greens', calories: 660, protein: 60, carbs: 58, fat: 10 },
          { name: 'Lean Beef & Quinoa', emoji: '🥩', portion: '6oz 93% lean beef + ¾ cup quinoa', calories: 720, protein: 58, carbs: 50, fat: 22 },
          { name: 'Turkey Meatball Bowl', emoji: '🍝', portion: '8oz turkey meatballs + pasta + marinara', calories: 680, protein: 56, carbs: 62, fat: 16 },
          { name: 'Shrimp Stir-Fry', emoji: '🍤', portion: '10oz shrimp + rice + vegetables', calories: 640, protein: 58, carbs: 60, fat: 10 },
          { name: 'Bison Burger Bowl', emoji: '🍔', portion: '6oz bison + sweet potato + greens', calories: 700, protein: 56, carbs: 46, fat: 24 },
          { name: 'Cod & Rice', emoji: '🐟', portion: '8oz cod + 1 cup rice + asparagus', calories: 620, protein: 62, carbs: 56, fat: 8 },
        ],
      },
      {
        id: 'dinner', label: 'Dinner', time: '7:00 PM', targetCalories: 700,
        options: [
          { name: 'Grilled Chicken & Veggies', emoji: '🍗', portion: '8oz chicken breast + roasted veggies', calories: 680, protein: 64, carbs: 32, fat: 16 },
          { name: 'Salmon & Broccoli', emoji: '🐟', portion: '7oz salmon + 2 cups broccoli + rice', calories: 700, protein: 58, carbs: 44, fat: 22 },
          { name: 'Steak & Asparagus', emoji: '🥩', portion: '7oz sirloin + asparagus + cottage cheese', calories: 720, protein: 66, carbs: 16, fat: 28 },
          { name: 'Turkey Chili', emoji: '🍲', portion: '8oz turkey + beans + peppers', calories: 660, protein: 60, carbs: 50, fat: 14 },
          { name: 'Tilapia & Quinoa', emoji: '🐟', portion: '8oz tilapia + ¾ cup quinoa + greens', calories: 640, protein: 64, carbs: 50, fat: 12 },
          { name: 'Lean Beef & Zoodles', emoji: '🍜', portion: '7oz 93% beef + zucchini noodles', calories: 660, protein: 58, carbs: 20, fat: 30 },
          { name: 'Egg White Omelette', emoji: '🍳', portion: '8 egg whites + veggies + feta + rice', calories: 580, protein: 54, carbs: 42, fat: 14 },
        ],
      },
    ],
  },

  // ── Keto ───────────────────────────────────────────────────────────────────
  keto: {
    key: 'keto',
    name: 'Keto',
    tagline: 'Fat-Fueled Warrior',
    accentColor: '#FF8C42',
    description: 'Eliminate carbs to shift your body into ketosis — a metabolic state where fat becomes your primary fuel. Powerful for fat loss and mental clarity.',
    mealsPerDay: 3,
    macroSplit: '30P · 5C · 65F',
    tips: [
      'Keep net carbs under 25g per day to stay in ketosis',
      'Increase sodium, potassium, and magnesium to avoid keto flu',
      'Fat is your fuel — don\'t fear it',
      'Test ketones with strips in the first 2 weeks',
      'The first 1–2 weeks are the hardest — push through',
    ],
    focusFoods: ['Ribeye steak', 'Bacon', 'Salmon', 'Eggs', 'Avocado', 'Butter', 'Heavy cream', 'Cheese', 'Nuts', 'Leafy greens'],
    avoidFoods: ['All grains', 'Bread & pasta', 'Sugar', 'Fruit (most)', 'Starchy vegetables', 'Beer & wine', 'Processed low-fat foods'],
    slots: [
      {
        id: 'breakfast', label: 'Breakfast', time: '8:00 AM', targetCalories: 600,
        options: [
          { name: 'Bacon & Eggs', emoji: '🥓', portion: '4 strips bacon + 3 eggs + avocado', calories: 640, protein: 34, carbs: 4, fat: 54 },
          { name: 'Keto Omelette', emoji: '🍳', portion: '3 eggs + cheese + spinach + bacon', calories: 580, protein: 36, carbs: 4, fat: 46 },
          { name: 'Smoked Salmon & Avocado', emoji: '🐟', portion: '4oz salmon + 1 avocado + cream cheese', calories: 560, protein: 32, carbs: 8, fat: 44 },
          { name: 'Keto Yogurt Bowl', emoji: '🫙', portion: 'Full-fat Greek yogurt + nuts + seeds', calories: 520, protein: 22, carbs: 10, fat: 42 },
          { name: 'Butter Coffee & Eggs', emoji: '☕', portion: 'Bulletproof coffee + 3 eggs + cheese', calories: 600, protein: 24, carbs: 2, fat: 54 },
          { name: 'Sausage & Egg Scramble', emoji: '🌭', portion: '2 sausage links + 3 eggs + peppers', calories: 620, protein: 38, carbs: 6, fat: 50 },
          { name: 'Avocado Egg Cups', emoji: '🥑', portion: '2 avocado halves + baked eggs + bacon', calories: 560, protein: 28, carbs: 8, fat: 46 },
        ],
      },
      {
        id: 'lunch', label: 'Lunch', time: '1:00 PM', targetCalories: 700,
        options: [
          { name: 'Bacon Cheeseburger Salad', emoji: '🥗', portion: '6oz beef patty + cheese + greens + olive oil', calories: 720, protein: 46, carbs: 6, fat: 56 },
          { name: 'Chicken Caesar (No Croutons)', emoji: '🍗', portion: '6oz chicken + romaine + dressing + parmesan', calories: 680, protein: 50, carbs: 6, fat: 50 },
          { name: 'Ribeye & Asparagus', emoji: '🥩', portion: '6oz ribeye + asparagus + butter', calories: 740, protein: 48, carbs: 6, fat: 58 },
          { name: 'Tuna-Avocado Bowl', emoji: '🐟', portion: '6oz tuna + 1 avocado + olive oil + greens', calories: 660, protein: 46, carbs: 8, fat: 48 },
          { name: 'BLT Lettuce Wraps', emoji: '🥬', portion: 'Bacon + turkey + lettuce + mayo', calories: 640, protein: 36, carbs: 4, fat: 52 },
          { name: 'Salmon & Spinach Salad', emoji: '🐟', portion: '6oz salmon + spinach + feta + olive oil', calories: 680, protein: 44, carbs: 8, fat: 52 },
          { name: 'Keto Steak Bowl', emoji: '🥩', portion: '6oz sirloin + cauliflower rice + butter', calories: 700, protein: 50, carbs: 8, fat: 52 },
        ],
      },
      {
        id: 'dinner', label: 'Dinner', time: '7:00 PM', targetCalories: 750,
        options: [
          { name: 'Lamb Chops & Roasted Veggies', emoji: '🍖', portion: '8oz lamb + zucchini + olive oil', calories: 780, protein: 54, carbs: 8, fat: 60 },
          { name: 'Pork Belly & Greens', emoji: '🥩', portion: '6oz pork belly + leafy greens + butter', calories: 760, protein: 40, carbs: 4, fat: 64 },
          { name: 'Salmon & Cauliflower Mash', emoji: '🐟', portion: '7oz salmon + cauliflower + cream + butter', calories: 720, protein: 50, carbs: 10, fat: 52 },
          { name: 'Chicken Thighs & Broccoli', emoji: '🍗', portion: '8oz chicken thighs + broccoli + cheese', calories: 700, protein: 52, carbs: 8, fat: 50 },
          { name: 'Beef Short Ribs', emoji: '🍖', portion: '6oz short ribs + Brussels sprouts', calories: 780, protein: 44, carbs: 8, fat: 62 },
          { name: 'Shrimp Scampi (Zoodles)', emoji: '🍤', portion: '8oz shrimp + zucchini noodles + butter + garlic', calories: 640, protein: 46, carbs: 8, fat: 48 },
          { name: 'Duck Breast & Asparagus', emoji: '🦆', portion: '6oz duck + asparagus + olive oil', calories: 740, protein: 48, carbs: 6, fat: 56 },
        ],
      },
    ],
  },

  // ── Mediterranean ──────────────────────────────────────────────────────────
  mediterranean: {
    key: 'mediterranean',
    name: 'Mediterranean',
    tagline: 'Ancient Warriors Ate This Way',
    accentColor: '#4CAF50',
    description: 'One of the most researched diets on earth. Rich in olive oil, fish, legumes, and whole grains — proven to reduce heart disease, inflammation, and body fat.',
    mealsPerDay: 3,
    macroSplit: '20P · 45C · 35F',
    tips: [
      'Olive oil is your primary fat — use it generously',
      'Eat fish at least 2–3 times per week',
      'Legumes 3–4 times per week for fiber and plant protein',
      'Wine is optional — maximum 1 glass with dinner',
      'Eat slowly and with others when possible',
    ],
    focusFoods: ['Olive oil', 'Salmon', 'Sardines', 'Chickpeas', 'Lentils', 'Whole wheat', 'Tomatoes', 'Feta cheese', 'Olives', 'Almonds', 'Hummus'],
    avoidFoods: ['Red meat (limit)', 'Processed meats', 'Refined sugar', 'Processed oils', 'Butter (use olive oil instead)'],
    slots: [
      {
        id: 'breakfast', label: 'Breakfast', time: '7:30 AM', targetCalories: 450,
        options: [
          { name: 'Greek Yogurt & Honey', emoji: '🫙', portion: '1 cup yogurt + walnuts + honey + berries', calories: 440, protein: 18, carbs: 54, fat: 16 },
          { name: 'Whole Grain Toast & Olive Oil', emoji: '🍞', portion: '2 slices + olive oil + tomato + feta', calories: 420, protein: 14, carbs: 52, fat: 18 },
          { name: 'Shakshuka', emoji: '🍳', portion: '2 eggs in tomato-pepper sauce + pita', calories: 460, protein: 22, carbs: 48, fat: 18 },
          { name: 'Smoked Salmon Toast', emoji: '🐟', portion: '2oz salmon + whole grain toast + cucumber', calories: 430, protein: 24, carbs: 46, fat: 14 },
          { name: 'Fig & Almond Oatmeal', emoji: '🥣', portion: '1 cup oats + figs + almonds + olive oil drizzle', calories: 450, protein: 12, carbs: 64, fat: 16 },
          { name: 'Halloumi & Veggie Pan', emoji: '🧀', portion: '2oz halloumi + tomatoes + eggs', calories: 460, protein: 26, carbs: 16, fat: 32 },
          { name: 'Labneh & Veggie Plate', emoji: '🥒', portion: 'Labneh + cucumber + olives + pita', calories: 420, protein: 14, carbs: 44, fat: 20 },
        ],
      },
      {
        id: 'lunch', label: 'Lunch', time: '12:30 PM', targetCalories: 650,
        options: [
          { name: 'Grilled Fish & Tabbouleh', emoji: '🐟', portion: '6oz sea bass + tabbouleh + hummus', calories: 640, protein: 46, carbs: 56, fat: 22 },
          { name: 'Lentil Soup & Bread', emoji: '🍲', portion: 'Large bowl lentil soup + whole grain bread', calories: 580, protein: 28, carbs: 86, fat: 12 },
          { name: 'Greek Salad & Chicken', emoji: '🥗', portion: '5oz chicken + large Greek salad + feta', calories: 620, protein: 44, carbs: 30, fat: 32 },
          { name: 'Falafel Wrap', emoji: '🌯', portion: '4 falafel + whole wheat wrap + hummus + veggies', calories: 660, protein: 24, carbs: 78, fat: 26 },
          { name: 'Salmon Niçoise Salad', emoji: '🐟', portion: '5oz salmon + egg + olives + green beans', calories: 600, protein: 44, carbs: 30, fat: 34 },
          { name: 'Chicken Shawarma Bowl', emoji: '🍗', portion: '5oz chicken + tabbouleh + hummus', calories: 640, protein: 42, carbs: 58, fat: 20 },
          { name: 'Sardine & Veggie Plate', emoji: '🐟', portion: '4oz sardines + roasted veggies + grain bread', calories: 580, protein: 36, carbs: 52, fat: 26 },
        ],
      },
      {
        id: 'dinner', label: 'Dinner', time: '7:30 PM', targetCalories: 700,
        options: [
          { name: 'Baked Sea Bass & Vegetables', emoji: '🐟', portion: '7oz sea bass + roasted Mediterranean veggies', calories: 680, protein: 50, carbs: 40, fat: 30 },
          { name: 'Lamb & Vegetable Stew', emoji: '🍖', portion: '5oz lamb + chickpeas + tomatoes + herbs', calories: 720, protein: 44, carbs: 54, fat: 28 },
          { name: 'Grilled Octopus & Lentils', emoji: '🐙', portion: '6oz octopus + lentils + olive oil', calories: 640, protein: 46, carbs: 52, fat: 16 },
          { name: 'Pasta Puttanesca', emoji: '🍝', portion: '1.5 cups whole wheat pasta + anchovy sauce', calories: 700, protein: 28, carbs: 92, fat: 22 },
          { name: 'Stuffed Bell Peppers', emoji: '🫑', portion: '2 peppers + ground lamb + couscous + herbs', calories: 680, protein: 40, carbs: 64, fat: 24 },
          { name: 'Grilled Shrimp & Orzo', emoji: '🍤', portion: '8oz shrimp + orzo + lemon + olive oil', calories: 660, protein: 46, carbs: 68, fat: 16 },
          { name: 'Chicken & Chickpea Tagine', emoji: '🍗', portion: '6oz chicken + chickpeas + tomatoes + spices', calories: 700, protein: 50, carbs: 60, fat: 18 },
        ],
      },
    ],
  },

  // ── Carnivore ──────────────────────────────────────────────────────────────
  carnivore: {
    key: 'carnivore',
    name: 'Carnivore',
    tagline: 'Pure Apex Predator Mode',
    accentColor: '#C62828',
    description: 'Animal products only. Eliminates all plant foods, which some find dramatically reduces inflammation, digestive issues, and autoimmune symptoms. Extreme but effective for some warriors.',
    mealsPerDay: 2,
    macroSplit: '45P · 0C · 55F',
    tips: [
      'Eat when hungry — carnivore naturally reduces meal frequency',
      'Fatty cuts satisfy longer than lean cuts',
      'Organ meats like liver are nutritional powerhouses',
      'Salt your food generously — you won\'t retain water without carbs',
      'Expect a 2–4 week adaptation period with possible fatigue',
    ],
    focusFoods: ['Ribeye', 'Ground beef (80/20)', 'Liver', 'Lamb', 'Pork belly', 'Eggs', 'Butter', 'Bacon', 'Salmon', 'Sardines'],
    avoidFoods: ['All plants', 'Vegetables', 'Fruits', 'Grains', 'Legumes', 'Dairy (optional — some include)', 'Any processed food'],
    slots: [
      {
        id: 'meal1', label: 'First Meal', time: '10:00 AM', targetCalories: 900,
        options: [
          { name: 'Ribeye Steak & Eggs', emoji: '🥩', portion: '10oz ribeye + 3 eggs cooked in butter', calories: 920, protein: 72, carbs: 0, fat: 72 },
          { name: 'Ground Beef Patties', emoji: '🍔', portion: '12oz 80/20 ground beef patties', calories: 880, protein: 68, carbs: 0, fat: 68 },
          { name: 'Pork Belly & Bacon', emoji: '🥓', portion: '8oz pork belly + 4 strips bacon + 3 eggs', calories: 960, protein: 66, carbs: 0, fat: 78 },
          { name: 'Lamb Chops & Butter', emoji: '🍖', portion: '10oz lamb chops + 2 tbsp butter', calories: 900, protein: 68, carbs: 0, fat: 70 },
          { name: 'Salmon & Butter', emoji: '🐟', portion: '10oz salmon + 3 eggs cooked in butter', calories: 860, protein: 76, carbs: 0, fat: 60 },
          { name: 'Beef Short Ribs', emoji: '🍖', portion: '10oz beef short ribs + bone broth', calories: 920, protein: 62, carbs: 0, fat: 74 },
          { name: 'Duck & Egg Scramble', emoji: '🦆', portion: '8oz duck breast + 4 egg scramble', calories: 880, protein: 68, carbs: 0, fat: 66 },
        ],
      },
      {
        id: 'meal2', label: 'Second Meal', time: '4:00 PM', targetCalories: 900,
        options: [
          { name: 'NY Strip & Liver', emoji: '🥩', portion: '8oz strip + 4oz beef liver + butter', calories: 920, protein: 78, carbs: 4, fat: 66 },
          { name: 'Brisket', emoji: '🍖', portion: '12oz beef brisket', calories: 880, protein: 72, carbs: 0, fat: 64 },
          { name: 'Pork Ribs', emoji: '🍖', portion: '12oz pork spare ribs', calories: 940, protein: 68, carbs: 0, fat: 74 },
          { name: 'Tri-Tip Roast', emoji: '🥩', portion: '10oz tri-tip + bone marrow', calories: 900, protein: 74, carbs: 0, fat: 68 },
          { name: 'Lamb Shoulder', emoji: '🍖', portion: '10oz braised lamb shoulder + tallow', calories: 880, protein: 66, carbs: 0, fat: 70 },
          { name: 'Sardines & Eggs', emoji: '🐟', portion: '2 cans sardines in oil + 4 eggs', calories: 820, protein: 72, carbs: 0, fat: 58 },
          { name: 'T-Bone Steak', emoji: '🥩', portion: '12oz T-bone + butter sauce', calories: 960, protein: 78, carbs: 0, fat: 72 },
        ],
      },
    ],
  },

  // ── Vegan ──────────────────────────────────────────────────────────────────
  vegan: {
    key: 'vegan',
    name: 'Vegan',
    tagline: 'Plant-Powered Warrior',
    accentColor: '#66BB6A',
    description: 'No animal products. Requires strategic planning to hit protein targets, but when done right delivers excellent health outcomes and powerful anti-inflammatory benefits.',
    mealsPerDay: 3,
    macroSplit: '20P · 55C · 25F',
    tips: [
      'Combine plant proteins to get all essential amino acids',
      'Supplement with B12, Vitamin D, Omega-3 (algae-based), and Iron',
      'Seitan, tofu, and tempeh are your protein workhorses',
      'Edamame, lentils, and black beans are excellent protein sources',
      'Nutritional yeast adds protein, B vitamins, and a cheesy flavor',
    ],
    focusFoods: ['Tofu', 'Tempeh', 'Seitan', 'Lentils', 'Black beans', 'Edamame', 'Chickpeas', 'Quinoa', 'Hemp seeds', 'Pea protein'],
    avoidFoods: ['All animal products', 'Processed vegan junk food', 'White refined carbs', 'Added sugars', 'Excessive oils'],
    slots: [
      {
        id: 'breakfast', label: 'Breakfast', time: '7:00 AM', targetCalories: 480,
        options: [
          { name: 'Tofu Scramble', emoji: '🍳', portion: '8oz firm tofu + veggies + nutritional yeast', calories: 460, protein: 32, carbs: 28, fat: 22 },
          { name: 'Protein Smoothie Bowl', emoji: '🫐', portion: '2 scoops pea protein + banana + hemp seeds', calories: 480, protein: 36, carbs: 54, fat: 12 },
          { name: 'Tempeh Bacon & Toast', emoji: '🥓', portion: '3oz tempeh bacon + whole grain toast + avocado', calories: 500, protein: 28, carbs: 50, fat: 22 },
          { name: 'Overnight Oats & Chia', emoji: '🥣', portion: '1 cup oats + chia + soy milk + berries', calories: 460, protein: 18, carbs: 68, fat: 12 },
          { name: 'Edamame Rice Bowl', emoji: '🍚', portion: '1 cup edamame + brown rice + sesame', calories: 480, protein: 26, carbs: 64, fat: 12 },
          { name: 'Chickpea & Veggie Hash', emoji: '🥔', portion: '1 cup chickpeas + potatoes + peppers', calories: 470, protein: 22, carbs: 72, fat: 10 },
          { name: 'Hemp Seed Yogurt Parfait', emoji: '🫙', portion: 'Coconut yogurt + hemp seeds + granola + fruit', calories: 460, protein: 20, carbs: 60, fat: 16 },
        ],
      },
      {
        id: 'lunch', label: 'Lunch', time: '12:30 PM', targetCalories: 620,
        options: [
          { name: 'Seitan Power Bowl', emoji: '🍚', portion: '6oz seitan + brown rice + roasted veggies', calories: 640, protein: 48, carbs: 72, fat: 14 },
          { name: 'Lentil & Veggie Soup', emoji: '🍲', portion: 'Large bowl red lentil soup + whole grain bread', calories: 580, protein: 28, carbs: 88, fat: 10 },
          { name: 'Tempeh Buddha Bowl', emoji: '🥣', portion: '5oz tempeh + quinoa + tahini + greens', calories: 620, protein: 40, carbs: 60, fat: 24 },
          { name: 'Black Bean Burrito', emoji: '🌯', portion: '1 cup black beans + brown rice + whole wheat wrap', calories: 660, protein: 28, carbs: 98, fat: 14 },
          { name: 'Tofu Stir-Fry & Rice', emoji: '🍜', portion: '7oz tofu + mixed veggies + brown rice + soy sauce', calories: 600, protein: 36, carbs: 74, fat: 16 },
          { name: 'Chickpea Tuna Salad', emoji: '🥗', portion: '1.5 cups mashed chickpeas + celery + vegan mayo', calories: 580, protein: 24, carbs: 68, fat: 22 },
          { name: 'Pea Protein Pasta', emoji: '🍝', portion: '2 cups pasta + lentil bolognese', calories: 640, protein: 36, carbs: 92, fat: 10 },
        ],
      },
      {
        id: 'dinner', label: 'Dinner', time: '7:00 PM', targetCalories: 640,
        options: [
          { name: 'Baked Tofu & Sweet Potato', emoji: '🍠', portion: '8oz baked tofu + sweet potato + greens', calories: 620, protein: 38, carbs: 72, fat: 18 },
          { name: 'Lentil Dal & Naan', emoji: '🍛', portion: 'Red lentil dal + brown rice + whole grain naan', calories: 660, protein: 30, carbs: 100, fat: 12 },
          { name: 'Seitan & Vegetable Stew', emoji: '🍲', portion: '6oz seitan + root vegetables + herbs', calories: 620, protein: 44, carbs: 60, fat: 12 },
          { name: 'Tempeh Tacos', emoji: '🌮', portion: '3 corn tacos + crumbled tempeh + salsa + avocado', calories: 660, protein: 36, carbs: 72, fat: 24 },
          { name: 'Black Bean Enchiladas', emoji: '🫔', portion: '2 corn tortillas + black beans + cashew cheese', calories: 640, protein: 26, carbs: 84, fat: 22 },
          { name: 'Grilled Portobello & Quinoa', emoji: '🍄', portion: '2 large portobellos + ¾ cup quinoa + tahini', calories: 580, protein: 24, carbs: 70, fat: 22 },
          { name: 'Tofu & Bok Choy Stir-Fry', emoji: '🥬', portion: '8oz tofu + bok choy + brown rice + ginger', calories: 580, protein: 36, carbs: 68, fat: 16 },
        ],
      },
    ],
  },

  // ── GLP-1 ─────────────────────────────────────────────────────────────────
  glp1: {
    key: 'glp1',
    name: 'GLP-1 Support',
    tagline: 'Ozempic · Wegovy · Mounjaro · Zepbound',
    accentColor: '#AB47BC',
    description: 'Optimized for GLP-1 receptor agonists. Small, frequent meals designed to maximize nutrition within reduced appetite windows while preventing muscle loss during rapid weight reduction.',
    mealsPerDay: 5,
    macroSplit: '42P · 28C · 30F',
    isGlp1: true,
    glp1Note: 'This plan is designed to complement your GLP-1 medication, not replace medical guidance. Always follow your prescriber\'s recommendations. Prioritize protein at every meal to preserve muscle mass during weight loss.',
    tips: [
      'Eat 5 small meals instead of 3 large — your appetite demands it',
      'PROTEIN FIRST at every single meal — muscle loss is your enemy',
      'Eat slowly and stop at the first sign of fullness',
      'Avoid high-fat meals (fried food, greasy food) — can cause severe nausea',
      'Stay hydrated — sip water throughout the day, not during meals',
      'Avoid carbonated drinks — gas and bloating are amplified',
      'Wait 30 min after waking before eating',
      'Never skip meals even if not hungry — muscle wastes without fuel',
    ],
    focusFoods: [
      'Egg whites', 'Greek yogurt', 'Cottage cheese', 'Chicken breast',
      'White fish (cod, tilapia)', 'Shrimp', 'Tofu', 'Soft cooked vegetables',
      'Protein shakes', 'Bone broth', 'Mashed sweet potato', 'Soft fruit',
    ],
    avoidFoods: [
      'Fried food (nausea trigger)',
      'High-fat meals (slow digestion)',
      'Carbonated drinks (gas/bloating)',
      'Alcohol (amplified effects on GLP-1)',
      'Large portions (override fullness signals)',
      'Processed sugar (blood sugar spikes)',
      'Greasy fast food',
      'Spicy food (can worsen nausea)',
    ],
    slots: [
      {
        id: 'breakfast', label: 'Breakfast', time: '8:00 AM', targetCalories: 240,
        options: [
          { name: 'Egg White Scramble', emoji: '🍳', portion: '4 egg whites + spinach + feta', calories: 220, protein: 26, carbs: 6, fat: 8 },
          { name: 'Greek Yogurt & Berries', emoji: '🫙', portion: '¾ cup 0% Greek yogurt + ½ cup berries', calories: 200, protein: 18, carbs: 24, fat: 2 },
          { name: 'Protein Shake', emoji: '🥤', portion: '1 scoop whey + water + banana (half)', calories: 220, protein: 24, carbs: 22, fat: 2 },
          { name: 'Soft Boiled Eggs', emoji: '🥚', portion: '2 whole eggs + 1 egg white + ½ slice toast', calories: 230, protein: 20, carbs: 12, fat: 12 },
          { name: 'Cottage Cheese', emoji: '🫙', portion: '¾ cup low-fat cottage cheese + peach slices', calories: 190, protein: 22, carbs: 14, fat: 4 },
          { name: 'Overnight Oats (Small)', emoji: '🥣', portion: '⅓ cup oats + protein powder + almond milk', calories: 240, protein: 22, carbs: 28, fat: 4 },
          { name: 'Salmon & Egg White', emoji: '🐟', portion: '2oz smoked salmon + 3 egg whites scrambled', calories: 210, protein: 28, carbs: 2, fat: 10 },
        ],
      },
      {
        id: 'mid_morning', label: 'Mid-Morning', time: '10:30 AM', targetCalories: 180,
        options: [
          { name: 'Protein Shake', emoji: '🥤', portion: '1 scoop isolate + water', calories: 130, protein: 25, carbs: 4, fat: 2 },
          { name: 'Cottage Cheese', emoji: '🫙', portion: '½ cup low-fat cottage cheese', calories: 110, protein: 14, carbs: 6, fat: 2 },
          { name: 'Hard-Boiled Eggs', emoji: '🥚', portion: '2 hard-boiled eggs', calories: 140, protein: 12, carbs: 0, fat: 10 },
          { name: 'Greek Yogurt', emoji: '🫙', portion: '½ cup 0% Greek yogurt + protein powder', calories: 150, protein: 20, carbs: 10, fat: 0 },
          { name: 'Tuna Packet', emoji: '🐟', portion: '1 packet (2.5oz) tuna + cucumber slices', calories: 120, protein: 20, carbs: 4, fat: 2 },
          { name: 'String Cheese & Turkey', emoji: '🧀', portion: '1 string cheese + 2oz deli turkey', calories: 160, protein: 18, carbs: 2, fat: 8 },
          { name: 'Edamame (Small)', emoji: '🫘', portion: '½ cup shelled edamame', calories: 120, protein: 11, carbs: 9, fat: 5 },
        ],
      },
      {
        id: 'lunch', label: 'Lunch', time: '12:30 PM', targetCalories: 280,
        options: [
          { name: 'Grilled Chicken & Veggies', emoji: '🍗', portion: '4oz chicken breast + soft steamed veggies', calories: 270, protein: 36, carbs: 14, fat: 8 },
          { name: 'White Fish & Mashed Potato (Small)', emoji: '🐟', portion: '4oz cod + ⅓ cup mashed sweet potato', calories: 260, protein: 32, carbs: 22, fat: 6 },
          { name: 'Shrimp & Quinoa', emoji: '🍤', portion: '4oz shrimp + ⅓ cup quinoa + soft veggies', calories: 280, protein: 30, carbs: 26, fat: 6 },
          { name: 'Turkey & Soft Veggies', emoji: '🦃', portion: '4oz ground turkey + steamed zucchini + tomato', calories: 250, protein: 34, carbs: 12, fat: 8 },
          { name: 'Bone Broth Soup & Chicken', emoji: '🍲', portion: '2 cups bone broth soup + 3oz chicken', calories: 240, protein: 30, carbs: 10, fat: 6 },
          { name: 'Soft Tofu Bowl', emoji: '🥣', portion: '6oz silken tofu + edamame + soft veggies', calories: 260, protein: 24, carbs: 16, fat: 12 },
          { name: 'Egg White & Veggie Bowl', emoji: '🍳', portion: '5 egg whites + soft roasted vegetables', calories: 240, protein: 28, carbs: 14, fat: 4 },
        ],
      },
      {
        id: 'afternoon', label: 'Afternoon', time: '3:30 PM', targetCalories: 180,
        options: [
          { name: 'Protein Shake', emoji: '🥤', portion: '1 scoop isolate + water', calories: 130, protein: 25, carbs: 4, fat: 2 },
          { name: 'Greek Yogurt', emoji: '🫙', portion: '½ cup Greek yogurt + berries', calories: 150, protein: 12, carbs: 18, fat: 2 },
          { name: 'Chicken & Cucumber', emoji: '🥒', portion: '2oz chicken breast + cucumber slices', calories: 120, protein: 18, carbs: 4, fat: 3 },
          { name: 'Tuna & Crackers', emoji: '🐟', portion: '2oz tuna + 4 rice crackers', calories: 160, protein: 18, carbs: 16, fat: 2 },
          { name: 'Cottage Cheese & Fruit', emoji: '🫐', portion: '½ cup cottage cheese + ½ cup soft fruit', calories: 160, protein: 14, carbs: 18, fat: 2 },
          { name: 'Bone Broth', emoji: '🍵', portion: '1 cup bone broth + collagen peptides', calories: 80, protein: 14, carbs: 2, fat: 1 },
          { name: 'Soft-Boiled Egg & Avocado', emoji: '🥚', portion: '1 egg + ¼ avocado', calories: 150, protein: 8, carbs: 4, fat: 12 },
        ],
      },
      {
        id: 'dinner', label: 'Dinner', time: '6:30 PM', targetCalories: 300,
        options: [
          { name: 'Baked Salmon (Small)', emoji: '🐟', portion: '4oz salmon + soft steamed broccoli', calories: 290, protein: 34, carbs: 8, fat: 14 },
          { name: 'Chicken & Soft Mashed Sweet Potato', emoji: '🍠', portion: '4oz chicken + ⅓ cup sweet potato mash', calories: 280, protein: 34, carbs: 22, fat: 6 },
          { name: 'Ground Turkey Soft Taco Bowl', emoji: '🌮', portion: '4oz turkey + ¼ cup black beans + soft veggies', calories: 300, protein: 36, carbs: 20, fat: 8 },
          { name: 'Shrimp & Zucchini Noodles', emoji: '🍤', portion: '5oz shrimp + 1 cup zoodles + light olive oil', calories: 270, protein: 32, carbs: 10, fat: 10 },
          { name: 'Tilapia & Quinoa', emoji: '🐟', portion: '4oz tilapia + ¼ cup quinoa + steamed spinach', calories: 280, protein: 32, carbs: 22, fat: 8 },
          { name: 'Soft Egg & Veggie Bake', emoji: '🍳', portion: '3 whole eggs + soft roasted veggies + feta', calories: 290, protein: 22, carbs: 10, fat: 18 },
          { name: 'Bone Broth Chicken Soup', emoji: '🍲', portion: '3oz shredded chicken + bone broth + soft vegetables', calories: 240, protein: 30, carbs: 14, fat: 6 },
        ],
      },
    ],
  },
};

export const PLAN_KEYS = Object.keys(MEAL_PLANS) as (keyof typeof MEAL_PLANS)[];

export function getPlanInfo(key: string): MealPlanInfo {
  return MEAL_PLANS[key] ?? MEAL_PLANS['balanced'];
}
