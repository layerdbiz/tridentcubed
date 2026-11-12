// The upload helper (spec #179 "Files", stories 67 to 72; ADR 0004; #187): one picked picture on its way to private
// storage. It shows in place at once (`preview`) with an uploading mark (`isUploading`); it is read and shrunk on
// the device, the server is asked for an upload address for the one column it is for (permission checked there),
// the bytes go straight to storage, and only then does `ondone` get the app's file address (`/files/<id>`) for the
// row to keep. A failure says so (`isFailed`, `reason`) and `retry()` starts it again.
//
// Wiring a picture of a record to it is one line: give the picture field its `target` (`{ table, column, id }`), as
// `image-field.svelte` does. Code that is not a field calls `startUpload(file, { for, kind, ondone })`.
import type {
	FileTargetType,
	UploadAnswerType,
	UploadRequestType,
	UploadTargetType
} from './files.schema';
import type { PictureKindType, PreparedPictureType } from './files.utils';

/** The steps an upload takes, each swappable so tests run without a browser, a server or storage. */
export type UploadStepsType = {
	toPreview(file: File): string;
	prepare(file: File, kind: PictureKindType): Promise<PreparedPictureType>;
	ask(request: UploadRequestType): Promise<UploadAnswerType>;
	put(target: UploadTargetType, blob: Blob): Promise<void>;
};

export type UploadOptionsType = {
	/** The table, column and (when made) row the picture is for. */
	for: FileTargetType;
	/** A photo is shrunk to 2048 px as WebP or JPEG; a logo to 1024 px, keeping its clear background. */
	kind: PictureKindType;
	/** Gets the app's file address once the file is in storage: put it in the row. */
	ondone: (address: string) => void;
	steps?: UploadStepsType;
};

const FAILED = 'The upload did not go through. Check the connection and retry.';

async function putFile(target: UploadTargetType, blob: Blob) {
	const response = await fetch(target.url, {
		method: target.method,
		headers: target.headers,
		body: blob
	});
	if (!response.ok) throw new Error(`Storage answered ${response.status}.`);
}

/** The steps in the app: the browser shrinks, the `askUpload` command answers, storage takes a PUT. */
export const BROWSER_STEPS: UploadStepsType = {
	toPreview: (file) => URL.createObjectURL(file),
	prepare: async (file, kind) => (await import('./files.utils')).preparePicture(file, kind),
	ask: async (request) => (await import('./files.remote')).askUpload(request),
	put: putFile
};

export class Upload {
	/** What shows in place while it goes: the picked file itself. */
	preview = $state('');
	isUploading = $state(false);
	isFailed = $state(false);
	reason = $state('');
	#file: File;
	#options: UploadOptionsType;
	#steps: UploadStepsType;
	#prepared?: PreparedPictureType;

	constructor(file: File, options: UploadOptionsType) {
		this.#file = file;
		this.#options = options;
		this.#steps = options.steps ?? BROWSER_STEPS;
	}

	async start() {
		if (this.isUploading) return;
		this.preview ||= this.#steps.toPreview(this.#file);
		this.isUploading = true;
		this.isFailed = false;
		this.reason = '';
		try {
			this.#prepared ??= await this.#steps.prepare(this.#file, this.#options.kind);
			const { blob, width, height, taken } = this.#prepared;
			const answer = await this.#steps.ask({
				for: this.#options.for,
				name: this.#file.name,
				type: blob.type,
				size: blob.size,
				width,
				height,
				taken
			});
			if (!answer.isAllowed) return this.#fail(answer.reason);
			await this.#steps.put(answer.upload, blob);
			this.isUploading = false;
			this.#options.ondone(answer.address);
		} catch {
			this.#fail(FAILED);
		}
	}

	retry() {
		return this.start();
	}

	#fail(reason: string) {
		this.isUploading = false;
		this.isFailed = true;
		this.reason = reason;
	}
}

/** Starts one picture on its way, and gives back its progress to show in place. */
export function startUpload(file: File, options: UploadOptionsType) {
	const upload = new Upload(file, options);
	void upload.start();
	return upload;
}
