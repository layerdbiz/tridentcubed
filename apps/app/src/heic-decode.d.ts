// heic-decode (#294) ships no types: what the server's conversion calls of it (#lib/server/convert.ts). It gives the
// first picture of a HEIC as RGBA pixels, by libheif, which applies the HEIC's own turn.
declare module 'heic-decode' {
	type DecodedType = { width: number; height: number; data: Uint8ClampedArray };
	function decode(input: { buffer: ArrayBufferLike | ArrayBufferView }): Promise<DecodedType>;
	export default decode;
}
