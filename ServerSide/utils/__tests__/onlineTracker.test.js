const cacheManager = require('../../lib/cacheManager');
const { addOnlineUser, removeOnlineUser, pruneStaleOnlineUsers, broadcastCounts } = require('../onlineTracker');

jest.mock('../../lib/cacheManager', () => ({
    sadd: jest.fn().mockResolvedValue(),
    srem: jest.fn().mockResolvedValue(),
    scard: jest.fn().mockResolvedValue(5),
}));

jest.mock('../../models/userModel', () => ({
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
}));

const User = require('../../models/userModel');

describe('onlineTracker', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('addOnlineUser', () => {
        test('does nothing when user is missing', async () => {
            await addOnlineUser(null);
            expect(cacheManager.sadd).not.toHaveBeenCalled();
        });

        test('does nothing when user_id is missing', async () => {
            await addOnlineUser({ name: 'Test' });
            expect(cacheManager.sadd).not.toHaveBeenCalled();
        });

        test('adds user to online_users_all', async () => {
            await addOnlineUser({ user_id: 'U001' });
            expect(cacheManager.sadd).toHaveBeenCalledWith('online_users_all', 'U001');
        });
    });

    describe('removeOnlineUser', () => {
        test('does nothing when user is missing', async () => {
            await removeOnlineUser(null);
            expect(cacheManager.srem).not.toHaveBeenCalled();
        });

        test('removes user from online_users_all', async () => {
            await removeOnlineUser({ user_id: 'U002' });
            expect(cacheManager.srem).toHaveBeenCalledWith('online_users_all', 'U002');
        });
    });

    describe('pruneStaleOnlineUsers', () => {
        test('returns empty array when userIds is empty', async () => {
            const result = await pruneStaleOnlineUsers(null, []);
            expect(result).toEqual([]);
        });

        test('returns normalized userIds when io is missing', async () => {
            const result = await pruneStaleOnlineUsers(null, ['U001', 'U002']);
            expect(result).toEqual(['U001', 'U002']);
        });

        test('keeps active users with sockets', async () => {
            const io = {
                in: jest.fn().mockReturnValue({ fetchSockets: jest.fn().mockResolvedValue([{}]) }),
            };
            const result = await pruneStaleOnlineUsers(io, ['U001']);
            expect(result).toEqual(['U001']);
        });

        test('removes inactive users and prunes non-existing users', async () => {
            const io = {
                in: jest.fn().mockReturnValue({ fetchSockets: jest.fn().mockResolvedValue([]) }),
            };
            User.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
            const result = await pruneStaleOnlineUsers(io, ['U001']);
            expect(result).toEqual([]);
            expect(cacheManager.srem).toHaveBeenCalledWith('online_users_all', 'U001');
        });

        test('removes inactive users via removeOnlineUser when user exists', async () => {
            const io = {
                in: jest.fn().mockReturnValue({ fetchSockets: jest.fn().mockResolvedValue([]) }),
            };
            User.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ user_id: 'U001' }) });
            const result = await pruneStaleOnlineUsers(io, ['U001']);
            expect(result).toEqual([]);
            expect(cacheManager.srem).toHaveBeenCalledWith('online_users_all', 'U001');
        });

        test('deduplicates userIds', async () => {
            const io = {
                in: jest.fn().mockReturnValue({ fetchSockets: jest.fn().mockResolvedValue([{}]) }),
            };
            const result = await pruneStaleOnlineUsers(io, ['U001', 'U001', 'U002']);
            expect(result).toEqual(['U001', 'U002']);
        });
    });

    describe('broadcastCounts', () => {
        test('does nothing when io is missing', async () => {
            await broadcastCounts(null);
            expect(cacheManager.scard).not.toHaveBeenCalled();
        });

        test('emits count to admin role', async () => {
            const io = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) };
            await broadcastCounts(io);
            expect(cacheManager.scard).toHaveBeenCalledWith('online_users_all');
            expect(io.to).toHaveBeenCalledWith('role:admin');
        });

        test('handles error gracefully', async () => {
            cacheManager.scard.mockRejectedValueOnce(new Error('redis down'));
            const io = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) };
            await broadcastCounts(io);
        });
    });
});
