const {
    BUY_DEMAND_FIELDS,
    SELL_SUPPLY_FIELDS,
    BUY_DEMAND_PROJECTION,
    SELL_SUPPLY_PROJECTION,
} = require('../businessSymbiosis');

describe('business symbiosis response fields', () => {
    test('own buy and sell lists include optimistic lock version', () => {
        expect(BUY_DEMAND_FIELDS).toMatch(/\b__v\b/);
        expect(SELL_SUPPLY_FIELDS).toMatch(/\b__v\b/);
    });

    test('recommendation projections include optimistic lock version', () => {
        expect(BUY_DEMAND_PROJECTION.__v).toBe(1);
        expect(SELL_SUPPLY_PROJECTION.__v).toBe(1);
    });
});
