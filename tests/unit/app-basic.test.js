/**
 * Basic App Test
 * Tests that the app can be imported and has basic Express functionality
 */

describe('Basic App Test', () => {
  test('should import test app without errors', () => {
    expect(() => {
      require('../../src/app-test');
    }).not.toThrow();
  });

  test('should have basic Express app structure', () => {
    const app = require('../../src/app-test');

    // Check that it's an Express app
    expect(app).toBeDefined();
    expect(typeof app.use).toBe('function');
    expect(typeof app.get).toBe('function');
    expect(typeof app.post).toBe('function');
    expect(typeof app.put).toBe('function');
    expect(typeof app.delete).toBe('function');

    // Check that it has middleware
    expect(app._router).toBeDefined();
  });

  test('should have health endpoint configured', () => {
    const app = require('../../src/app-test');

    // Check if health route is registered
    const routes = app._router.stack
      .filter(layer => layer.route)
      .map(layer => layer.route.path);

    expect(routes).toContain('/health');
  });
});
