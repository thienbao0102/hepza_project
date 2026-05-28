const rateLimit = require('express-rate-limit');

jest.mock('express-rate-limit', () => jest.fn());

describe('rateLimiter', () => {
    const capturedConfigs = [];

    beforeAll(() => {
        rateLimit.mockImplementation((config) => {
            capturedConfigs.push(config);
            return () => {};
        });
        require('../rateLimiter');
    });

    const getError = (config) => {
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        config.handler({}, res);
        return res.json.mock.calls[0]?.[0]?.error;
    };

    test('all limiters are created', () => {
        expect(capturedConfigs.length).toBe(10);
    });

    test('loginPasswordLimiter config', () => {
        const config = capturedConfigs.find(c => getError(c).includes('đăng nhập'));
        expect(config).toBeDefined();
        expect(config.windowMs).toBe(60 * 60 * 1000);
        expect(config.max).toBe(10);
        expect(config.standardHeaders).toBe(true);
        expect(config.legacyHeaders).toBe(false);
    });

    test('loginOtpVerifyLimiter config', () => {
        const config = capturedConfigs.find(c => getError(c).includes('OTP'));
        expect(config).toBeDefined();
        expect(config.windowMs).toBe(10 * 60 * 1000);
        expect(config.max).toBe(5);
    });

    test('loginOtpResendLimiter config', () => {
        const config = capturedConfigs.find(c => getError(c).includes('gửi lại OTP'));
        expect(config).toBeDefined();
        expect(config.windowMs).toBe(10 * 60 * 1000);
        expect(config.max).toBe(5);
    });

    test('resetPasswordLimiter config', () => {
        const config = capturedConfigs.find(c => getError(c).includes('reset mật khẩu'));
        expect(config).toBeDefined();
        expect(config.windowMs).toBe(60 * 60 * 1000);
        expect(config.max).toBe(5);
    });

    test('changePasswordLimiter config', () => {
        const config = capturedConfigs.find(c => getError(c).includes('đổi mật khẩu'));
        expect(config).toBeDefined();
        expect(config.windowMs).toBe(60 * 60 * 1000);
        expect(config.max).toBe(5);
    });

    test('refreshLimiter config', () => {
        const config = capturedConfigs.find(c => getError(c).includes('refresh'));
        expect(config).toBeDefined();
        expect(config.windowMs).toBe(15 * 60 * 1000);
        expect(config.max).toBe(20);
    });

    test('taxLookupLimiter config', () => {
        const config = capturedConfigs.find(c => getError(c).includes('tra cứu MST'));
        expect(config).toBeDefined();
        expect(config.windowMs).toBe(60 * 1000);
        expect(config.max).toBe(10);
    });

    test('representativeTransferLimiter config', () => {
        const config = capturedConfigs.find(c => getError(c).includes('nhượng quyền'));
        expect(config).toBeDefined();
        expect(config.windowMs).toBe(15 * 60 * 1000);
        expect(config.max).toBe(5);
    });

    test('companyCreateAccountLimiter skips non-company role', () => {
        const config = capturedConfigs.find(c => c.skip && getError(c).includes('xác minh mật khẩu'));
        expect(config).toBeDefined();
        expect(config.skip({ user: { role: 'admin' } })).toBe(true);
        expect(config.skip({ user: { role: 'company' } })).toBe(false);
    });

    test('companyDeleteUserLimiter skips non-company role', () => {
        const config = capturedConfigs.find(c => c.skip && getError(c).includes('xác minh mật khẩu'));
        expect(config).toBeDefined();
        expect(config.skip({ user: { role: 'admin' } })).toBe(true);
    });

    test('handler returns 429 json', () => {
        const config = capturedConfigs[0];
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        config.handler({}, res);
        expect(res.status).toHaveBeenCalledWith(429);
        expect(res.json).toHaveBeenCalledWith({ error: expect.any(String) });
    });

    test('getEmailAndIpKey uses email and ip', () => {
        const config = capturedConfigs.find(c => getError(c).includes('đăng nhập'));
        const req = { body: { email: 'Test@Example.COM ' }, ip: '1.2.3.4' };
        expect(config.keyGenerator(req)).toBe('test@example.com-1.2.3.4');
    });

    test('getEmailAndIpKey falls back to ip only', () => {
        const config = capturedConfigs.find(c => getError(c).includes('đăng nhập'));
        const req = { body: {}, ip: '1.2.3.4' };
        expect(config.keyGenerator(req)).toBe('1.2.3.4');
    });

    test('changePasswordLimiter key uses user_id', () => {
        const config = capturedConfigs.find(c => getError(c).includes('đổi mật khẩu'));
        const req = { user: { user_id: 'U001' }, ip: '1.2.3.4' };
        expect(config.keyGenerator(req)).toBe('U001');
    });

    test('changePasswordLimiter key falls back to ip', () => {
        const config = capturedConfigs.find(c => getError(c).includes('đổi mật khẩu'));
        const req = { body: { user_id: 'U002', email: 'a@b.com' }, ip: '1.2.3.4' };
        expect(config.keyGenerator(req)).toBe('1.2.3.4');
    });

    test('refreshLimiter key uses user-agent', () => {
        const config = capturedConfigs.find(c => getError(c).includes('refresh'));
        const req = { headers: { 'user-agent': 'Mozilla/5.0' }, ip: '1.2.3.4' };
        expect(config.keyGenerator(req)).toBe('Mozilla/5.0-1.2.3.4');
    });

    test('refreshLimiter key falls back to unknown-agent', () => {
        const config = capturedConfigs.find(c => getError(c).includes('refresh'));
        const req = { headers: {}, ip: '1.2.3.4' };
        expect(config.keyGenerator(req)).toBe('unknown-agent-1.2.3.4');
    });

    test('getUserAndIpKey via companyCreateAccountLimiter', () => {
        const config = capturedConfigs.find(c => c.skip && getError(c).includes('xác minh mật khẩu'));
        const req = { user: { user_id: 'U001' }, ip: '1.2.3.4' };
        expect(config.keyGenerator(req)).toBe('U001-1.2.3.4-create-company-sub-account');
    });

    describe('RATELIMIT_MULTIPLIER', () => {
        test('scales max', () => {
            process.env.RATELIMIT_MULTIPLIER = '2';
            const freshConfigs = [];
            rateLimit.mockImplementation((config) => {
                freshConfigs.push(config);
                return () => {};
            });
            jest.isolateModules(() => {
                require('../rateLimiter');
            });
            const config = freshConfigs.find(c => c.max === 20);
            expect(config).toBeDefined();
            delete process.env.RATELIMIT_MULTIPLIER;
        });
    });
});
