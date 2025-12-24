const fc = require('fast-check');

describe('Minimal Property Test', () => {
    test('should work with fast-check', () => {
        fc.assert(
            fc.property(
                fc.integer(),
                (n) => {
                    expect(typeof n).toBe('number');
                    return true;
                }
            ),
            { numRuns: 10 }
        );
    });
});