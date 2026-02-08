export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function assertNever(x: never, message = 'Unexpected value'): never {
  throw new Error(`${message}: ${String(x)}`);
}
