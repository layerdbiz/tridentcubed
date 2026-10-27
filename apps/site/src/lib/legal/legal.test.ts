import { describe, expect, it } from 'vite-plus/test';
import {
	LEGAL_DOCUMENTS,
	LEGAL_KINDS,
	LEGAL_PHONE,
	isLegalKind,
	toLegalHref,
	toLegalParts
} from './legal';

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

	it('gives both documents the site call number and no other', () => {
		for (const kind of LEGAL_KINDS) {
			const text = JSON.stringify(LEGAL_DOCUMENTS[kind]);
			expect(text).toContain(LEGAL_PHONE.label);
			expect(text).not.toMatch(/570|832/);
		}
	});

	it('turns the phone number into a tap-to-call link', () => {
		expect(toLegalParts(`Call ${LEGAL_PHONE.label}.`)).toEqual([
			{ text: 'Call ' },
			{ text: LEGAL_PHONE.label, href: 'tel:+14095432725' },
			{ text: '.' }
		]);
		expect(toLegalParts('No number here.')).toEqual([{ text: 'No number here.' }]);
	});
});
