import { describe, expect, it } from 'vite-plus/test';
import { LEGAL_DOCUMENTS, LEGAL_KINDS, isLegalKind, toLegalHref } from './legal';

describe('legal documents', () => {
	it('knows only terms and privacy', () => {
		expect(isLegalKind('terms')).toBe(true);
		expect(isLegalKind('privacy')).toBe(true);
		expect(isLegalKind('cookies')).toBe(false);
		expect(isLegalKind(undefined)).toBe(false);
	});

	it('links each document to its own route', () => {
		expect(LEGAL_KINDS.map(toLegalHref)).toEqual(['/terms', '/privacy']);
	});

	it('gives every document a title and text', () => {
		for (const kind of LEGAL_KINDS) {
			const { title, sections } = LEGAL_DOCUMENTS[kind];
			expect(title).not.toBe('');
			expect(sections.length).toBeGreaterThan(0);
			for (const section of sections) expect(section.paragraphs.join('')).not.toBe('');
		}
	});

	it('keeps the private-document confidentiality line off the public terms', () => {
		const text = JSON.stringify(LEGAL_DOCUMENTS.terms);
		expect(text).not.toContain('confidential');
	});
});
