import { describe, expect, it } from 'vite-plus/test';
import { ensureRandomUuid, toUuid } from './uuid';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('an id on a page without crypto.randomUUID', () => {
	it('is a version 4 UUID whatever the random bytes are', () => {
		expect(toUuid(new Uint8Array(16).fill(0))).toBe('00000000-0000-4000-8000-000000000000');
		expect(toUuid(new Uint8Array(16).fill(255))).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
	});

	it('is given to a page that lacks it, and is different each time', () => {
		const page = {
			getRandomValues: (bytes: Uint8Array<ArrayBuffer>) => crypto.getRandomValues(bytes)
		} as unknown as Crypto;

		ensureRandomUuid(page);

		const [first, second] = [page.randomUUID(), page.randomUUID()];
		expect(first).toMatch(UUID_V4);
		expect(second).toMatch(UUID_V4);
		expect(first).not.toBe(second);
	});

	it('leaves a page that has its own alone', () => {
		const own = () => '11111111-1111-4111-8111-111111111111' as const;
		const page = { randomUUID: own } as unknown as Crypto;

		ensureRandomUuid(page);

		expect(page.randomUUID()).toBe('11111111-1111-4111-8111-111111111111');
	});
});
