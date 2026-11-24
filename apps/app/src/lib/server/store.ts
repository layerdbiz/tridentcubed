// The file store (spec #179 "Files"; ADR 0004; #187): where the bytes of files lie, behind one small interface with
// two adapters. Supabase Storage holds them in one private bucket, and only the server, with the secret key, makes
// the short-lived addresses a device uploads to and a browser opens. With no storage settings, outside production, a
// local folder stands in, served by the app itself at /local-files/... with links signed the same short-lived way,
// so development and tests work the same with no network. The server also reads, writes and deletes a file itself,
// to convert a photo the device could not read (#294).
import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { STORAGE_BUCKET, type UploadTargetType } from '#lib/files/files.schema.js';

/** The one private bucket. Made once in Supabase (#194) as `STORAGE_BUCKET` says: private, its size and kinds. */
export const BUCKET = STORAGE_BUCKET.name;

/** How long an upload address lasts. Supabase's signed upload addresses last two hours whatever is asked. */
export const UPLOAD_SECONDS = 2 * 60 * 60;

/** How long a link to open a file lasts. The app's address hands a fresh one every time. */
export const LINK_SECONDS = 10 * 60;

export type FileStoreType = {
	kind: 'supabase' | 'local';
	/** Where a device sends the bytes of the file at `path`, once. */
	toUpload(path: string, type: string): Promise<UploadTargetType>;
	/** A link that opens the file at `path` for `seconds`. */
	toLink(path: string, seconds?: number): Promise<string>;
	/** The bytes of the file at `path`. */
	read(path: string): Promise<Uint8Array<ArrayBuffer>>;
	/**
	 * Keeps `bytes` as the file at `path`, over a file a half-done earlier try left there: only the server writes this
	 * way, at paths it chose itself (a device's upload address never writes over a file).
	 */
	write(path: string, bytes: Uint8Array, type: string): Promise<void>;
	/** Deletes the file at `path`. */
	remove(path: string): Promise<void>;
};

/** How long a browser may keep a file: forever, since a path is never written twice. */
const CACHE = 'max-age=31536000';

export type LocalStoreType = FileStoreType & {
	kind: 'local';
	/** Takes the bytes sent to an upload address; false when the address is not a good one. */
	receive(url: string, bytes: Uint8Array): Promise<boolean>;
	/** The bytes a link opens; undefined when the link is not a good one, has run out or the file is not there. */
	send(url: string): Promise<Uint8Array<ArrayBuffer> | undefined>;
};

export const LOCAL_PREFIX = '/local-files/';

type OperationType = 'get' | 'put';

/** The local folder adapter: development and tests. Its links are signed with the app's secret. */
export function createLocalStore(options: { folder: string; secret: string }): LocalStoreType {
	const root = resolve(options.folder);

	function sign(operation: OperationType, path: string, expires: number) {
		return createHmac('sha256', options.secret)
			.update(`${operation}\n${path}\n${expires}`)
			.digest('base64url');
	}

	function toURL(operation: OperationType, path: string, seconds: number) {
		const expires = Date.now() + seconds * 1000;
		const query = new URLSearchParams({
			op: operation,
			expires: String(expires),
			sig: sign(operation, path, expires)
		});
		return `${LOCAL_PREFIX}${path}?${query}`;
	}

	// The file a good link of this operation points at, inside the folder; undefined for anything else.
	function toFile(url: string, operation: OperationType) {
		const parsed = new URL(url, 'http://local');
		if (!parsed.pathname.startsWith(LOCAL_PREFIX)) return undefined;
		const path = decodeURIComponent(parsed.pathname.slice(LOCAL_PREFIX.length));
		const expires = Number(parsed.searchParams.get('expires'));
		const given = Buffer.from(parsed.searchParams.get('sig') ?? '');
		const wanted = Buffer.from(sign(operation, path, expires));
		if (parsed.searchParams.get('op') !== operation) return undefined;
		if (!Number.isFinite(expires) || expires < Date.now()) return undefined;
		if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return undefined;
		return toInside(path);
	}

	// The file at `path`, inside the folder; undefined for a path that leads out of it.
	function toInside(path: string) {
		const file = resolve(join(root, path));
		return file.startsWith(`${root}${sep}`) ? file : undefined;
	}

	function toOwnFile(path: string) {
		const file = toInside(path);
		if (!file) throw new Error(`${path} leads outside the files folder.`);
		return file;
	}

	return {
		kind: 'local',
		async toUpload(path, type) {
			return {
				method: 'PUT',
				url: toURL('put', path, UPLOAD_SECONDS),
				headers: { 'content-type': type }
			};
		},
		async toLink(path, seconds = LINK_SECONDS) {
			return toURL('get', path, seconds);
		},
		async receive(url, bytes) {
			const file = toFile(url, 'put');
			if (!file) return false;
			await mkdir(dirname(file), { recursive: true });
			await writeFile(file, bytes);
			return true;
		},
		async send(url) {
			const file = toFile(url, 'get');
			if (!file) return undefined;
			try {
				return new Uint8Array(await readFile(file));
			} catch {
				return undefined;
			}
		},
		async read(path) {
			return new Uint8Array(await readFile(toOwnFile(path)));
		},
		async write(path, bytes) {
			const file = toOwnFile(path);
			await mkdir(dirname(file), { recursive: true });
			await writeFile(file, bytes);
		},
		async remove(path) {
			await rm(toOwnFile(path));
		}
	};
}

/**
 * The Supabase Storage adapter, through Storage's REST API with the secret key (sent as `apikey` and as the bearer,
 * as supabase-js does). The bucket is private: nothing in it opens without a link the server signed.
 */
export function createSupabaseStore(options: {
	url: string;
	secretKey: string;
	bucket?: string;
	fetch?: typeof fetch;
}): FileStoreType {
	const storage = `${options.url.replace(/\/+$/, '')}/storage/v1`;
	const bucket = options.bucket ?? BUCKET;
	const send = options.fetch ?? fetch;
	const key = { apikey: options.secretKey, authorization: `Bearer ${options.secretKey}` };

	// One call to Storage with the secret key; a refusal is thrown with what Storage said.
	async function call(
		path: string,
		init: { method: string; headers?: Record<string, string>; body?: BodyInit }
	) {
		const response = await send(`${storage}${path}`, {
			...init,
			headers: { ...key, ...init.headers }
		});
		if (!response.ok) {
			throw new Error(`Supabase Storage answered ${response.status}: ${await response.text()}`);
		}
		return response;
	}

	async function post(path: string, body?: unknown) {
		const response = await call(path, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body ?? {})
		});
		return (await response.json()) as Record<string, string>;
	}

	return {
		kind: 'supabase',
		async toUpload(path, type) {
			const { url } = await post(`/object/upload/sign/${bucket}/${path}`);
			return {
				method: 'PUT',
				url: `${storage}${url}`,
				headers: { 'content-type': type, 'cache-control': CACHE, 'x-upsert': 'false' }
			};
		},
		async toLink(path, seconds = LINK_SECONDS) {
			const { signedURL } = await post(`/object/sign/${bucket}/${path}`, { expiresIn: seconds });
			return `${storage}${signedURL}`;
		},
		async read(path) {
			const response = await call(`/object/authenticated/${bucket}/${path}`, { method: 'GET' });
			return new Uint8Array(await response.arrayBuffer());
		},
		async write(path, bytes, type) {
			await call(`/object/${bucket}/${path}`, {
				method: 'POST',
				headers: { 'content-type': type, 'cache-control': CACHE, 'x-upsert': 'true' },
				body: new Blob([bytes as BlobPart], { type })
			});
		},
		async remove(path) {
			await call(`/object/${bucket}/${path}`, { method: 'DELETE' });
		}
	};
}
