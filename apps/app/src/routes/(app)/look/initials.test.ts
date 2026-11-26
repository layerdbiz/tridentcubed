import { describe, expect, it } from 'vite-plus/test';
import { codeOf, initialsOf, isInitialsPicture, toInitialsPicture } from './initials';

describe('initialsOf', () => {
	it('takes the first letter of the first name and of the last name', () => {
		expect(initialsOf('Justin ONeill')).toBe('JO');
		expect(initialsOf('Mary Anne Smith')).toBe('MS');
	});

	it('shows the first letter of a one-word name', () => {
		expect(initialsOf('Michael')).toBe('M');
	});

	it('reads lower case names in capitals and skips a title in front', () => {
		expect(initialsOf('  ana   lópez ')).toBe('AL');
		expect(initialsOf('Capt. John Ross')).toBe('JR');
	});

	it('gives nothing for a name with no letters yet', () => {
		expect(initialsOf('')).toBe('');
	});
});

describe('codeOf', () => {
	it('shows the code typed for a company', () => {
		expect(codeOf('Saudi Global Logistics', ' SGL ')).toBe('SGL');
	});

	it('makes one up from the name when none is typed', () => {
		expect(codeOf('NMT Projects')).toBe('NMT');
		expect(codeOf('Blue Water Shipping', '')).toBe('BLU');
	});
});

describe('toInitialsPicture', () => {
	const svgOf = (src: string) => decodeURIComponent(src.replace('data:image/svg+xml,', ''));

	it('draws the letters on a diagonal gradient from top left to bottom right', () => {
		const svg = svgOf(toInitialsPicture('JO', 'admin'));
		expect(svg).toContain('>JO</text>');
		expect(svg).toContain('x1="0" y1="0" x2="1" y2="1"');
	});

	it('colours a person by role: purple for an Admin, blue for a Manager, grey for a Team user', () => {
		expect(svgOf(toInitialsPicture('JO', 'admin'))).toContain('#7c3aed');
		expect(svgOf(toInitialsPicture('JO', 'manager'))).toContain('#2563eb');
		expect(svgOf(toInitialsPicture('JO', 'team'))).toContain('#64748b');
	});

	it('gives a customer sky blue', () => {
		expect(svgOf(toInitialsPicture('SGL', 'customer'))).toContain('#0ea5e9');
	});

	it('draws someone added on the spot in black on plain white, a company added there in white on black', () => {
		const person = svgOf(toInitialsPicture('AL', 'personnel'));
		expect(person).not.toContain('linearGradient');
		expect(person).toContain('fill="#ffffff"');
		expect(person).toMatch(/<text[^>]*fill="#000000"/);
		const company = svgOf(toInitialsPicture('BWS', 'company'));
		expect(company).toContain('fill="#000000"');
		expect(company).toMatch(/<text[^>]*fill="#ffffff"/);
	});

	it('knows its own pictures from a real photo', () => {
		expect(isInitialsPicture(toInitialsPicture('JO', 'team'))).toBe(true);
		expect(isInitialsPicture('/files/abc')).toBe(false);
		expect(isInitialsPicture('')).toBe(false);
	});
});
