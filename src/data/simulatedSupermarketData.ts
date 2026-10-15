import { RawCSVRecord } from '../types';

/**
 * Realistic Simulated Supermarket Inventory Dataset for Indian Retail Context
 * Contains >= 32 products across 3 store branches in Bengaluru with authentic INR pricing.
 * Includes:
 * - High-risk phantom stockouts (Chocolate biscuits, Butter, Cooking Oil, Atta)
 * - Sales slowdowns
 * - Extended inactivity gaps
 * - Promoted fast movers with zero checkout
 * - Normal healthy sellers
 * - Naturally slow-moving items (specialty spices, baking powder)
 */
export const SIMULATED_SUPERMARKET_CSV: string = `date,store_id,store_location,product_id,product_name,category,units_sold,recorded_closing_stock,selling_price,average_daily_sales,recent_daily_sales,days_since_last_sale,promotion_status
2026-10-14,STR_KOR_01,Koramangala Superstore,PRD_101,Amul Butter 500g,Dairy,0,18,285.00,8.5,0.0,3,true
2026-10-14,STR_KOR_01,Koramangala Superstore,PRD_102,Cadbury Dairy Milk Silk 150g,Snacks,0,24,175.00,9.0,0.0,4,true
2026-10-14,STR_KOR_01,Koramangala Superstore,PRD_103,Fortune Sunlite Sunflower Oil 1L,Staples,0,32,155.00,14.0,0.0,3,false
2026-10-14,STR_KOR_01,Koramangala Superstore,PRD_104,Britannia Good Day Butter 200g,Snacks,1,16,45.00,8.0,1.0,4,false
2026-10-14,STR_KOR_01,Koramangala Superstore,PRD_105,Tata Tea Gold 500g,Beverages,0,14,340.00,6.5,0.0,5,false
2026-10-14,STR_KOR_01,Koramangala Superstore,PRD_106,Aashirvaad Superior MP Sharbati Atta 5kg,Staples,2,28,345.00,15.0,2.0,2,false
2026-10-14,STR_KOR_01,Koramangala Superstore,PRD_107,Dettol Liquid Handwash 750ml,Personal Care,0,20,195.00,5.0,0.0,4,false
2026-10-14,STR_KOR_01,Koramangala Superstore,PRD_108,Maggi 2-Minute Masala Noodles 560g,Snacks,19,42,110.00,18.0,19.0,0,false
2026-10-14,STR_KOR_01,Koramangala Superstore,PRD_109,Tata Salt Iodized 1kg,Staples,22,65,28.00,20.0,22.0,0,false
2026-10-14,STR_KOR_01,Koramangala Superstore,PRD_110,Amul Taaza Homogenised Milk 1L,Dairy,26,45,74.00,25.0,26.0,0,false
2026-10-14,STR_KOR_01,Koramangala Superstore,PRD_111,Surf Excel Matic Front Load 1kg,Household,0,15,245.00,4.5,0.0,6,true
2026-10-14,STR_KOR_01,Koramangala Superstore,PRD_112,Colgate Strong Teeth Toothpaste 300g,Personal Care,8,30,145.00,9.0,8.0,0,false
2026-10-14,STR_KOR_01,Koramangala Superstore,PRD_113,Haldiram Nagpur Aloo Bhujia 400g,Snacks,11,25,120.00,10.0,11.0,0,false
2026-10-14,STR_KOR_01,Koramangala Superstore,PRD_114,Organic Tattva Cardamom Powder 50g,Spices & Gourmet,0,4,220.00,0.2,0.0,12,false
2026-10-14,STR_KOR_01,Koramangala Superstore,PRD_115,Nescafe Classic Instant Coffee Jar 200g,Beverages,0,11,625.00,4.0,0.0,5,true
2026-10-14,STR_IND_02,Indiranagar Hypermarket,PRD_201,Amul Malai Paneer 200g,Dairy,0,22,95.00,12.0,0.0,3,true
2026-10-14,STR_IND_02,Indiranagar Hypermarket,PRD_202,Dark Fantasy Choco Fills 300g,Snacks,0,17,140.00,7.5,0.0,4,true
2026-10-14,STR_IND_02,Indiranagar Hypermarket,PRD_203,Saffola Gold Pro Healthy Oil 1L,Staples,1,26,180.00,11.0,1.0,3,false
2026-10-14,STR_IND_02,Indiranagar Hypermarket,PRD_204,Ariel Complete Detergent Powder 2kg,Household,0,19,410.00,6.0,0.0,5,false
2026-10-14,STR_IND_02,Indiranagar Hypermarket,PRD_205,Lay's India's Magic Masala 115g,Snacks,16,38,50.00,15.0,16.0,0,false
2026-10-14,STR_IND_02,Indiranagar Hypermarket,PRD_206,Tata Sampann Toor Dal 1kg,Staples,12,40,195.00,13.0,12.0,0,false
2026-10-14,STR_IND_02,Indiranagar Hypermarket,PRD_207,Head & Shoulders Cool Menthol Shampoo 650ml,Personal Care,0,12,560.00,3.5,0.0,7,false
2026-10-14,STR_IND_02,Indiranagar Hypermarket,PRD_208,Vim Dishwash Gel Lemon 750ml,Household,7,28,165.00,8.0,7.0,0,false
2026-10-14,STR_IND_02,Indiranagar Hypermarket,PRD_209,Real Fruit Power Mixed Fruit 1L,Beverages,0,14,130.00,5.5,0.0,4,true
2026-10-14,STR_IND_02,Indiranagar Hypermarket,PRD_210,Weikfield Baking Powder 100g,Baking & Desserts,0,5,38.00,0.3,0.0,9,false
2026-10-14,STR_WHT_03,Whitefield Flagship,PRD_301,Nandini Pasteurised Toned Milk 1L,Dairy,32,50,46.00,30.0,32.0,0,false
2026-10-14,STR_WHT_03,Whitefield Flagship,PRD_302,Oreo Vanilla Creme Biscuit 300g,Snacks,0,21,90.00,10.5,0.0,4,true
2026-10-14,STR_WHT_03,Whitefield Flagship,PRD_303,Kellogg's Corn Flakes 875g,Breakfast & Cereals,1,18,360.00,7.0,1.0,4,false
2026-10-14,STR_WHT_03,Whitefield Flagship,PRD_304,Comfort After Wash Morning Fresh 860ml,Household,0,13,235.00,4.0,0.0,6,false
2026-10-14,STR_WHT_03,Whitefield Flagship,PRD_305,Quaker Rolled Oats 1kg,Breakfast & Cereals,0,16,199.00,6.0,0.0,5,true
2026-10-14,STR_WHT_03,Whitefield Flagship,PRD_306,Harpic Power Plus Toilet Cleaner 1L,Household,14,36,215.00,12.0,14.0,0,false
2026-10-14,STR_WHT_03,Whitefield Flagship,PRD_307,Himalaya Purifying Neem Face Wash 300ml,Personal Care,0,14,299.00,5.0,0.0,5,false
2026-10-14,STR_WHT_03,Whitefield Flagship,PRD_308,Horlicks Classic Malt Health Drink 1kg,Beverages,5,22,460.00,6.0,5.0,0,false
2026-10-14,STR_WHT_03,Whitefield Flagship,PRD_309,Kissan Fresh Tomato Ketchup 1kg,Staples,8,25,145.00,8.0,8.0,0,false
2026-10-14,STR_WHT_03,Whitefield Flagship,PRD_310,Catch Black Pepper Grinder 50g,Spices & Gourmet,0,3,115.00,0.4,0.0,8,false`;

/**
 * Returns raw CSV records array parsed from the simulated data string
 */
export function getSimulatedDataset(): RawCSVRecord[] {
  const lines = SIMULATED_SUPERMARKET_CSV.trim().split('\n');
  const headers = lines[0].split(',').map((h) => h.trim());
  
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const row: RawCSVRecord = {};
    headers.forEach((h, i) => {
      row[h] = values[i];
    });
    return row;
  });
}
