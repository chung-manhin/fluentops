import { describe, expect, it } from 'vitest';
import { sleep } from '../src/utils';

describe('shared utils', () => {
  it('sleep resolves', async () => {
    await expect(sleep(1)).resolves.toBeUndefined();
  });
});
