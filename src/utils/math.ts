export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

export function calculate(operation: 'add' | 'multiply', a: number, b: number): number {
  switch (operation) {
    case 'add':
      return add(a, b);
    case 'multiply':
      return multiply(a, b);
    default:
      throw new Error('Invalid operation');
  }
}
