import { Injectable } from '@nestjs/common';

@Injectable()
export class TimezoneService {
  /**
   * الحصول على الوقت الحالي بتوقيت مصر
   */
  getCurrentEgyptTime(): Date {
    const now = new Date();
    return this.convertUTCToEgyptTime(now);
  }

  /**
   * الحصول على الوقت الحالي بتوقيت UTC
   */
  getCurrentUTCTime(): Date {
    return new Date();
  }

  /**
   * تحويل UTC إلى توقيت مصر
   */
  convertUTCToEgyptTime(utcTime: Date): Date {
    const egyptOffset = this.getEgyptUTCOffset(utcTime);
    return new Date(utcTime.getTime() + (egyptOffset * 60 * 60 * 1000));
  }

  /**
   * تحويل توقيت مصر إلى UTC
   */
  convertEgyptTimeToUTC(egyptTime: Date): Date {
    const egyptOffset = this.getEgyptUTCOffset(egyptTime);
    return new Date(egyptTime.getTime() - (egyptOffset * 60 * 60 * 1000));
  }

  /**
   * الحصول على offset مصر من UTC (مع مراعاة التوقيت الصيفي)
   */
  private getEgyptUTCOffset(date: Date): number {
    const year = date.getFullYear();
    
    // مصر تتبع التوقيت الصيفي من آخر جمعة في أبريل إلى آخر خميس في أكتوبر
    const lastFridayApril = this.getLastFridayOfMonth(year, 3); // أبريل = 3 (0-indexed)
    const lastThursdayOctober = this.getLastThursdayOfMonth(year, 9); // أكتوبر = 9 (0-indexed)
    
    // تحويل التواريخ إلى UTC للقارنة الصحيحة
    const dstStart = new Date(lastFridayApril.getTime() - (2 * 60 * 60 * 1000)); // UTC+2
    const dstEnd = new Date(lastThursdayOctober.getTime() - (2 * 60 * 60 * 1000)); // UTC+2
    
    // التحقق من وجود التاريخ ضمن فترة التوقيت الصيفي
    if (date >= dstStart && date < dstEnd) {
      return 3; // UTC+3 في الصيف (DST)
    } else {
      return 2; // UTC+2 في الشتاء
    }
  }

  /**
   * الحصول على آخر جمعة في الشهر
   */
  private getLastFridayOfMonth(year: number, month: number): Date {
    const lastDay = new Date(year, month + 1, 0); // آخر يوم في الشهر
    const lastDayOfWeek = lastDay.getDay(); // 0 = الأحد, 6 = السبت
    
    // حساب عدد الأيام للرجوع إلى آخر جمعة
    let daysToSubtract = (lastDayOfWeek + 2) % 7; // الجمعة = 5
    if (daysToSubtract === 0) daysToSubtract = 7;
    
    return new Date(year, month, lastDay.getDate() - daysToSubtract);
  }

  /**
   * الحصول على آخر خميس في الشهر
   */
  private getLastThursdayOfMonth(year: number, month: number): Date {
    const lastDay = new Date(year, month + 1, 0); // آخر يوم في الشهر
    const lastDayOfWeek = lastDay.getDay(); // 0 = الأحد, 6 = السبت
    
    // حساب عدد الأيام للرجوع إلى آخر خميس
    let daysToSubtract = (lastDayOfWeek + 3) % 7; // الخميس = 4
    if (daysToSubtract === 0) daysToSubtract = 7;
    
    return new Date(year, month, lastDay.getDate() - daysToSubtract);
  }

  /**
   * التحقق من أن التاريخ صالح
   */
  isValidDate(date: any): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * تنسيق التاريخ للعرض
   */
  formatDateForDisplay(date: Date, timezone: 'UTC' | 'Egypt' = 'Egypt'): string {
    if (timezone === 'Egypt') {
      const egyptTime = this.convertUTCToEgyptTime(date);
      return egyptTime.toLocaleString('ar-EG', {
        timeZone: 'Africa/Cairo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } else {
      return date.toISOString();
    }
  }

  /**
   * مقارنة التواريخ مع مراعاة timezone
   */
  compareDates(date1: Date, date2: Date, timezone: 'UTC' | 'Egypt' = 'UTC'): number {
    if (timezone === 'Egypt') {
      const egypt1 = this.convertUTCToEgyptTime(date1);
      const egypt2 = this.convertUTCToEgyptTime(date2);
      return egypt1.getTime() - egypt2.getTime();
    } else {
      return date1.getTime() - date2.getTime();
    }
  }
}
