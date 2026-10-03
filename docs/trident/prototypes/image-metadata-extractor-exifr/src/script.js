const elements = {
	app: document.getElementById('app'),
	fileInput: document.getElementById('fileInput'),
	cameraInput: document.getElementById('cameraInput'),
	cameraButton: document.getElementById('cameraButton'),
	cameraTools: document.getElementById('cameraTools'),
	emptyState: document.getElementById('emptyState'),
	cameraPreview: document.getElementById('cameraPreview'),
	cameraCanvas: document.getElementById('cameraCanvas'),
	captureButton: document.getElementById('captureButton'),
	switchCameraButton: document.getElementById('switchCameraButton'),
	closeCameraButton: document.getElementById('closeCameraButton'),
	metadataButton: document.getElementById('metadataButton'),
	metadataOverlay: document.getElementById('metadataOverlay'),
	closeMetadataButton: document.getElementById('closeMetadataButton'),
	status: document.getElementById('status'),
	summary: document.getElementById('summary'),
	fileName: document.getElementById('fileName'),
	dateTaken: document.getElementById('dateTaken'),
	location: document.getElementById('location'),
	output: document.getElementById('output'),
	preview: document.getElementById('preview'),
};

const state = {
	stream: null,
	facingMode: 'environment',
	previewUrl: null,
};

const exifrOptions = {
	tiff: true,
	ifd0: true,
	exif: true,
	gps: true,
	xmp: true,
	icc: true,
	iptc: true,
	jfif: true,
	ihdr: true,
	mergeOutput: true,
	translateKeys: true,
	translateValues: true,
	reviveValues: true,
	sanitize: true,
};

function toPrettyJson(value) {
	return JSON.stringify(value, null, 2);
}

function setStatus(message = '', type = '') {
	elements.status.textContent = message;
	elements.status.dataset.type = type;
}

function setBusy(isBusy) {
	elements.fileInput.disabled = isBusy;
	elements.cameraInput.disabled = isBusy;
	elements.cameraButton.disabled = isBusy;
	elements.captureButton.disabled = isBusy;
	elements.switchCameraButton.disabled = isBusy;
	elements.metadataButton.disabled = isBusy || elements.output.textContent.trim() === '';
}

function setCameraMode(isCameraMode) {
	elements.cameraPreview.hidden = !isCameraMode;
	elements.cameraTools.hidden = !isCameraMode;
	elements.emptyState.hidden = isCameraMode || !elements.preview.hidden;
}

function isMobileLike() {
	if (typeof navigator.userAgentData?.mobile === 'boolean') {
		return navigator.userAgentData.mobile;
	}

	const userAgent = navigator.userAgent;
	const isTouchMac = navigator.maxTouchPoints > 1 && /Macintosh/i.test(userAgent);

	return /Android|iPhone|iPad|iPod/i.test(userAgent) || isTouchMac;
}

function hasSecureCameraApi() {
	return window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia);
}

function isImageFile(file) {
	if (!file) return false;
	if (file.type.startsWith('image/')) return true;

	return /\.(avif|gif|heic|heif|jpe?g|png|tiff?|webp)$/i.test(file.name);
}

function toFileSize(bytes) {
	if (!Number.isFinite(bytes)) return 'Unknown';

	const units = ['B', 'KB', 'MB', 'GB'];
	let size = bytes;
	let unit = units[0];

	for (const nextUnit of units) {
		unit = nextUnit;

		if (size < 1024 || nextUnit === units.at(-1)) break;

		size = size / 1024;
	}

	return `${size.toFixed(size >= 10 || unit === 'B' ? 0 : 1)} ${unit}`;
}

function toExtension(type) {
	const extensionByType = {
		'image/avif': 'avif',
		'image/gif': 'gif',
		'image/heic': 'heic',
		'image/heif': 'heif',
		'image/jpeg': 'jpg',
		'image/png': 'png',
		'image/tiff': 'tiff',
		'image/webp': 'webp',
	};

	return extensionByType[type] ?? 'jpg';
}

function toPhotoName(type) {
	const stamp = new Date().toISOString().replace(/:/g, '-').replace(/\.\d{3}Z$/, 'Z');
	const extension = toExtension(type);

	return `camera-photo-${stamp}.${extension}`;
}

function toNumber(value) {
	if (typeof value === 'number' && Number.isFinite(value)) return value;

	if (typeof value === 'string') {
		const parsed = Number.parseFloat(value);
		return Number.isFinite(parsed) ? parsed : null;
	}

	return null;
}

function toDecimalFromDms(value, ref) {
	if (!Array.isArray(value) || value.length < 3) return null;

	const degrees = toNumber(value[0]);
	const minutes = toNumber(value[1]);
	const seconds = toNumber(value[2]);

	if (degrees === null || minutes === null || seconds === null) return null;

	const sign = ref === 'S' || ref === 'W' ? -1 : 1;

	return sign * (degrees + minutes / 60 + seconds / 3600);
}

function toCoordinates(meta) {
	const latitude =
		toNumber(meta.latitude) ??
		toNumber(meta.GPSLatitude) ??
		toDecimalFromDms(meta.GPSLatitude, meta.GPSLatitudeRef);

	const longitude =
		toNumber(meta.longitude) ??
		toNumber(meta.GPSLongitude) ??
		toDecimalFromDms(meta.GPSLongitude, meta.GPSLongitudeRef);

	if (latitude === null || longitude === null) return null;

	return {
		latitude,
		longitude,
	};
}

function formatCoordinate(value) {
	if (typeof value !== 'number' || Number.isNaN(value)) return null;

	return value.toFixed(6);
}

function formatDateTaken(meta) {
	const dateValue =
		meta.DateTimeOriginal ??
		meta.CreateDate ??
		meta.DateTimeDigitized ??
		meta.ModifyDate ??
		meta.DateTime ??
		null;

	if (!dateValue) return 'No date metadata found';

	if (dateValue instanceof Date) return dateValue.toISOString();

	return String(dateValue);
}

function readImageSize(url) {
	return new Promise((resolve, reject) => {
		const image = new Image();

		image.onload = () => {
			resolve({
				width: image.naturalWidth,
				height: image.naturalHeight,
			});
		};

		image.onerror = () => {
			reject(new Error('Preview is not supported for this image type in this browser.'));
		};

		image.src = url;
	});
}

async function setPreview(file) {
	if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);

	const url = URL.createObjectURL(file);
	state.previewUrl = url;

	elements.preview.src = url;
	elements.preview.hidden = false;
	elements.emptyState.hidden = true;

	try {
		return await readImageSize(url);
	} catch (error) {
		return {
			error: error.message,
		};
	}
}

async function readExif(file) {
	if (!window.exifr) {
		throw new Error('exifr did not load. Check the CDN script in the HTML panel.');
	}

	try {
		return (await exifr.parse(file, exifrOptions)) ?? {};
	} catch (error) {
		return {
			parserError: error.message,
		};
	}
}

function updateSummary(file, meta) {
	const coordinates = toCoordinates(meta);
	const latitude = coordinates ? formatCoordinate(coordinates.latitude) : null;
	const longitude = coordinates ? formatCoordinate(coordinates.longitude) : null;

	elements.fileName.textContent = file.name;
	elements.dateTaken.textContent = formatDateTaken(meta);
	elements.location.textContent =
		latitude && longitude ? `${latitude}, ${longitude}` : 'No GPS metadata found';

	elements.summary.hidden = false;
	elements.metadataButton.hidden = false;
	elements.metadataButton.disabled = false;
}

function toFileInfo(file, source) {
	return {
		name: file.name,
		type: file.type || 'unknown',
		size: file.size,
		sizeFormatted: toFileSize(file.size),
		lastModified: new Date(file.lastModified).toISOString(),
		source,
	};
}

async function handleImageFile(file, source = 'file input') {
	if (!isImageFile(file)) {
		setStatus('Please choose an image file.', 'error');
		return;
	}

	setBusy(true);
	setStatus('Reading image metadata...');

	try {
		const image = await setPreview(file);
		const metadata = await readExif(file);
		const result = {
			file: toFileInfo(file, source),
			image,
			metadata,
		};

		updateSummary(file, metadata);

		elements.output.textContent = toPrettyJson(result);
		setStatus('');
	} catch (error) {
		elements.output.textContent = error.stack ?? error.message;
		elements.metadataButton.hidden = false;
		elements.metadataButton.disabled = false;
		setStatus(error.message, 'error');
	} finally {
		setBusy(false);
	}
}

async function handleFileInputChange(event, source) {
	const file = event.target.files?.[0];

	await handleImageFile(file, source);

	event.target.value = '';
}

function stopCamera() {
	if (state.stream) {
		for (const track of state.stream.getTracks()) {
			track.stop();
		}
	}

	state.stream = null;
	elements.cameraPreview.srcObject = null;
	setCameraMode(false);
}

async function openCamera() {
	if (!hasSecureCameraApi()) {
		setStatus('Camera API needs HTTPS. Opening the file picker instead.', 'error');
		elements.cameraInput.click();
		return;
	}

	stopCamera();

	try {
		state.stream = await navigator.mediaDevices.getUserMedia({
			audio: false,
			video: {
				facingMode: {
					ideal: state.facingMode,
				},
				width: {
					ideal: 1920,
				},
				height: {
					ideal: 1080,
				},
			},
		});

		elements.cameraPreview.srcObject = state.stream;
		elements.preview.hidden = true;
		setCameraMode(true);

		await elements.cameraPreview.play();

		setStatus('');
		elements.captureButton.focus();
	} catch (error) {
		setStatus('Camera unavailable. Opening the file picker instead.', 'error');
		elements.cameraInput.click();
	}
}

async function getPhotoFileFromImageCapture() {
	const track = state.stream?.getVideoTracks?.()[0];

	if (!track || !window.ImageCapture) return null;

	try {
		const imageCapture = new ImageCapture(track);
		const blob = await imageCapture.takePhoto();
		const type = blob.type || 'image/jpeg';

		return new File([blob], toPhotoName(type), {
			type,
			lastModified: Date.now(),
		});
	} catch (error) {
		console.warn('ImageCapture failed. Falling back to canvas.', error);
		return null;
	}
}

function getCanvasPhotoBlob(canvas) {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) {
					resolve(blob);
					return;
				}

				reject(new Error('Could not capture photo from canvas.'));
			},
			'image/jpeg',
			0.92
		);
	});
}

async function getPhotoFileFromCanvas() {
	const video = elements.cameraPreview;
	const canvas = elements.cameraCanvas;
	const context = canvas.getContext('2d');

	if (!video.videoWidth || !video.videoHeight || !context) {
		throw new Error('Camera is not ready yet.');
	}

	canvas.width = video.videoWidth;
	canvas.height = video.videoHeight;

	context.drawImage(video, 0, 0, canvas.width, canvas.height);

	const blob = await getCanvasPhotoBlob(canvas);

	return new File([blob], toPhotoName(blob.type), {
		type: blob.type,
		lastModified: Date.now(),
	});
}

async function captureCameraPhoto() {
	setBusy(true);
	setStatus('Capturing photo...');

	try {
		const file = (await getPhotoFileFromImageCapture()) ?? (await getPhotoFileFromCanvas());

		stopCamera();
		await handleImageFile(file, 'webcam capture');
	} catch (error) {
		setStatus(error.message, 'error');
	} finally {
		setBusy(false);
	}
}

async function switchCamera() {
	state.facingMode = state.facingMode === 'environment' ? 'user' : 'environment';

	await openCamera();
}

async function handleCameraButtonClick() {
	if (isMobileLike()) {
		elements.cameraInput.click();
		return;
	}

	await openCamera();
}

function openMetadataOverlay() {
	if (elements.metadataOverlay.open) return;

	elements.app.classList.add('is-metadata-open');

	if (typeof elements.metadataOverlay.showModal === 'function') {
		elements.metadataOverlay.showModal();
		return;
	}

	elements.metadataOverlay.setAttribute('open', '');
}

function closeMetadataOverlay() {
	if (typeof elements.metadataOverlay.close === 'function') {
		elements.metadataOverlay.close();
		return;
	}

	elements.metadataOverlay.removeAttribute('open');
	elements.app.classList.remove('is-metadata-open');
}

elements.fileInput.addEventListener('change', (event) => {
	handleFileInputChange(event, 'file input');
});

elements.cameraInput.addEventListener('change', (event) => {
	handleFileInputChange(event, 'native camera capture');
});

elements.cameraButton.addEventListener('click', handleCameraButtonClick);
elements.captureButton.addEventListener('click', captureCameraPhoto);
elements.switchCameraButton.addEventListener('click', switchCamera);
elements.closeCameraButton.addEventListener('click', stopCamera);
elements.metadataButton.addEventListener('click', openMetadataOverlay);
elements.closeMetadataButton.addEventListener('click', closeMetadataOverlay);

elements.metadataOverlay.addEventListener('close', () => {
	elements.app.classList.remove('is-metadata-open');
});

window.addEventListener('pagehide', stopCamera);