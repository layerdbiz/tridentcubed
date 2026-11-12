// One picture on its way to storage (#187; spec stories 68 and 69): it shows in place at once with an uploading
// mark, the row gets the app's file address only once the bytes are there, and a failed upload says so on the
// picture and can be retried.
import { describe, expect, it } from 'vite-plus/test';
import type { FileTargetType, UploadAnswerType, UploadRequestType } from './files.schema';
import { Upload, type UploadStepsType } from './files.state.svelte';

const FILE_ID = '0b6f2f8e-2b1c-4c47-9d8e-1f4c6f0a1b2c';

function createSteps(answers: Array<'ok' | 'refused' | 'offline'>) {
	const asked: UploadRequestType[] = [];
	const sent: string[] = [];
	const done: string[] = [];
	let release: () => void = () => {};
	const isHeld = { value: false };
	const steps: UploadStepsType = {
		toPreview: () => 'blob:preview',
		async prepare() {
			return {
				blob: new Blob(['webp'], { type: 'image/webp' }),
				width: 2048,
				height: 1536,
				taken: { from: 'file', at: '2026-05-12T09:30:00.000Z' }
			};
		},
		async ask(request): Promise<UploadAnswerType> {
			asked.push(request);
			if (answers[asked.length - 1] === 'refused') {
				return { isAllowed: false, reason: 'Only an Admin can change the organization.' };
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
	return { steps, asked, sent, done, isHeld, release: () => release() };
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
	it('shows in place at once with an uploading mark, then gives the row its file address', async () => {
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
			taken: { from: 'file', at: '2026-05-12T09:30:00.000Z' }
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
		expect(upload.reason).toBe('Only an Admin can change the organization.');
		expect(test.sent).toEqual([]);
		expect(test.done).toEqual([]);
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
});
