/**
 * Minimal test to verify basic Jest functionality
 */

describe('Minimal Test', () => {
  test('should work without complex setup', () => {
    expect(true).toBe(true);
  });

  test('should handle basic assertions', () => {
    const value = 2 + 2;
    expect(value).toBe(4);
  });
});
