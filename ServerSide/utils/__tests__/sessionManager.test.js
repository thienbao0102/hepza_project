const cacheManager = require('../../lib/cacheManager');
const { getIo } = require('../../config/socket');

jest.mock('../../lib/cacheManager', () => ({
    hgetall: jest.fn().mockResolvedValue({}),
    set: jest.fn().mockResolvedValue(),
    del: jest.fn().mockResolvedValue(),
    hget: jest.fn().mockResolvedValue(null),
    hkeys: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../config/socket', () => ({ getIo: jest.fn() }));

describe('sessionManager', () => {
    let sessionManager;

    beforeEach(() => {
        jest.clearAllMocks();
        sessionManager = require('../sessionManager');
    });

    describe('invalidateAllUserSessions', () => {
        test('invalidates sessions and emits event', async () => {
            const socketDisconnect = jest.fn();
            const io = {
                to: jest.fn().mockReturnValue({ emit: jest.fn() }),
                in: jest.fn().mockReturnValue({ fetchSockets: jest.fn().mockResolvedValue([{ disconnect: socketDisconnect }]) }),
            };
            getIo.mockReturnValue(io);
            cacheManager.hgetall.mockResolvedValue({
                rtok1: { authToken: 'atok1' },
            });

            await sessionManager.invalidateAllUserSessions('U001', 'Logged out');

            expect(cacheManager.set).toHaveBeenCalledWith('blacklist:atok1', true, 15 * 60);
            expect(cacheManager.del).toHaveBeenCalledWith('refresh:rtok1');
            expect(cacheManager.del).toHaveBeenCalledWith('session:U001');
            expect(cacheManager.del).toHaveBeenCalledWith('user:U001');
            expect(cacheManager.del).toHaveBeenCalledWith('csrf:U001');
            expect(io.to).toHaveBeenCalledWith('user:U001');
            expect(socketDisconnect).toHaveBeenCalledWith(true);
        });

        test('handles missing io gracefully', async () => {
            getIo.mockImplementation(() => { throw new Error('not ready'); });
            cacheManager.hgetall.mockResolvedValue({});

            await sessionManager.invalidateAllUserSessions('U001', 'Test');

            expect(cacheManager.del).toHaveBeenCalledWith('session:U001');
        });

        test('skips blacklist when no authToken', async () => {
            getIo.mockReturnValue(null);
            cacheManager.hgetall.mockResolvedValue({
                rtok1: {},
            });

            await sessionManager.invalidateAllUserSessions('U001', 'Test');
            expect(cacheManager.set).not.toHaveBeenCalled();
        });
    });

    describe('clearSession', () => {
        test('returns logout successful with full params', async () => {
            const io = {
                to: jest.fn().mockReturnValue({ emit: jest.fn() }),
            };
            getIo.mockReturnValue(io);
            cacheManager.hkeys.mockResolvedValue(['rtok1']);

            const result = await sessionManager.clearSession('U001', 'rtok1', 'atok1');

            expect(cacheManager.set).toHaveBeenCalledWith('blacklist:atok1', true, 15 * 60);
            expect(cacheManager.del).toHaveBeenCalledWith('session:U001');
            expect(cacheManager.del).toHaveBeenCalledWith('csrf:U001');
            expect(cacheManager.del).toHaveBeenCalledWith('refresh:rtok1');
            expect(cacheManager.del).toHaveBeenCalledWith('user:U001');
            expect(result.message).toBe('Logout successful');
        });

        test('resolves user_id from refreshToken when missing', async () => {
            cacheManager.get.mockResolvedValue('U002');
            cacheManager.hget.mockResolvedValue({ authToken: 'atok2' });
            cacheManager.hkeys.mockResolvedValue(['rtok2']);

            const result = await sessionManager.clearSession(null, 'rtok2', null);
            expect(cacheManager.get).toHaveBeenCalledWith('refresh:rtok2');
            expect(cacheManager.set).toHaveBeenCalledWith('blacklist:atok2', true, 15 * 60);
            expect(result.message).toBe('Logout successful');
        });

        test('does not double-blacklist same token', async () => {
            cacheManager.get.mockResolvedValue('U003');
            cacheManager.hget.mockResolvedValue(JSON.stringify({ authToken: 'atok3' }));
            cacheManager.hkeys.mockResolvedValue(['rtok3']);

            await sessionManager.clearSession(null, 'rtok3', 'atok3');
            expect(cacheManager.set).toHaveBeenCalledTimes(1);
        });

        test('works without io', async () => {
            getIo.mockImplementation(() => { throw new Error('no io'); });
            cacheManager.hkeys.mockResolvedValue([]);

            const result = await sessionManager.clearSession('U001', 'rtok1', 'atok1');
            expect(result.message).toBe('Logout successful');
        });

        test('works without user_id or io', async () => {
            getIo.mockImplementation(() => { throw new Error('no io'); });
            cacheManager.get.mockResolvedValue(null);

            const result = await sessionManager.clearSession(null, null, 'atok1');
            expect(cacheManager.set).toHaveBeenCalledWith('blacklist:atok1', true, 15 * 60);
            expect(result.message).toBe('Logout successful');
        });
    });
});
