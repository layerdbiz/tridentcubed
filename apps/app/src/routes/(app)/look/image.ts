// PROTOTYPE (#161): a picked image comes back small enough for the browser to keep: at most `max` px on its long
// side. A photo is a JPEG; a logo stays a PNG so its clear background survives (run 15).
export async function shrink(file: File, max = 1280, kind: 'photo' | 'logo' = 'photo') {
	try {
		const bitmap = await createImageBitmap(file);
		const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
		const canvas = document.createElement('canvas');
		canvas.width = Math.round(bitmap.width * scale);
		canvas.height = Math.round(bitmap.height * scale);
		canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
		bitmap.close();
		return kind === 'logo' ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.78);
	} catch {
		return URL.createObjectURL(file);
	}
}
