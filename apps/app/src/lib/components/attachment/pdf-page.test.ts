// A PDF's page on a report page (#327, #295): as it came, it prints as the PDF's own page; turned, mirrored,
// straightened or cut, it prints as the picture its edit makes. Picking Original alone changes nothing on the page, so
// the page still prints as it came (Justin, 2026-11-28: PDF pages went blank after Original).
import { render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vite-plus/test';
import type { EditType, FrameType } from '#lib/components/photo/edit.js';
import PdfPage from './pdf-page.svelte';

vi.mock('#lib/pdf/pdf.state.svelte.js', () => ({
	pageShapeOf: () => ({ width: 595, height: 842 })
}));
vi.mock('#lib/pdf/pdf.utils.js', () => ({
	pageOf: () => new Promise(() => {}),
	toDrawnWidth: (width: number) => width
}));

function printsAsItCame(edit: EditType | undefined, frame?: FrameType) {
	const { container } = render(PdfPage, {
		source: '/files/plan',
		page: 1,
		picture: '/plan.webp',
		edit,
		frame
	});
	return container.querySelector('[data-pdf-page]')?.getAttribute('data-pdf') === '/files/plan';
}

describe('a PDF page on a report page', () => {
	it('prints as the PDF’s own page as it came, and with only Original picked', () => {
		expect(printsAsItCame(undefined)).toBe(true);
		expect(printsAsItCame({ ratio: 'original' })).toBe(true);
	});

	it('prints as its picture once it is turned or cut', () => {
		expect(printsAsItCame({ turns: 1 })).toBe(false);
		expect(printsAsItCame({ ratio: '1:1' }, { x: 0, y: 0.15, w: 1, h: 0.7 })).toBe(false);
	});
});
