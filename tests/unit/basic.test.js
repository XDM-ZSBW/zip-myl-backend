/**
 * Basic test to verify testing framework is working
 */

describe('Basic Test Suite', () => {
  test('should pass a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should handle async operations', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });

  test('should use test utilities', () => {
    const testUser = global.testUtils.createTestUser();
    expect(testUser).toHaveProperty('id');
    expect(testUser).toHaveProperty('email');
    expect(testUser.email).toMatch(/test-.*@example\.com/);
  });

  test('should handle mocks', () => {
    const mockFn = jest.fn().mockReturnValue('mocked');
    expect(mockFn()).toBe('mocked');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});
