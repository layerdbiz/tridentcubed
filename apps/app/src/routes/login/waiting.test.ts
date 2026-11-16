import { describe, expect, it } from 'vite-plus/test';
import { readWaiting, toWaiting } from './waiting';

const SENT = 1_000_000;

describe('the email waiting for its code', () => {
	it('is read back while the code still works', () => {
		const kept = toWaiting('owner@personal.example', SENT);

		expect(readWaiting(kept, 10, SENT + 9 * 60_000)).toBe('owner@personal.example');
	});

	it('is forgotten once the code has run out', () => {
		const kept = toWaiting('owner@personal.example', SENT);

		expect(readWaiting(kept, 10, SENT + 10 * 60_000)).toBe('');
	});

	it('is nothing when nothing was kept, or what was kept is not ours', () => {
		expect(readWaiting(null, 10, SENT)).toBe('');
		expect(readWaiting('not json', 10, SENT)).toBe('');
		expect(readWaiting('{"email":5,"at":"x"}', 10, SENT)).toBe('');
		expect(readWaiting(toWaiting('owner@personal.example', SENT + 60_000), 10, SENT)).toBe('');
	});
});
