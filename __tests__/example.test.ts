/**
 * Example test file demonstrating Jest setup
 */

describe('Example Test Suite', () => {
  it('should pass a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('should check string equality', () => {
    const greeting = 'Hello, World!';
    expect(greeting).toBe('Hello, World!');
  });

  it('should verify array contents', () => {
    const numbers = [1, 2, 3, 4, 5];
    expect(numbers).toHaveLength(5);
    expect(numbers).toContain(3);
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
});
