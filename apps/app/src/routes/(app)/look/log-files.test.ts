import { describe, expect, it } from 'vite-plus/test';
import { pdfLines, wordText } from './log-files';

describe('the words of a Word file', () => {
	it('keeps each paragraph a line, a table row a line of cells, and a tab and a line break as written', () => {
		const xml = `<w:document><w:body>
<w:p><w:pPr><w:tabs><w:tab w:val="left" w:pos="720"/></w:tabs></w:pPr><w:r><w:t>25 November 2026</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">22:30 </w:t></w:r><w:r><w:t>- 02:15 Loading &amp; lashing</w:t></w:r></w:p>
<w:tbl><w:tr><w:tc><w:p><w:r><w:t>23:40</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>On</w:t></w:r></w:p><w:p><w:r><w:t>standby</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
<w:p><w:r><w:t>Line</w:t><w:br/><w:t>two</w:t><w:tab/><w:t>tabbed</w:t></w:r></w:p>
<w:p><w:del><w:r><w:delText>struck out</w:delText></w:r></w:del><w:r><w:t>kept</w:t><w:t xml:space="preserve"> </w:t><w:t>as is</w:t></w:r></w:p>
</w:body></w:document>`;

		expect(wordText(xml).trim().split('\n')).toEqual([
			'25 November 2026',
			'22:30 - 02:15 Loading & lashing',
			'23:40\tOn standby',
			'Line',
			'two\ttabbed',
			'kept as is'
		]);
	});
});

describe('the words of a PDF page', () => {
	it('starts a new line where the text moves down, and keeps words on one line apart', () => {
		const items = [
			{ str: '25 November 2026', x: 50, y: 700, width: 90, height: 10, hasEOL: true },
			{ str: '22:30', x: 50, y: 686, width: 25, height: 10, hasEOL: false },
			{ str: 'Loading', x: 110, y: 686, width: 40, height: 10, hasEOL: false },
			{ str: '23:40 On standby', x: 50, y: 672, width: 80, height: 10, hasEOL: false }
		];

		expect(pdfLines(items)).toBe('25 November 2026\n22:30 Loading\n23:40 On standby');
	});

	it('leaves an empty line where the text drops more than a line, as between paragraphs', () => {
		const items = [
			{ str: '06:00 Barge departed', x: 50, y: 700, width: 90, height: 10, hasEOL: true },
			{ str: '', x: 50, y: 700, width: 0, height: 0, hasEOL: true },
			{ str: 'Remarks: clear', x: 50, y: 670, width: 70, height: 10, hasEOL: false }
		];

		expect(pdfLines(items)).toBe('06:00 Barge departed\n\nRemarks: clear');
	});
});
