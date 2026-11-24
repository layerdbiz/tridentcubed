// The upload helper (spec #179 "Files", stories 67 to 72; ADR 0004; #187): one picked picture on its way to private
// storage. It shows in place at once (`preview`) with an uploading mark (`isUploading`); it is read and shrunk on
// the device (its full field list read too, for the File row, #292), the server is asked for an upload address for the one column it is for (permission checked there),
// the bytes go straight to storage, and only then does `ondone` get the app's file address (`/files/<id>`) for the
// row to keep. A picture the device could not read goes untouched and the server converts it (#294): its spot shows
// its name (`hasPreview` false) with a converting mark (`isConverting`), and the row gets its address only once the
// server is done. A failure says so (`isFailed`, `reason`) and `retry()` starts it again, from the converting when
// the bytes are already in storage.
//
// Wiring a picture of a record to it is one line: give the picture field its `target` (`{ table, column, id }`), as
// `image-field.svelte` does. Code that is not a field calls `startUpload(file, { for, kind, ondone })`.
import {
	type ConvertAnswerType,
	CONVERT_PATH,
	type ConvertRequestType,
	type FileTargetType,
	PictureError,
	type PictureKindType,
	toDocumentType,
	type UploadAnswerType,
	type UploadRequestType,
	type UploadTargetType
} from './files.schema';
import type { PreparedPictureType } from './files.utils';

/** A picture is shrunk first; a document (the item list as a file of any kind, #188, #233) goes as it came. */
export type UploadKindType = PictureKindType | 'document';

// A document is sent as it is, with its type read from its name when the browser gives none; a name that says
// nothing either makes it a plain file (`ANY_TYPE`).
function asDocument(file: File): PreparedPictureType {
	const type = file.type.split(';')[0].trim() || toDocumentType(file.name);
	const blob = type === file.type ? file : new Blob([file], { type });
	return { blob, taken: { from: '' } };
}

/** The steps an upload takes, each swappable so tests run without a browser, a server or storage. */
export type UploadStepsType = {
	toPreview(file: File): string;
	prepare(file: File, kind: PictureKindType): Promise<PreparedPictureType>;
	ask(request: UploadRequestType): Promise<UploadAnswerType>;
	put(target: UploadTargetType, blob: Blob): Promise<void>;
	/** Asks the server to convert a picture sent untouched (#294). */
	convert(request: ConvertRequestType): Promise<ConvertAnswerType>;
};

export type UploadOptionsType = {
	/** The table, column and (when made) row the picture is for. */
	for: FileTargetType;
	/**
	 * A photo is shrunk to 2048 px as WebP or JPEG; a logo to 1024 px, keeping its clear background; a document is
	 * sent as it is.
	 */
	kind: UploadKindType;
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

// The server's answer, or a lost connection when it gave none (a timed-out function answers with a page, not JSON).
async function askConvert(request: ConvertRequestType): Promise<ConvertAnswerType> {
	const response = await fetch(CONVERT_PATH, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(request)
	});
	const answer: unknown = await response.json().catch(() => undefined);
	if (answer && typeof answer === 'object' && 'isDone' in answer) {
		return answer as ConvertAnswerType;
	}
	throw new Error(`The server answered ${response.status}.`);
}

/** The steps in the app: the browser shrinks, the `askUpload` command answers, storage takes a PUT. */
export const BROWSER_STEPS: UploadStepsType = {
	toPreview: (file) => URL.createObjectURL(file),
	prepare: async (file, kind) => (await import('./files.utils')).preparePicture(file, kind),
	ask: async (request) => (await import('./files.remote')).askUpload(request),
	put: putFile,
	convert: askConvert
};

export class Upload {
	/** What shows in place while it goes: the picked file itself. */
	preview = $state('');
	/** Whether the device can draw the picked file; when it cannot (a HEIC in Chrome), its spot shows its name. */
	hasPreview = $state(true);
	isUploading = $state(false);
	/** The server is converting it (#294). */
	isConverting = $state(false);
	isFailed = $state(false);
	reason = $state('');
	#file: File;
	#options: UploadOptionsType;
	#steps: UploadStepsType;
	#prepared?: PreparedPictureType;
	// The file's id and address once its bytes are in storage, so a Retry only converts.
	#sent?: { id: string; address: string };

	constructor(file: File, options: UploadOptionsType) {
		this.#file = file;
		this.#options = options;
		this.#steps = options.steps ?? BROWSER_STEPS;
	}

	/** The name it was picked with: what its spot shows while the device cannot draw it. */
	get name() {
		return this.#file.name;
	}

	async start() {
		if (this.isUploading) return;
		this.preview ||= this.#steps.toPreview(this.#file);
		this.isUploading = true;
		this.isFailed = false;
		this.reason = '';
		try {
			const { kind } = this.#options;
			this.#prepared ??=
				kind === 'document' ? asDocument(this.#file) : await this.#steps.prepare(this.#file, kind);
			const prepared = this.#prepared;
			if (prepared.isUnreadable) this.hasPreview = false;
			this.#sent ??= await this.#send(prepared);
			if (!this.#sent) return;
			if (prepared.shouldConvert && kind !== 'document') {
				this.isConverting = true;
				const answer = await this.#steps.convert({ id: this.#sent.id, kind });
				this.isConverting = false;
				if (!answer.isDone) return this.#fail(answer.reason);
			}
			this.isUploading = false;
			this.#options.ondone(this.#sent.address);
		} catch (error) {
			this.#fail(error instanceof PictureError ? error.message : FAILED);
		}
	}

	// Asks for an upload address and sends the bytes there; nothing when the server refuses, with its reason shown.
	async #send({ blob, width, height, taken, metadata }: PreparedPictureType) {
		const answer = await this.#steps.ask({
			for: this.#options.for,
			name: this.#file.name,
			type: blob.type,
			size: blob.size,
			width,
			height,
			taken,
			...(metadata ? { metadata } : {})
		});
		if (!answer.isAllowed) {
			this.#fail(answer.reason);
			return undefined;
		}
		await this.#steps.put(answer.upload, blob);
		return { id: answer.id, address: answer.address };
	}

	retry() {
		return this.start();
	}

	#fail(reason: string) {
		this.isUploading = false;
		this.isConverting = false;
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
