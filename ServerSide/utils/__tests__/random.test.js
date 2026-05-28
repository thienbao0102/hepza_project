const { generateRandomPassword, generateOtp } = require('../random');

describe('random', () => {
    test('generateOtp returns 6 digit string', () => {
        const otp = generateOtp();
        expect(otp).toMatch(/^\d{6}$/);
        expect(Number(otp)).toBeGreaterThanOrEqual(100000);
        expect(Number(otp)).toBeLessThanOrEqual(999999);
    });

    test('generateRandomPassword returns 8 char string', () => {
        const pwd = generateRandomPassword();
        expect(pwd).toHaveLength(8);
        expect(typeof pwd).toBe('string');
    });

    test('generateRandomPassword uses expected charset', () => {
        const pwd = generateRandomPassword();
        const charset = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789@#!';
        for (const ch of pwd) {
            expect(charset).toContain(ch);
        }
    });
});
