const bcrypt = require('bcrypt');
const {
    DEFAULT_BCRYPT_ROUNDS,
    getBcryptRounds,
    hashPassword,
    verifyPassword,
    needsRehash,
    getHashRounds,
} = require('../passwordHasher');

jest.mock('bcrypt', () => ({
    hash: jest.fn().mockResolvedValue('hashed'),
    compare: jest.fn().mockResolvedValue(true),
    getRounds: jest.fn().mockReturnValue(11),
}));

describe('passwordHasher', () => {
    beforeEach(() => jest.clearAllMocks());

    test('DEFAULT_BCRYPT_ROUNDS is 11', () => {
        expect(DEFAULT_BCRYPT_ROUNDS).toBe(11);
    });

    test('getBcryptRounds returns env value when valid', () => {
        process.env.BCRYPT_ROUNDS = '12';
        expect(getBcryptRounds()).toBe(12);
        delete process.env.BCRYPT_ROUNDS;
    });

    test('getBcryptRounds returns default when env invalid', () => {
        process.env.BCRYPT_ROUNDS = 'abc';
        expect(getBcryptRounds()).toBe(DEFAULT_BCRYPT_ROUNDS);
        delete process.env.BCRYPT_ROUNDS;
    });

    test('getBcryptRounds returns default when env out of range', () => {
        process.env.BCRYPT_ROUNDS = '20';
        expect(getBcryptRounds()).toBe(DEFAULT_BCRYPT_ROUNDS);
        delete process.env.BCRYPT_ROUNDS;
    });

    test('hashPassword delegates to bcrypt', async () => {
        const result = await hashPassword('plain');
        expect(bcrypt.hash).toHaveBeenCalledWith('plain', expect.any(Number));
        expect(result).toBe('hashed');
    });

    test('verifyPassword delegates to bcrypt', async () => {
        const result = await verifyPassword('plain', 'hashed');
        expect(bcrypt.compare).toHaveBeenCalledWith('plain', 'hashed');
        expect(result).toBe(true);
    });

    test('getHashRounds returns rounds', () => {
        expect(getHashRounds('hash')).toBe(11);
    });

    test('getHashRounds returns null on error', () => {
        bcrypt.getRounds.mockImplementation(() => { throw new Error('bad'); });
        expect(getHashRounds('hash')).toBeNull();
    });

    test('needsRehash returns false when current rounds >= default', () => {
        bcrypt.getRounds.mockReturnValue(DEFAULT_BCRYPT_ROUNDS);
        expect(needsRehash('hash')).toBe(false);
    });

    test('needsRehash returns true when current rounds < default', () => {
        bcrypt.getRounds.mockReturnValue(DEFAULT_BCRYPT_ROUNDS - 1);
        expect(needsRehash('hash')).toBe(true);
    });

    test('needsRehash returns false when getHashRounds fails', () => {
        bcrypt.getRounds.mockImplementation(() => { throw new Error('bad'); });
        expect(needsRehash('hash')).toBe(false);
    });
});
