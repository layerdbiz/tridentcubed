// What a picture column takes (#187, review fixes): every picture now uploads to storage, so a row keeps only an
// address, never the picture itself.
import { describe, expect, it } from 'vite-plus/test';
import { checkValues } from './rows.schema';

describe('a picture column', () => {
	it('takes the app’s file address, a starting file, a picture the app ships with, or nothing', () => {
		for (const logo of [
			'',
			'/files/0b6c3c1e-6f4f-4d5c-9a1e-3a1f2b4c5d6e',
			'/start/clients/koga.png',
			'/logo-color.svg'
		])
			expect(checkValues('customer', { logo }), logo).toBeUndefined();
	});

	it('refuses a picture sent inline as a data URL, or a long address', () => {
		expect(checkValues('customer', { logo: 'data:image/png;base64,iVBORw0KGgo=' })).toBe(
			'customer logo: A picture is kept in storage; the row keeps its address only.'
		);
		expect(checkValues('team', { photo: `/files/${'a'.repeat(3000)}` })).toMatch(/^team photo:/);
	});
});
