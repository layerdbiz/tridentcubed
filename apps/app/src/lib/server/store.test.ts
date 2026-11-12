// The Supabase Storage adapter (#187), against a stand-in for Storage's REST API: the addresses it hands out are
// Storage's own signed ones, asked for with the secret key, in the one private bucket. Real Storage is checked by
// hand once the keys exist (spec #179 Testing Decisions).
import { describe, expect, it } from 'vite-plus/test';
import { isTypeAllowed, STORAGE_BUCKET } from '#lib/files/files.schema.js';
import { BUCKET, createSupabaseStore } from './store';

type CallType = { url: string; headers: Record<string, string>; body: unknown };

function createStorage() {
	const calls: CallType[] = [];
	const fetcher = (async (url: string, init: RequestInit) => {
		calls.push({
			url,
			headers: init.headers as Record<string, string>,
			body: JSON.parse(String(init.body))
		});
		const path = url.split('/storage/v1')[1];
		const answer = path.startsWith('/object/upload/sign/')
			? { url: `${path}?token=upload-token` }
			: { signedURL: `${path}?token=link-token` };
		return new Response(JSON.stringify(answer), { status: 200 });
	}) as typeof fetch;
	return { calls, fetcher };
}

describe('the one bucket (#194 makes it as this says)', () => {
	it('is private, 20 MB a file, and takes the pictures and the item list’s spreadsheets and PDFs', () => {
		expect(STORAGE_BUCKET).toEqual({
			name: 'files',
			isPublic: false,
			fileSizeLimit: 20_971_520,
			allowedMimeTypes: [
				'image/webp',
				'image/jpeg',
				'image/png',
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'application/vnd.ms-excel',
				'text/csv',
				'application/pdf'
			]
		});
		expect(BUCKET).toBe(STORAGE_BUCKET.name);
	});

	it('takes every kind of file the app lets through', () => {
		for (const type of STORAGE_BUCKET.allowedMimeTypes)
			expect(isTypeAllowed(type, 'item_attachment', 'file')).toBe(true);
		expect(isTypeAllowed('image/gif', 'item_attachment', 'file')).toBe(false);
	});
});

describe('the Supabase Storage store', () => {
	it('hands a device Storage’s signed upload address in the one private bucket', async () => {
		const { calls, fetcher } = createStorage();
		const store = createSupabaseStore({
			url: 'https://abc.supabase.co/',
			secretKey: 'sb_secret_x',
			fetch: fetcher
		});

		const upload = await store.toUpload('org/file.webp', 'image/webp');

		expect(BUCKET).toBe('files');
		expect(upload).toEqual({
			method: 'PUT',
			url: 'https://abc.supabase.co/storage/v1/object/upload/sign/files/org/file.webp?token=upload-token',
			headers: {
				'content-type': 'image/webp',
				'cache-control': 'max-age=31536000',
				'x-upsert': 'false'
			}
		});
		expect(calls[0].headers).toMatchObject({
			apikey: 'sb_secret_x',
			authorization: 'Bearer sb_secret_x'
		});
	});

	it('hands a browser a short-lived signed link', async () => {
		const { calls, fetcher } = createStorage();
		const store = createSupabaseStore({
			url: 'https://abc.supabase.co',
			secretKey: 'sb_secret_x',
			fetch: fetcher
		});

		const link = await store.toLink('org/file.webp', 300);

		expect(link).toBe(
			'https://abc.supabase.co/storage/v1/object/sign/files/org/file.webp?token=link-token'
		);
		expect(calls[0].body).toEqual({ expiresIn: 300 });
	});

	it('says what Storage answered when it refuses', async () => {
		const store = createSupabaseStore({
			url: 'https://abc.supabase.co',
			secretKey: 'wrong',
			fetch: (async () => new Response('Bucket not found', { status: 404 })) as typeof fetch
		});

		await expect(store.toLink('org/file.webp')).rejects.toThrow(
			'Supabase Storage answered 404: Bucket not found'
		);
	});
});
