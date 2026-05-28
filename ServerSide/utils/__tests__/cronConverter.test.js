const { convertToCron } = require('../cronConverter');

describe('cronConverter', () => {
    test('returns null for non-recurring schedule', () => {
        expect(convertToCron({ type: 'IMMEDIATE' })).toBeNull();
        expect(convertToCron({ type: 'ONE_TIME' })).toBeNull();
    });

    test('returns cronString directly if provided', () => {
        expect(convertToCron({ type: 'RECURRING', cronString: '0 9 * * *' })).toBe('0 9 * * *');
    });

    test('builds daily cron', () => {
        const result = convertToCron({
            type: 'RECURRING',
            repeat: { frequency: 'daily', interval: 2, time: '09:30' },
        });
        expect(result).toBe('30 9 */2 * *');
    });

    test('builds weekly cron', () => {
        const result = convertToCron({
            type: 'RECURRING',
            repeat: { frequency: 'weekly', interval: 1, daysOfWeek: [1, 3, 5], time: '08:00' },
        });
        expect(result).toBe('0 8 * * 1,3,5');
    });

    test('builds monthly cron', () => {
        const result = convertToCron({
            type: 'RECURRING',
            repeat: { frequency: 'monthly', interval: 1, dayOfMonth: 15, time: '10:00' },
        });
        expect(result).toBe('0 10 15 */1 *');
    });

    test('throws for missing repeat config', () => {
        expect(() => convertToCron({ type: 'RECURRING' })).toThrow('Thiếu cấu hình lặp lại');
    });

    test('throws for invalid time format', () => {
        expect(() => convertToCron({
            type: 'RECURRING',
            repeat: { frequency: 'daily', interval: 1, time: 'abc' },
        })).toThrow('Thời gian không hợp lệ');
    });

    test('throws for invalid hour/minute', () => {
        expect(() => convertToCron({
            type: 'RECURRING',
            repeat: { frequency: 'daily', interval: 1, time: '25:00' },
        })).toThrow('Giờ/phút không hợp lệ');
    });

    test('throws for daily interval out of range', () => {
        expect(() => convertToCron({
            type: 'RECURRING',
            repeat: { frequency: 'daily', interval: 32, time: '*:*' },
        })).toThrow('Interval cho daily');
    });

    test('throws for weekly interval not 1', () => {
        expect(() => convertToCron({
            type: 'RECURRING',
            repeat: { frequency: 'weekly', interval: 2, daysOfWeek: [1], time: '*:*' },
        })).toThrow('Interval cho weekly phải = 1');
    });

    test('throws for weekly missing daysOfWeek', () => {
        expect(() => convertToCron({
            type: 'RECURRING',
            repeat: { frequency: 'weekly', interval: 1, time: '*:*' },
        })).toThrow('Vui lòng chọn ít nhất 1 ngày');
    });

    test('throws for monthly interval out of range', () => {
        expect(() => convertToCron({
            type: 'RECURRING',
            repeat: { frequency: 'monthly', interval: 13, dayOfMonth: 1, time: '*:*' },
        })).toThrow('Interval cho monthly');
    });

    test('throws for monthly invalid dayOfMonth', () => {
        expect(() => convertToCron({
            type: 'RECURRING',
            repeat: { frequency: 'monthly', interval: 1, dayOfMonth: 32, time: '*:*' },
        })).toThrow('Ngày trong tháng phải từ 1 đến 31');
    });

    test('throws for invalid frequency', () => {
        expect(() => convertToCron({
            type: 'RECURRING',
            repeat: { frequency: 'yearly', interval: 1, time: '*:*' },
        })).toThrow('Frequency không hợp lệ');
    });
});
