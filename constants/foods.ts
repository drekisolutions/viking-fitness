export interface CuratedFood {
  id: string;
  name: string;
  brand: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  glp1Friendly: boolean;
}

export const CURATED_FOODS: CuratedFood[] = [
  // ── GLP-1 Easy-Digest / Protein Shield Staples ──────────────────────────────
  { id: 'cf-1', name: 'Whey Protein Isolate Shake', brand: 'Generic', portion: '1 scoop + water', calories: 120, protein: 25, carbs: 2, fat: 1, glp1Friendly: true },
  { id: 'cf-2', name: 'Fairlife Core Power Shake', brand: 'Fairlife', portion: '1 bottle (14 oz)', calories: 170, protein: 26, carbs: 5, fat: 4.5, glp1Friendly: true },
  { id: 'cf-3', name: 'Fairlife Core Power Elite', brand: 'Fairlife', portion: '1 bottle (14 oz)', calories: 230, protein: 42, carbs: 7, fat: 3.5, glp1Friendly: true },
  { id: 'cf-4', name: '0% Nonfat Greek Yogurt', brand: 'Chobani / Fage', portion: '1 cup (227g)', calories: 130, protein: 23, carbs: 8, fat: 0, glp1Friendly: true },
  { id: 'cf-5', name: 'Low-Fat Cottage Cheese (2%)', brand: 'Good Culture', portion: '¾ cup (170g)', calories: 120, protein: 21, carbs: 4, fat: 3, glp1Friendly: true },
  { id: 'cf-6', name: 'Liquid Egg Whites', brand: 'Generic', portion: '1 cup (243g)', calories: 125, protein: 26, carbs: 2, fat: 0, glp1Friendly: true },
  { id: 'cf-7', name: 'Bone Broth + Collagen Peptides', brand: 'Kettle & Fire', portion: '1 cup + 1 scoop', calories: 90, protein: 20, carbs: 1, fat: 0, glp1Friendly: true },
  { id: 'cf-8', name: 'Light Tuna Pouch in Water', brand: 'StarKist', portion: '1 pouch (2.6 oz)', calories: 70, protein: 17, carbs: 0, fat: 0.5, glp1Friendly: true },
  { id: 'cf-9', name: 'Grilled Chicken Breast', brand: 'Generic', portion: '4 oz cooked', calories: 185, protein: 35, carbs: 0, fat: 4, glp1Friendly: true },
  { id: 'cf-10', name: 'Baked Cod / White Fish', brand: 'Generic', portion: '5 oz cooked', calories: 120, protein: 26, carbs: 0, fat: 1, glp1Friendly: true },
  { id: 'cf-11', name: 'Steamed Shrimp', brand: 'Generic', portion: '5 oz cooked', calories: 140, protein: 30, carbs: 0, fat: 1.5, glp1Friendly: true },
  { id: 'cf-12', name: 'Silken Tofu', brand: 'Mori-Nu', portion: '6 oz', calories: 95, protein: 12, carbs: 3, fat: 4, glp1Friendly: true },
  { id: 'cf-13', name: 'Shelled Edamame', brand: 'Generic', portion: '½ cup', calories: 95, protein: 9, carbs: 7, fat: 4, glp1Friendly: true },
  { id: 'cf-14', name: 'Deli Turkey Breast', brand: 'Oven Roasted', portion: '3 oz', calories: 90, protein: 18, carbs: 2, fat: 1, glp1Friendly: true },
  { id: 'cf-15', name: 'Hard-Boiled Eggs (2)', brand: 'Generic', portion: '2 large eggs', calories: 140, protein: 12, carbs: 1, fat: 10, glp1Friendly: true },
  { id: 'cf-16', name: 'Mashed Sweet Potato', brand: 'Generic', portion: '½ cup cooked', calories: 95, protein: 2, carbs: 22, fat: 0, glp1Friendly: true },

  // ── Everyday Warrior Staples ────────────────────────────────────────────────
  { id: 'cf-17', name: 'Whole Eggs (3)', brand: 'Generic', portion: '3 large eggs', calories: 215, protein: 19, carbs: 2, fat: 15, glp1Friendly: false },
  { id: 'cf-18', name: 'Grilled Chicken Breast (6 oz)', brand: 'Generic', portion: '6 oz cooked', calories: 280, protein: 52, carbs: 0, fat: 6, glp1Friendly: false },
  { id: 'cf-19', name: '93% Lean Ground Beef', brand: 'Generic', portion: '5 oz cooked', calories: 260, protein: 34, carbs: 0, fat: 13, glp1Friendly: false },
  { id: 'cf-20', name: '93% Lean Ground Turkey', brand: 'Generic', portion: '5 oz cooked', calories: 230, protein: 33, carbs: 0, fat: 10, glp1Friendly: false },
  { id: 'cf-21', name: 'Atlantic Salmon Fillet', brand: 'Generic', portion: '5 oz cooked', calories: 290, protein: 32, carbs: 0, fat: 18, glp1Friendly: false },
  { id: 'cf-22', name: 'Sirloin Steak', brand: 'Generic', portion: '6 oz cooked', calories: 310, protein: 46, carbs: 0, fat: 13, glp1Friendly: false },
  { id: 'cf-23', name: 'Ribeye Steak', brand: 'Generic', portion: '8 oz cooked', calories: 580, protein: 48, carbs: 0, fat: 42, glp1Friendly: false },
  { id: 'cf-24', name: 'Cooked White / Jasmine Rice', brand: 'Generic', portion: '1 cup', calories: 205, protein: 4, carbs: 45, fat: 0.5, glp1Friendly: false },
  { id: 'cf-25', name: 'Cooked Brown Rice', brand: 'Generic', portion: '1 cup', calories: 215, protein: 5, carbs: 45, fat: 1.8, glp1Friendly: false },
  { id: 'cf-26', name: 'Rolled Oats (Dry)', brand: 'Quaker', portion: '½ cup (40g)', calories: 150, protein: 5, carbs: 27, fat: 3, glp1Friendly: false },
  { id: 'cf-27', name: 'Medium Banana', brand: 'Fresh', portion: '1 medium', calories: 105, protein: 1, carbs: 27, fat: 0.4, glp1Friendly: true },
  { id: 'cf-28', name: 'Blueberries', brand: 'Fresh', portion: '1 cup', calories: 85, protein: 1, carbs: 21, fat: 0.5, glp1Friendly: true },
  { id: 'cf-29', name: 'Avocado (Half)', brand: 'Fresh', portion: '½ medium', calories: 120, protein: 1.5, carbs: 6, fat: 11, glp1Friendly: false },
  { id: 'cf-30', name: 'Extra Virgin Olive Oil', brand: 'Generic', portion: '1 tbsp', calories: 120, protein: 0, carbs: 0, fat: 14, glp1Friendly: false },
  { id: 'cf-31', name: 'Peanut Butter', brand: 'Natural', portion: '2 tbsp (32g)', calories: 190, protein: 7, carbs: 7, fat: 16, glp1Friendly: false },
  { id: 'cf-32', name: 'Sourdough Bread', brand: 'Bakery', portion: '2 slices', calories: 240, protein: 8, carbs: 48, fat: 1, glp1Friendly: false },
  { id: 'cf-33', name: 'Steamed Broccoli', brand: 'Fresh', portion: '2 cups', calories: 60, protein: 5, carbs: 12, fat: 0.5, glp1Friendly: true },
  { id: 'cf-34', name: 'Black Beans', brand: 'Generic', portion: '½ cup cooked', calories: 115, protein: 7.5, carbs: 20, fat: 0.5, glp1Friendly: false },
  { id: 'cf-35', name: 'Quinoa (Cooked)', brand: 'Generic', portion: '¾ cup', calories: 165, protein: 6, carbs: 29, fat: 2.5, glp1Friendly: false },
  { id: 'cf-36', name: 'Oikos Pro Yogurt Cup', brand: 'Dannon', portion: '1 cup (150g)', calories: 140, protein: 20, carbs: 8, fat: 3, glp1Friendly: true },
  { id: 'cf-37', name: 'Quest Protein Bar', brand: 'Quest', portion: '1 bar (60g)', calories: 190, protein: 21, carbs: 21, fat: 8, glp1Friendly: false },
  { id: 'cf-38', name: 'Seitan Strips', brand: 'Plant-Based', portion: '4 oz', calories: 150, protein: 28, carbs: 6, fat: 1.5, glp1Friendly: false },
  { id: 'cf-39', name: 'Firm Tofu', brand: 'Generic', portion: '6 oz', calories: 150, protein: 16, carbs: 3, fat: 9, glp1Friendly: false },
  { id: 'cf-40', name: 'Bacon Strips (3)', brand: 'Pork', portion: '3 cooked strips', calories: 130, protein: 9, carbs: 0, fat: 10, glp1Friendly: false },
];
