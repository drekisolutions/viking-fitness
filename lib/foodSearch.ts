import { CURATED_FOODS, type CuratedFood } from '@/constants/foods';

export interface FoodSearchResult {
  id: string;
  name: string;
  brand: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: 'curated' | 'openfoodfacts';
  glp1Friendly?: boolean;
}

function mapCurated(f: CuratedFood): FoodSearchResult {
  return {
    id: f.id,
    name: f.name,
    brand: f.brand,
    portion: f.portion,
    calories: f.calories,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    source: 'curated',
    glp1Friendly: f.glp1Friendly,
  };
}

function mapOffProduct(p: any): FoodSearchResult | null {
  const name = (p?.product_name || p?.generic_name || '').trim();
  if (!name) return null;

  const n = p?.nutriments ?? {};
  const hasServing = n['energy-kcal_serving'] != null || n.proteins_serving != null;

  const rawCal = hasServing ? n['energy-kcal_serving'] : n['energy-kcal_100g'];
  const rawPro = hasServing ? n.proteins_serving : n.proteins_100g;
  const rawCarb = hasServing ? n.carbohydrates_serving : n.carbohydrates_100g;
  const rawFat = hasServing ? n.fat_serving : n.fat_100g;

  const calories = Math.round(Number(rawCal) || 0);
  const protein = Math.round((Number(rawPro) || 0) * 10) / 10;
  const carbs = Math.round((Number(rawCarb) || 0) * 10) / 10;
  const fat = Math.round((Number(rawFat) || 0) * 10) / 10;

  if (calories <= 0 && protein <= 0 && carbs <= 0 && fat <= 0) return null;

  const portion = hasServing
    ? (p.serving_size ? String(p.serving_size) : '1 serving')
    : '100g';

  return {
    id: `off-${p.code || name}`,
    name,
    brand: (p.brands || 'Open Food Facts').split(',')[0].trim(),
    portion,
    calories,
    protein,
    carbs,
    fat,
    source: 'openfoodfacts',
  };
}

export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  const trimmed = query.trim().toLowerCase();
  const localMatches = (
    trimmed
      ? CURATED_FOODS.filter(
          (f) =>
            f.name.toLowerCase().includes(trimmed) ||
            f.brand.toLowerCase().includes(trimmed)
        )
      : CURATED_FOODS
  ).map(mapCurated);

  if (trimmed.length < 2) {
    return localMatches;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const url =
      `https://world.openfoodfacts.org/cgi/search.pl` +
      `?search_terms=${encodeURIComponent(trimmed)}&search_simple=1&action=process&json=1&page_size=12` +
      `&fields=code,product_name,generic_name,brands,serving_size,nutriments`;

    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return localMatches;
    const data = await res.json();
    const remote = Array.isArray(data?.products)
      ? (data.products.map(mapOffProduct).filter(Boolean) as FoodSearchResult[])
      : [];

    return [...localMatches, ...remote];
  } catch {
    // Graceful offline / timeout fallback to curated foods
    return localMatches;
  } finally {
    clearTimeout(timer);
  }
}

export async function lookupBarcode(barcode: string): Promise<FoodSearchResult | null> {
  const clean = barcode.replace(/[^0-9]/g, '');
  if (clean.length < 6) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(clean)}.json` +
        `?fields=code,product_name,generic_name,brands,serving_size,nutriments`,
      { signal: controller.signal }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.status !== 1 || !data?.product) return null;
    return mapOffProduct(data.product);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
