const mongoose = require('mongoose');

jest.mock('../../monitoring/metrics', () => ({
    mongodbPoolSize: { set: jest.fn() },
    mongodbPoolActive: { set: jest.fn() },
    mongodbPoolAvailable: { set: jest.fn() },
    mongodbPoolPending: { set: jest.fn() },
}));

const {
    mongodbPoolSize,
    mongodbPoolActive,
    mongodbPoolAvailable,
    mongodbPoolPending,
} = require('../../monitoring/metrics');

const { collectMongoMetrics, getPoolStats } = require('../mongoMetrics');

describe('mongoMetrics', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('getPoolStats returns null when topology is missing', () => {
        mongoose.connections = [{ readyState: 1, client: {} }];
        expect(getPoolStats()).toBeNull();
    });

    test('getPoolStats extracts stats from server pool', () => {
        const mockPool = {
            options: { maxPoolSize: 50 },
            availableCount: 40,
            size: 50,
            waitQueueSize: 2,
        };
        const mockServer = { s: { pool: mockPool } };
        const servers = new Map();
        servers.set('localhost:27017', mockServer);

        mongoose.connections = [{
            readyState: 1,
            client: {
                topology: { s: { servers } },
            },
        }];

        expect(getPoolStats()).toEqual({
            size: 50,
            active: 10,
            available: 40,
            pending: 2,
        });
    });

    test('getPoolStats uses fallback properties', () => {
        const mockPool = {
            maxPoolSize: 30,
            available: 25,
            checkedOutCount: 5,
            pending: 0,
        };
        const mockServer = { s: { pool: mockPool } };
        const servers = new Map();
        servers.set('localhost:27017', mockServer);

        mongoose.connections = [{
            readyState: 1,
            client: {
                topology: { s: { servers } },
            },
        }];

        expect(getPoolStats()).toEqual({
            size: 30,
            active: 5,
            available: 25,
            pending: 0,
        });
    });

    test('collectMongoMetrics sets zeroes when not connected', async () => {
        mongoose.connections = [{ readyState: 0 }];
        await collectMongoMetrics();
        expect(mongodbPoolSize.set).toHaveBeenCalledWith(0);
        expect(mongodbPoolActive.set).toHaveBeenCalledWith(0);
        expect(mongodbPoolAvailable.set).toHaveBeenCalledWith(0);
        expect(mongodbPoolPending.set).toHaveBeenCalledWith(0);
    });

    test('collectMongoMetrics updates gauges from pool stats', async () => {
        const mockPool = {
            options: { maxPoolSize: 50 },
            availableCount: 45,
            size: 50,
            waitQueueSize: 0,
        };
        const mockServer = { s: { pool: mockPool } };
        const servers = new Map();
        servers.set('localhost:27017', mockServer);

        mongoose.connections = [{
            readyState: 1,
            client: {
                topology: { s: { servers } },
            },
        }];

        await collectMongoMetrics();
        expect(mongodbPoolSize.set).toHaveBeenCalledWith(50);
        expect(mongodbPoolActive.set).toHaveBeenCalledWith(5);
        expect(mongodbPoolAvailable.set).toHaveBeenCalledWith(45);
        expect(mongodbPoolPending.set).toHaveBeenCalledWith(0);
    });
});
