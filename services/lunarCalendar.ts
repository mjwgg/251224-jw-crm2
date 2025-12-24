import { LUNAR_CALENDAR_DATA } from './lunarCalendarData';

/**
 * 양력/음력 변환 결과에 대한 인터페이스
 */
export interface LunarResult {
    year: number;
    month: number;
    day: number;
    isLeap: boolean;
}

export interface SolarResult {
    year: number;
    month: number;
    day: number;
}

/**
 * 외부 라이브러리 없이 양력과 음력을 상호 변환하는 클래스입니다.
 * services/lunarCalendarData.ts의 데이터를 사용합니다.
 */
export class KoreanLunarCalendar {
    private MIN_YEAR = 1900;
    private MAX_YEAR = 2100;

    // Base date for calculation: Solar January 31, 1900 is Lunar January 1, 1900.
    private SOLAR_BASE_DATE = new Date(1900, 0, 31);

    private getLunarYearData(lunarYear: number): number {
        return LUNAR_CALENDAR_DATA[lunarYear - this.MIN_YEAR];
    }

    private getLeapMonth(lunarYear: number): number {
        return this.getLunarYearData(lunarYear) & 0xf;
    }

    private isLeapMonthBig(lunarYear: number): boolean {
        return (this.getLunarYearData(lunarYear) & 0x10000) !== 0;
    }

    private getDaysInLunarMonth(lunarYear: number, lunarMonth: number): number {
        const data = this.getLunarYearData(lunarYear);
        return (data & (0x8000 >> (lunarMonth - 1))) ? 30 : 29;
    }

    /**
     * 양력 날짜를 음력 날짜로 변환합니다.
     * @param year 양력 연도
     * @param month 양력 월
     * @param day 양력 일
     * @returns 변환된 음력 날짜 객체
     */
    public solarToLunar(year: number, month: number, day: number): LunarResult {
        const targetDate = new Date(year, month - 1, day);
        const timeDiff = targetDate.getTime() - this.SOLAR_BASE_DATE.getTime();
        let daysOffset = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        let lunarYear = this.MIN_YEAR;
        let lunarMonth = 1;
        let lunarDay = 1;
        let isLeap = false;

        while (true) {
            let daysInYear = 0;
            const leapMonth = this.getLeapMonth(lunarYear);
            for (let i = 1; i <= 12; i++) {
                daysInYear += this.getDaysInLunarMonth(lunarYear, i);
            }
            if (leapMonth) {
                daysInYear += this.isLeapMonthBig(lunarYear) ? 30 : 29;
            }

            if (daysOffset < daysInYear) {
                break;
            }
            daysOffset -= daysInYear;
            lunarYear++;
        }
        
        const leapMonth = this.getLeapMonth(lunarYear);
        for (let m = 1; m <= 12; m++) {
            // Check for leap month first if it occurs before the regular month
            if (leapMonth > 0 && leapMonth === m) {
                const daysInLeapMonth = this.isLeapMonthBig(lunarYear) ? 30 : 29;
                if (daysOffset < daysInLeapMonth) {
                    lunarMonth = m;
                    lunarDay = daysOffset + 1;
                    isLeap = true;
                    return { year: lunarYear, month: lunarMonth, day: lunarDay, isLeap };
                }
                daysOffset -= daysInLeapMonth;
            }

            const daysInMonth = this.getDaysInLunarMonth(lunarYear, m);
            if (daysOffset < daysInMonth) {
                lunarMonth = m;
                lunarDay = daysOffset + 1;
                isLeap = false;
                return { year: lunarYear, month: lunarMonth, day: lunarDay, isLeap };
            }
            daysOffset -= daysInMonth;
        }

        // Should not be reached if data is correct
        return { year: lunarYear, month: 12, day: daysOffset + 1, isLeap: false };
    }

    /**
     * 음력 날짜를 양력 날짜로 변환합니다.
     * @param year 음력 연도
     * @param month 음력 월
     * @param day 음력 일
     * @param isLeap 윤달 여부 (기본값: false)
     * @returns 변환된 양력 날짜 객체 또는 null (유효하지 않은 날짜)
     */
    public lunarToSolar(year: number, month: number, day: number, isLeap: boolean = false): SolarResult | null {
        if (year < this.MIN_YEAR || year > this.MAX_YEAR) return null;

        const leapMonth = this.getLeapMonth(year);
        if (isLeap && leapMonth !== month) return null; // Invalid leap month requested

        let daysOffset = 0;

        // Add days for all years before the target year
        for (let y = this.MIN_YEAR; y < year; y++) {
            // Sum of days in 12 months
            for (let i = 1; i <= 12; i++) {
                daysOffset += this.getDaysInLunarMonth(y, i);
            }
            // Add days for leap month if it exists
            const leap = this.getLeapMonth(y);
            if (leap) {
                daysOffset += this.isLeapMonthBig(y) ? 30 : 29;
            }
        }

        // Add days for all months before the target month in the target year
        for (let m = 1; m < month; m++) {
            daysOffset += this.getDaysInLunarMonth(year, m);
            // Add leap month days if it's between the counted months
            if (leapMonth > 0 && leapMonth === m) {
                daysOffset += this.isLeapMonthBig(year) ? 30 : 29;
            }
        }

        // If the target month is a leap month, add the days of the normal month first
        if (isLeap) {
            daysOffset += this.getDaysInLunarMonth(year, month);
        }

        daysOffset += day - 1;

        const solarDate = new Date(this.SOLAR_BASE_DATE);
        solarDate.setDate(solarDate.getDate() + daysOffset);

        return {
            year: solarDate.getFullYear(),
            month: solarDate.getMonth() + 1,
            day: solarDate.getDate(),
        };
    }
}
