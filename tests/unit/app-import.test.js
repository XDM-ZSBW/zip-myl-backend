/**
 * Test to verify the test app can be imported
 */

describe('App Import Test', () => {
  test('should import test app without errors', () => {
    expect(() => {
      require('../../src/app-test');
    }).not.toThrow();
  });

  test('should import test app successfully', () => {
    const app = require('../../src/app-test');
    expect(app).toBeDefined();
    expect(typeof app.use).toBe('function');
    expect(typeof app.get).toBe('function');
    expect(typeof app.post).toBe('function');
  });
});
