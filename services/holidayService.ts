// services/holidayService.ts

const API_KEY = '5a0ef601b220da0770d6195fe92530a217b7e7d389da74169c507706ba2d0108';
const ENDPOINT = 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getHoliDeInfo';

// Cache: 'YYYY-MM' -> Map<'YYYY-MM-DD', 'Holiday Name'>
const holidayCache = new Map<string, Map<string, string>>();

/**
 * Fetches public holidays for a given year and month from the data.go.kr API.
 * Results are cached in memory to avoid redundant API calls.
 * @param year The year to fetch holidays for.
 * @param month The month (1-12) to fetch holidays for.
 * @returns A Map where keys are 'YYYY-MM-DD' strings and values are holiday names.
 */
export async function getHolidaysForMonth(year: number, month: number): Promise<Map<string, string>> {
    const monthStr = String(month).padStart(2, '0');
    const cacheKey = `${year}-${monthStr}`;

    if (holidayCache.has(cacheKey)) {
        return holidayCache.get(cacheKey)!;
    }

    const url = `${ENDPOINT}?solYear=${year}&solMonth=${monthStr}&ServiceKey=${API_KEY}&_type=json`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API call failed with status ${response.status}`);
        }
        const data = await response.json();
        
        const header = data?.response?.header;
        if (header && header.resultCode !== '00') {
             console.error(`API Error: ${header.resultCode} - ${header.resultMsg}`);
             return new Map();
        }
        
        const items = data?.response?.body?.items?.item;
        const holidays = new Map<string, string>();

        if (items) {
            const itemsArray = Array.isArray(items) ? items : [items];
            itemsArray.forEach(item => {
                const dateName = item.dateName;
                const locdate = item.locdate?.toString();
                
                if (dateName && locdate && locdate.length === 8) {
                    const y = locdate.substring(0, 4);
                    const m = locdate.substring(4, 6);
                    const d = locdate.substring(6, 8);
                    const dateKey = `${y}-${m}-${d}`;
                    
                    if(holidays.has(dateKey)) {
                        holidays.set(dateKey, `${holidays.get(dateKey)}, ${dateName}`);
                    } else {
                        holidays.set(dateKey, dateName);
                    }
                }
            });
        }

        holidayCache.set(cacheKey, holidays);
        return holidays;

    } catch (error) {
        console.error("Failed to fetch or parse holiday data:", error);
        // Fallback for CORS or network issues - try fetching with a proxy if available
        // This is a placeholder for a more robust solution like a backend proxy
        if (error instanceof TypeError) {
            console.warn("CORS issue suspected. In a real application, a backend proxy would be used.");
        }
        return new Map(); // Return empty map on error
    }
}
