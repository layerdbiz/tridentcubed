// One picture on its way to storage (#187; spec stories 68 and 69): it shows in place at once with an uploading
// mark, the row gets the app's file address only once the bytes are there, and a failed upload says so on the
// picture and can be retried.
import { Progress } from '@layerd/ui';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import {
	type ConvertAnswerType,
	type FileDetailsType,
	type ConvertRequestType,
	type FileTargetType,
	PictureError,
	type UploadAnswerType,
	type UploadRequestType
} from './files.schema';
import { fileDetailsOf, Upload, UploadBatch, type UploadStepsType } from './files.state.svelte';
import type { PreparedType } from './files.utils';

const FILE_ID = '0b6f2f8e-2b1c-4c47-9d8e-1f4c6f0a1b2c';

// The original's field list as the device read it (#292), shortened.
const FIELDS = { exif: { Make: { value: ['Apple'], description: 'Apple' } } };

// What the device made of the picked picture: a WebP copy, unless a test says otherwise.
const COPY: PreparedType = {
	blob: new Blob(['webp'], { type: 'image/webp' }),
	width: 2048,
	height: 1536,
	taken: { from: 'file', at: '2026-05-12T09:30:00.000Z' },
	metadata: FIELDS
};

function createSteps(
	answers: Array<'ok' | 'refused' | 'offline'>,
	options: { prepared?: PreparedType | Error; converted?: ConvertAnswerType[] } = {}
) {
	const asked: UploadRequestType[] = [];
	const sent: string[] = [];
	const done: string[] = [];
	const converting: ConvertRequestType[] = [];
	let release: () => void = () => {};
	const isHeld = { value: false };
	const isConvertHeld = { value: false };
	const steps: UploadStepsType = {
		toPreview: () => 'blob:preview',
		async prepare() {
			if (options.prepared instanceof Error) throw options.prepared;
			return options.prepared ?? COPY;
		},
		async convert(request) {
			converting.push(request);
			const answer = options.converted?.[converting.length - 1] ?? { isDone: true };
			if (isConvertHeld.value) await new Promise<void>((resolve) => (release = resolve));
			if (!answer.isDone && answer.reason === 'offline') throw new TypeError('Failed to fetch');
			return answer;
		},
		async ask(request): Promise<UploadAnswerType> {
			asked.push(request);
			if (answers[asked.length - 1] === 'refused') {
				return {
					isAllowed: false,
					reason: 'Only an Admin or a Manager can change the organization.'
				};
			}
			return {
				isAllowed: true,
				id: FILE_ID,
				address: `/files/${FILE_ID}`,
				upload: { method: 'PUT', url: `/local-files/x?try=${asked.length}`, headers: {} }
			};
		},
		async put(target) {
			if (isHeld.value) await new Promise<void>((resolve) => (release = resolve));
			if (answers[asked.length - 1] === 'offline') throw new TypeError('Failed to fetch');
			sent.push(target.url);
		}
	};
	return {
		steps,
		asked,
		sent,
		done,
		converting,
		isHeld,
		isConvertHeld,
		release: () => release()
	};
}

function pick() {
	return new File(['raw'], 'IMG_0001.HEIC.jpg', { type: 'image/jpeg' });
}

const LOGO: FileTargetType = {
	table: 'customer',
	column: 'logo',
	id: '5f0e1c2a-3b4d-4e5f-8a9b-0c1d2e3f4a5b'
};

describe('a picture on its way', () => {
	it('shows in place at once with an uploading mark, then gives the row its file address and field list', async () => {
		const test = createSteps(['ok']);
		test.isHeld.value = true;
		const upload = new Upload(pick(), {
			for: LOGO,
			kind: 'photo',
			ondone: (address) => test.done.push(address),
			steps: test.steps
		});

		const running = upload.start();
		expect(upload.preview).toBe('blob:preview');
		expect(upload.isUploading).toBe(true);
		expect(test.done).toEqual([]);

		await new Promise((resolve) => setTimeout(resolve, 0));
		test.release();
		await running;
		expect(upload.isUploading).toBe(false);
		expect(upload.isFailed).toBe(false);
		expect(test.done).toEqual([`/files/${FILE_ID}`]);
		expect(test.asked[0]).toEqual({
			for: LOGO,
			name: 'IMG_0001.HEIC.jpg',
			type: 'image/webp',
			size: 4,
			width: 2048,
			height: 1536,
			taken: { from: 'file', at: '2026-05-12T09:30:00.000Z' },
			metadata: FIELDS
		});
	});

	it('says so on the picture when the upload fails, and sends it again on Retry', async () => {
		const test = createSteps(['offline', 'ok']);
		const upload = new Upload(pick(), {
			for: LOGO,
			kind: 'photo',
			ondone: (address) => test.done.push(address),
			steps: test.steps
		});

		await upload.start();
		expect(upload.isFailed).toBe(true);
		expect(upload.reason).toBe('The upload did not go through. Check the connection and retry.');
		expect(test.done).toEqual([]);

		await upload.retry();
		expect(upload.isFailed).toBe(false);
		expect(test.sent).toEqual(['/local-files/x?try=2']);
		expect(test.done).toEqual([`/files/${FILE_ID}`]);
	});

	it('shows the reason when the server refuses an upload address', async () => {
		const test = createSteps(['refused']);
		const upload = new Upload(pick(), {
			for: { table: 'organization_details', column: 'logo' },
			kind: 'logo',
			ondone: (address) => test.done.push(address),
			steps: test.steps
		});

		await upload.start();

		expect(upload.isFailed).toBe(true);
		expect(upload.reason).toBe('Only an Admin or a Manager can change the organization.');
		expect(test.sent).toEqual([]);
		expect(test.done).toEqual([]);
	});
});

describe('a picture the server converts (#294)', () => {
	// A HEIC Chrome cannot read on Windows: the device sends it untouched, typed by its name.
	const UNTOUCHED: PreparedType = {
		blob: new Blob(['heic'], { type: 'image/heic' }),
		taken: { from: 'file', at: '2026-05-12T09:30:00.000Z' },
		metadata: FIELDS,
		isUnreadable: true,
		shouldConvert: true
	};

	function pickHeic() {
		return new File(['heic'], 'IMG_0001.HEIC', { type: '' });
	}

	it('goes untouched, shows its name with a converting mark, and reaches the row once converted', async () => {
		const test = createSteps(['ok'], { prepared: UNTOUCHED });
		const upload = new Upload(pickHeic(), {
			for: LOGO,
			kind: 'photo',
			ondone: (address) => test.done.push(address),
			steps: test.steps
		});
		test.isConvertHeld.value = true;

		const running = upload.start();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(upload.name).toBe('IMG_0001.HEIC');
		expect(upload.hasPreview).toBe(false);
		expect(upload.isConverting).toBe(true);
		expect(upload.isUploading).toBe(true);
		expect(test.done).toEqual([]);

		test.release();
		await running;
		expect(test.asked[0]).toMatchObject({ name: 'IMG_0001.HEIC', type: 'image/heic', size: 4 });
		expect(test.asked[0].width).toBeUndefined();
		expect(test.converting).toEqual([{ id: FILE_ID }]);
		expect(upload.isConverting).toBe(false);
		expect(upload.isUploading).toBe(false);
		expect(test.done).toEqual([`/files/${FILE_ID}`]);
	});

	it('asks only for the converting again on Retry, once the file is in storage', async () => {
		const test = createSteps(['ok'], {
			prepared: UNTOUCHED,
			converted: [{ isDone: false, reason: 'offline' }, { isDone: true }]
		});
		const upload = new Upload(pickHeic(), {
			for: LOGO,
			kind: 'photo',
			ondone: (address) => test.done.push(address),
			steps: test.steps
		});

		await upload.start();
		expect(upload.isFailed).toBe(true);
		expect(upload.isConverting).toBe(false);
		expect(upload.reason).toBe('The upload did not go through. Check the connection and retry.');

		await upload.retry();
		expect(test.asked).toHaveLength(1);
		expect(test.sent).toHaveLength(1);
		expect(test.converting).toHaveLength(2);
		expect(test.done).toEqual([`/files/${FILE_ID}`]);
	});

	it('shows the server’s reason when it cannot convert the picture', async () => {
		const reason = 'This picture could not be read. Save it as a JPEG and add it again.';
		const test = createSteps(['ok'], {
			prepared: UNTOUCHED,
			converted: [{ isDone: false, reason }]
		});
		const upload = new Upload(pickHeic(), {
			for: LOGO,
			kind: 'photo',
			ondone: (address) => test.done.push(address),
			steps: test.steps
		});

		await upload.start();

		expect(upload.isFailed).toBe(true);
		expect(upload.reason).toBe(reason);
		expect(test.done).toEqual([]);
	});

	it('does not ask the server when the device’s own copy is what goes', async () => {
		const test = createSteps(['ok']);
		const upload = new Upload(pick(), {
			for: LOGO,
			kind: 'photo',
			ondone: (address) => test.done.push(address),
			steps: test.steps
		});

		await upload.start();

		expect(upload.hasPreview).toBe(true);
		expect(test.converting).toEqual([]);
		expect(test.done).toEqual([`/files/${FILE_ID}`]);
	});

	it('shows the reason the device turned a picture down, and sends nothing', async () => {
		const reason = 'This picture cannot be read here. Save it as a JPEG and add it again.';
		const test = createSteps(['ok'], { prepared: new PictureError(reason) });
		const upload = new Upload(new File(['raw'], 'IMG_0001.CR2'), {
			for: LOGO,
			kind: 'photo',
			ondone: (address) => test.done.push(address),
			steps: test.steps
		});

		await upload.start();

		expect(upload.isFailed).toBe(true);
		expect(upload.reason).toBe(reason);
		expect(test.asked).toEqual([]);
	});
});

describe('a document on its way (#188)', () => {
	it('goes as it came, unshrunk, with its type read from its name when the browser gives none', async () => {
		const test = createSteps(['ok']);
		const sheet = new File(['qty,item\n2,Transformers\n'], 'Manifest.CSV', { type: '' });
		const upload = new Upload(sheet, {
			for: { table: 'item_attachment', column: 'file', id: FILE_ID },
			kind: 'document',
			ondone: (address) => test.done.push(address),
			steps: test.steps
		});

		await upload.start();

		expect(test.asked[0]).toEqual({
			for: { table: 'item_attachment', column: 'file', id: FILE_ID },
			name: 'Manifest.CSV',
			type: 'text/csv',
			size: 24,
			taken: { from: '' }
		});
		expect(test.done).toEqual([`/files/${FILE_ID}`]);
	});

	it('goes as a plain file when neither the browser nor its name says what it is (#233)', async () => {
		const test = createSteps(['ok']);
		const list = new File(['packing list'], 'Main Unit and Tower PL.numbers', { type: '' });
		const upload = new Upload(list, {
			for: { table: 'item_attachment', column: 'file', id: FILE_ID },
			kind: 'document',
			ondone: (address) => test.done.push(address),
			steps: test.steps
		});

		await upload.start();

		expect(test.asked[0]).toMatchObject({
			name: 'Main Unit and Tower PL.numbers',
			type: 'application/octet-stream'
		});
		expect(test.done).toEqual([`/files/${FILE_ID}`]);
	});
});

describe('photos picked together (#293)', () => {
	// Every photo's trip to storage waits until the test lets it go, one at a time, by the photo's name. A name ending
	// in .HEIC goes untouched and waits again while the server converts it; a name in `failing` fails its first send.
	function createHeldSteps(failing: string[] = []) {
		const waiting = new Map<string, () => void>();
		const tries = new Map<string, number>();
		const asked: string[] = [];
		function hold(name: string) {
			return new Promise<void>((resolve) => waiting.set(name, resolve));
		}
		const steps: UploadStepsType = {
			toPreview: () => 'blob:preview',
			async prepare(file) {
				if (!file.name.endsWith('.HEIC')) return COPY;
				return { ...COPY, blob: new Blob(['heic'], { type: 'image/heic' }), shouldConvert: true };
			},
			async ask(request) {
				asked.push(request.name);
				return {
					isAllowed: true,
					id: FILE_ID,
					address: `/files/${request.name}`,
					upload: { method: 'PUT', url: `/local-files/${request.name}`, headers: {} }
				};
			},
			async put(target) {
				const name = target.url.split('/').at(-1)!;
				tries.set(name, (tries.get(name) ?? 0) + 1);
				await hold(name);
				if (failing.includes(name) && tries.get(name) === 1) throw new TypeError('Failed to fetch');
			},
			async convert() {
				await hold('server');
				return { isDone: true };
			}
		};
		// Lets the named photo's waiting step finish, and gives the batch time to hear of it.
		async function release(name: string) {
			await settle();
			const resolve = waiting.get(name);
			waiting.delete(name);
			resolve?.();
			await settle();
		}
		return { steps, asked, release };
	}

	function settle() {
		return new Promise((resolve) => setTimeout(resolve, 0));
	}

	function photo(name: string) {
		return new File(['raw'], name, { type: 'image/jpeg' });
	}

	let toast: Progress;
	afterEach(() => toast.close());

	function pickTogether(names: string[], test: ReturnType<typeof createHeldSteps>) {
		toast = new Progress();
		const batch = new UploadBatch(toast);
		for (const name of names) {
			batch.add(photo(name), { for: LOGO, kind: 'photo', ondone: () => {}, steps: test.steps });
		}
		return batch;
	}

	it('share one toast that counts them as each is stored, and says when all are', async () => {
		const test = createHeldSteps();
		pickTogether(['a.jpg', 'b.jpg', 'c.jpg'], test);
		expect(toast.isOpen).toBe(true);
		expect(toast.label).toBe('Uploading 1 of 3 photos');
		expect(toast.percent).toBe(0);

		await test.release('a.jpg');
		expect(toast.label).toBe('Uploading 2 of 3 photos');
		expect(toast.percent).toBe(33);

		await test.release('c.jpg');
		await test.release('b.jpg');
		expect(toast.label).toBe('3 photos uploaded');
		expect(toast.percent).toBe(100);
	});

	it('says Converting while the server converts one of them', async () => {
		const test = createHeldSteps();
		pickTogether(['a.jpg', 'b.HEIC'], test);
		await test.release('a.jpg');
		await test.release('b.HEIC');
		expect(toast.label).toBe('Converting 2 of 2 photos');
		expect(toast.isBusy).toBe(true);

		await test.release('server');
		expect(toast.label).toBe('2 photos uploaded');
	});

	it('counts one photo alone as one', async () => {
		const test = createHeldSteps();
		pickTogether(['a.jpg'], test);
		expect(toast.label).toBe('Uploading 1 photo');
		await test.release('a.jpg');
		expect(toast.label).toBe('1 photo uploaded');
	});

	it('stays open when one does not go, and Try Again sends only that one', async () => {
		const test = createHeldSteps(['b.jpg']);
		const batch = pickTogether(['a.jpg', 'b.jpg', 'c.jpg'], test);
		await test.release('a.jpg');
		await test.release('b.jpg');
		await test.release('c.jpg');
		expect(toast.isOpen).toBe(true);
		expect(toast.problem).toBe(
			'1 of 3 photos did not upload. The upload did not go through. Check the connection and retry.'
		);
		expect(batch.uploads.map((upload) => upload.isFailed)).toEqual([false, true, false]);

		toast.retry();
		expect(toast.problem).toBe('');
		expect(toast.label).toBe('Uploading 3 of 3 photos');
		await test.release('b.jpg');
		expect(test.asked).toEqual(['a.jpg', 'b.jpg', 'c.jpg', 'b.jpg']);
		expect(toast.label).toBe('3 photos uploaded');
	});

	it('stops counting a photo deleted on its way, and Try Again never sends it', async () => {
		const test = createHeldSteps(['b.jpg']);
		toast = new Progress();
		const batch = new UploadBatch(toast);
		const kept = new Set(['a.jpg', 'b.jpg', 'c.jpg']);
		for (const name of kept) {
			batch.add(
				photo(name),
				{ for: LOGO, kind: 'photo', ondone: () => {}, steps: test.steps },
				() => kept.has(name)
			);
		}
		await test.release('a.jpg');
		await test.release('b.jpg');
		await test.release('c.jpg');
		expect(toast.problem).toBe(
			'1 of 3 photos did not upload. The upload did not go through. Check the connection and retry.'
		);

		kept.delete('b.jpg');
		toast.retry();
		expect(test.asked).toEqual(['a.jpg', 'b.jpg', 'c.jpg']);
		expect(toast.label).toBe('2 photos uploaded');
	});

	it('comes back when a photo is tried again from its own mark after the toast was closed', async () => {
		const test = createHeldSteps(['a.jpg']);
		const batch = pickTogether(['a.jpg'], test);
		await test.release('a.jpg');
		expect(toast.problem).toBe('The upload did not go through. Check the connection and retry.');
		toast.close();

		void batch.uploads[0].retry();
		expect(toast.isOpen).toBe(true);
		expect(toast.label).toBe('Uploading 1 photo');
		await test.release('a.jpg');
		expect(toast.label).toBe('1 photo uploaded');
	});
});

describe('what a picture was and became (#343)', () => {
	it('tells the server what the User picked and whether its metadata came across', async () => {
		const original = { type: 'image/heic', size: 3_000_000, width: 4032, height: 3024 };
		const test = createSteps(['ok'], { prepared: { ...COPY, original, carried: 'all' } });
		const upload = new Upload(pick(), {
			for: LOGO,
			kind: 'photo',
			ondone: () => {},
			steps: test.steps
		});

		await upload.start();

		expect(test.asked[0]).toMatchObject({ type: 'image/webp', original, carried: 'all' });
	});
});

describe('a stored file’s details (#343, #349)', () => {
	const DETAILS: FileDetailsType = {
		name: 'IMG_0001.HEIC',
		original: { type: 'image/heic', size: 3_000_000 },
		saved: { type: 'image/webp', size: 600_000 },
		carried: 'all',
		hasFieldList: true,
		isOriginalKept: false
	};

	it('asks the server once for each file, and gives back what it found once it answers', async () => {
		const id = '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
		const asked: string[] = [];
		const ask = async (each: string) => {
			asked.push(each);
			return DETAILS;
		};

		expect(fileDetailsOf(`/files/${id}`, ask)).toBeUndefined();
		expect(fileDetailsOf(`/files/${id}`, ask)).toBeUndefined();
		await Promise.resolve();

		expect(fileDetailsOf(`/files/${id}`, ask)).toEqual(DETAILS);
		expect(asked).toEqual([id]);
	});

	it('asks nothing for a starting file or a picture still on its way', () => {
		const asked: string[] = [];
		const ask = async (each: string) => {
			asked.push(each);
			return null;
		};

		expect(fileDetailsOf('/start/photos/dock.webp', ask)).toBeUndefined();
		expect(fileDetailsOf('blob:preview', ask)).toBeUndefined();
		expect(asked).toEqual([]);
	});

	it('asks again next time when the server could not be reached', async () => {
		const id = '8b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5e';
		let tries = 0;
		const ask = async () => {
			tries += 1;
			if (tries === 1) throw new TypeError('Failed to fetch');
			return DETAILS;
		};

		fileDetailsOf(`/files/${id}`, ask);
		await new Promise((resolve) => setTimeout(resolve));
		fileDetailsOf(`/files/${id}`, ask);
		await new Promise((resolve) => setTimeout(resolve));

		expect(fileDetailsOf(`/files/${id}`, ask)).toEqual(DETAILS);
		expect(tries).toBe(2);
	});
});
