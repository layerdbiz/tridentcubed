// The Supabase Storage adapter (#187), against a stand-in for Storage's REST API: the addresses it hands out are
// Storage's own signed ones, asked for with the secret key, in the one private bucket. Real Storage is checked by
// hand once the keys exist (spec #179 Testing Decisions).
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import { isTypeAllowed, STORAGE_BUCKET } from '#lib/files/files.schema.js';
import { BUCKET, createLocalStore, createSupabaseStore } from './store';

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
	it('is private, 20 MB a file, and takes any kind of file (#233)', () => {
		expect(STORAGE_BUCKET).toEqual({
			name: 'files',
			isPublic: false,
			fileSizeLimit: 20_971_520,
			allowedMimeTypes: null
		});
		expect(BUCKET).toBe(STORAGE_BUCKET.name);
	});

	it('leaves which column takes which kind to the upload check', () => {
		for (const type of ['image/webp', 'application/pdf', 'application/zip', 'image/gif'])
			expect(isTypeAllowed(type, 'item_attachment', 'file')).toBe(true);
		for (const type of ['image/webp', 'image/jpeg', 'image/png'])
			expect(isTypeAllowed(type, 'customer', 'logo')).toBe(true);
		for (const type of ['application/pdf', 'application/zip', 'image/gif', 'text/html'])
			expect(isTypeAllowed(type, 'customer', 'logo')).toBe(false);
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

// The server's own work on a stored file (#294): reading an untouched photo to convert it, writing the converted
// copy beside it, and deleting the untouched one once the copy checks out. All with the secret key, in the one bucket.
describe('the server reading, writing and deleting a file', () => {
	type SentType = { method: string; url: string; headers: Record<string, string>; body?: unknown };

	function createObjects(answer: (sent: SentType) => Response) {
		const sent: SentType[] = [];
		const fetcher = (async (url: string, init: RequestInit) => {
			const call = {
				method: init.method ?? 'GET',
				url,
				headers: init.headers as Record<string, string>,
				body: init.body
			};
			sent.push(call);
			return answer(call);
		}) as typeof fetch;
		const store = createSupabaseStore({
			url: 'https://abc.supabase.co',
			secretKey: 'sb_secret_x',
			fetch: fetcher
		});
		return { sent, store };
	}

	it('reads a file’s bytes with the secret key', async () => {
		const { sent, store } = createObjects(() => new Response(new Uint8Array([1, 2, 3])));

		expect(await store.read('org/file.heic')).toEqual(new Uint8Array([1, 2, 3]));
		expect(sent[0]).toMatchObject({
			method: 'GET',
			url: 'https://abc.supabase.co/storage/v1/object/authenticated/files/org/file.heic',
			headers: { apikey: 'sb_secret_x', authorization: 'Bearer sb_secret_x' }
		});
	});

	it('writes a file at a path of its own, over what a half-done earlier try left there', async () => {
		const { sent, store } = createObjects(() => Response.json({ Key: 'files/org/file.webp' }));
		const bytes = new Uint8Array([4, 5, 6]);

		await store.write('org/file.webp', bytes, 'image/webp');

		expect(sent[0]).toMatchObject({
			method: 'POST',
			url: 'https://abc.supabase.co/storage/v1/object/files/org/file.webp',
			headers: {
				apikey: 'sb_secret_x',
				authorization: 'Bearer sb_secret_x',
				'content-type': 'image/webp',
				'cache-control': 'max-age=31536000',
				'x-upsert': 'true'
			}
		});
		expect(new Uint8Array(await new Response(sent[0].body as BodyInit).arrayBuffer())).toEqual(
			bytes
		);
	});

	it('deletes a file', async () => {
		const { sent, store } = createObjects(() => Response.json({ message: 'Successfully deleted' }));

		await store.remove('org/file.heic');

		expect(sent[0]).toMatchObject({
			method: 'DELETE',
			url: 'https://abc.supabase.co/storage/v1/object/files/org/file.heic'
		});
	});

	it('says what Storage answered when it refuses', async () => {
		const { store } = createObjects(() => new Response('Object not found', { status: 404 }));

		await expect(store.read('org/gone.heic')).rejects.toThrow(
			'Supabase Storage answered 404: Object not found'
		);
		await expect(store.remove('org/gone.heic')).rejects.toThrow('answered 404');
		await expect(store.write('org/gone.webp', new Uint8Array(1), 'image/webp')).rejects.toThrow(
			'answered 404'
		);
	});

	it('does the same in the local folder, and keeps every path inside it', async () => {
		const folder = await mkdtemp(join(tmpdir(), 'trident-store-'));
		try {
			const store = createLocalStore({
				folder,
				secret: 'test-secret-that-is-at-least-32-characters-long'
			});

			await store.write('org/file.webp', new Uint8Array([7]), 'image/webp');
			await store.write('org/file.webp', new Uint8Array([7, 8]), 'image/webp');
			expect(await store.read('org/file.webp')).toEqual(new Uint8Array([7, 8]));
			await store.remove('org/file.webp');
			await expect(store.read('org/file.webp')).rejects.toThrow();
			await expect(store.write('../outside.webp', new Uint8Array(1), 'image/webp')).rejects.toThrow(
				'outside'
			);
		} finally {
			await rm(folder, { recursive: true, force: true });
		}
	});
});
