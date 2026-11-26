// The app's faces and logos for the library avatar (#379): what each name shows, worked out once for the avatar,
// the face stacks and the logo stacks alike (#355).
import { describe, expect, it } from 'vite-plus/test';
import { faceOf, logoOf } from './marks';
import { registerCustomer, resetPeople } from './look.data';
import type { TeamMemberType } from './team.data';

function member(name: string, extra: Partial<TeamMemberType> = {}): TeamMemberType {
	const base = { rank: 0, title: '', label: '', phone: '', email: '', location: '', href: '' };
	return { ...base, name, role: 'team', ...extra };
}

describe('faceOf', () => {
	it("gives a Team record's photo and dot", () => {
		resetPeople([member('Ana Lopez', { photo: '/files/ana', seen: new Date().toISOString() })]);

		expect(faceOf('Ana Lopez')).toMatchObject({
			src: '/files/ana',
			alt: 'Ana Lopez',
			presence: 'online'
		});
	});

	it('leaves the dot off when asked', () => {
		resetPeople([member('Ana Lopez')]);

		expect(faceOf('Ana Lopez', { hasPresence: false }).presence).toBeUndefined();
	});

	it('draws Personnel in black on white in place of a role', () => {
		resetPeople([]);

		expect(decodeURIComponent(faceOf('Carl Diaz', { tone: 'personnel' }).src)).toContain(
			'fill="#ffffff"'
		);
	});

	it('gives no picture for a name with no letters yet, so the icon shows', () => {
		expect(faceOf('').src).toBe('');
	});
});

describe('logoOf', () => {
	it("gives a customer's logo, kept whole on white", () => {
		registerCustomer({
			name: 'KOGA',
			kind: '',
			icon: '/files/koga',
			logo: '',
			city: '',
			code: 'KOG'
		});

		expect(logoOf('KOGA')).toMatchObject({ src: '/files/koga', alt: 'KOGA logo', fit: 'contain' });
	});

	it('draws its code when it has no logo, round', () => {
		registerCustomer({
			name: 'Blue Water Shipping',
			kind: '',
			icon: '',
			logo: '',
			city: '',
			code: 'BWS'
		});

		const logo = logoOf('Blue Water Shipping');
		expect(decodeURIComponent(logo.src)).toContain('>BWS</text>');
		expect(logo).toMatchObject({ fit: 'cover', shape: 'circle' });
	});

	it('keeps an icon for a project with no logo, and for no customer at all', () => {
		expect(logoOf('Blue Water Shipping', { fallback: 'icon-[mdi--folder]' })).toMatchObject({
			src: '',
			fallback: 'icon-[mdi--folder]'
		});
		expect(logoOf('').src).toBe('');
	});
});
