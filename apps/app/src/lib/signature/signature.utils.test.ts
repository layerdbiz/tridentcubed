// Email signatures (#354): a person's signature from their Team record, with the signature Sheets filling in what the
// app does not hold yet, and the rule for which pictures are copied to the app's public signature address.
import { describe, expect, it } from 'vite-plus/test';
import { COMPANY_LOGO } from './signature.constants';
import {
	isCopied,
	type SignatureRecordType,
	toDirectPicture,
	toMailboxPictures,
	toMailboxSignature,
	toPersonPictures,
	toPersonSignature,
	toSharedAddresses,
	toSheets
} from './signature.utils';

const DRIVE_ID = '1AbCdEfGhIjKlMnOpQrStUv';

const sheets = toSheets({
	people: [
		{
			email: 'Ada@Example.com',
			name: 'Ada From The Sheet',
			title: 'Sheet Title',
			phone: '+1 555 0100',
			group: 'ops@example.com, ada@example.com, ops@example.com, sales@example.com',
			href: 'https://www.linkedin.com/in/sheet',
			src: 'https://tridentcubed.com/emails/ada.png',
			banner: 'map.png'
		},
		{ name: 'No email, left out' }
	],
	mailboxes: [
		{
			slug: 'sales',
			shortname: 'Sales',
			name: 'Sales Team',
			email: 'sales@example.com',
			title: 'Sales',
			phone: '+1 555 0199',
			href: 'https://example.com',
			src: 'https://tridentcubed.com/branding/logo.png',
			banner: 'site.png'
		},
		{
			slug: 'ops',
			shortname: 'Operations',
			email: 'ops@example.com',
			src: '',
			banner: 'missing.png'
		},
		{ shortname: 'No slug, left out' }
	],
	banners: [
		{
			banner: 'map.png',
			href: 'https://tridentcubed.com',
			src: `https://drive.google.com/thumbnail?id=${DRIVE_ID}&sz=w2000`
		},
		{
			banner: 'site.png',
			href: 'https://tridentcubed.com/new',
			src: 'https://example.com/site.png'
		},
		{ banner: 'no-picture.png' }
	],
	social: [
		{ name: 'LinkedIn', href: 'https://www.linkedin.com/company/example' },
		{ name: 'WhatsApp', href: 'https://wa.me/15550100' },
		{ name: 'MySpace', href: 'https://myspace.example' }
	]
});

const ada: SignatureRecordType = {
	id: '0b9f3c1e-6a52-4d1b-9c47-2f8e5a7d3b10',
	name: 'Ada Lovelace',
	title: 'Port Captain',
	phone: '',
	email: 'ada@example.com',
	link: '',
	photo: '/start/team/ada.webp'
};

describe('the signature Sheets', () => {
	it('keeps the rows that are rows, the mailboxes by name, and only the three social links', () => {
		expect(sheets.people.map((each) => each.email)).toEqual(['Ada@Example.com']);
		expect(sheets.mailboxes.map((each) => each.name)).toEqual(['Operations', 'Sales']);
		expect(sheets.banners.map((each) => each.banner)).toEqual(['map.png', 'site.png']);
		expect(sheets.social).toEqual({
			linkedin: 'https://www.linkedin.com/company/example',
			whatsapp: 'https://wa.me/15550100'
		});
	});

	it('asks Google Drive for its direct picture, as the website does', () => {
		expect(sheets.banners[0].src).toBe(`https://lh3.googleusercontent.com/d/${DRIVE_ID}=w2000`);
		expect(toDirectPicture(`https://drive.google.com/file/d/${DRIVE_ID}/view`)).toBe(
			`https://lh3.googleusercontent.com/d/${DRIVE_ID}=w2000`
		);
		expect(toDirectPicture('https://example.com/a.png')).toBe('https://example.com/a.png');
	});
});

describe('which pictures a signature copies to its own address', () => {
	it('copies everything but the website’s own files', () => {
		expect(isCopied('/start/team/ada.webp')).toBe(true);
		expect(isCopied('/files/0b9f3c1e-6a52-4d1b-9c47-2f8e5a7d3b10')).toBe(true);
		expect(isCopied(`https://lh3.googleusercontent.com/d/${DRIVE_ID}=w2000`)).toBe(true);
		expect(isCopied('https://res.cloudinary.com/x/image/upload/a.png')).toBe(true);
		expect(isCopied('https://tridentcubed.com/emails/ada.png')).toBe(false);
		expect(isCopied('https://www.tridentcubed.com/branding/logo.png')).toBe(false);
		expect(isCopied('http://tridentcubed.com/emails/ada.png')).toBe(true);
		expect(isCopied('')).toBe(false);
	});
});

describe('a person’s signature', () => {
	it('takes the Team record first and the Sheet for what the record leaves out', () => {
		const signature = toPersonSignature(ada, sheets, {
			photo: 'https://next.app.example/signature/aaa.png',
			banner: 'https://next.app.example/signature/bbb.png'
		});

		expect(signature).toMatchObject({
			id: ada.id,
			type: 'person',
			name: 'Ada Lovelace',
			title: 'Port Captain',
			phone: '+1 555 0100',
			email: 'ada@example.com',
			href: 'https://www.linkedin.com/in/sheet',
			src: 'https://next.app.example/signature/aaa.png',
			slug: ada.id,
			socialLinks: sheets.social,
			banner: {
				href: 'https://tridentcubed.com',
				src: 'https://next.app.example/signature/bbb.png',
				alt: 'map.png'
			}
		});
	});

	it('lists each shared address once, never their own', () => {
		expect(toPersonSignature(ada, sheets, {}).group).toBe('ops@example.com, sales@example.com');
		expect(toSharedAddresses(' a@x.com ,, A@x.com, me@x.com ', 'ME@x.com')).toBe('a@x.com');
	});

	it('shows the company logo with no photo, and no banner with no Sheet row', () => {
		const stranger = { ...ada, email: 'new@example.com', photo: '' };

		expect(toPersonPictures(stranger, sheets)).toEqual({ photo: undefined, banner: undefined });
		expect(toPersonSignature(stranger, sheets, {})).toMatchObject({
			src: COMPANY_LOGO,
			group: '',
			href: '',
			banner: undefined
		});
	});

	it('asks for the photo and the banner it shows', () => {
		expect(toPersonPictures(ada, sheets)).toEqual({
			photo: { source: '/start/team/ada.webp', kind: 'photo' },
			banner: {
				source: `https://lh3.googleusercontent.com/d/${DRIVE_ID}=w2000`,
				kind: 'banner'
			}
		});
	});
});

describe('a shared mailbox’s signature', () => {
	it('comes whole from its Sheet row, with no shared addresses under it', () => {
		const sales = sheets.mailboxes[1];

		expect(toMailboxPictures(sales, sheets)).toEqual({
			photo: { source: 'https://tridentcubed.com/branding/logo.png', kind: 'photo' },
			banner: { source: 'https://example.com/site.png', kind: 'banner' }
		});
		expect(
			toMailboxSignature(sales, sheets, {
				photo: 'https://tridentcubed.com/branding/logo.png',
				banner: 'https://next.app.example/signature/ccc.png'
			})
		).toMatchObject({
			id: 'sales',
			type: 'group',
			name: 'Sales',
			email: 'sales@example.com',
			group: '',
			banner: { src: 'https://next.app.example/signature/ccc.png', alt: 'site.png' }
		});
	});

	it('has no banner when its Sheet names one that is not there', () => {
		const ops = sheets.mailboxes[0];

		expect(toMailboxPictures(ops, sheets)).toEqual({ photo: undefined, banner: undefined });
		expect(toMailboxSignature(ops, sheets, {}).banner).toBeUndefined();
	});
});
