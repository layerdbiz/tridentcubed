// Email signatures (#354): a person's signature from their Team record, with the signature Sheets filling in what the
// app does not hold yet; the photo and banner a person can pick, which they show and what they start with; and the
// pictures that are copied to the app's public signature address.
import { describe, expect, it } from 'vite-plus/test';
import {
	COMPANY_LOGO,
	DEFAULT_BANNER,
	DEFAULT_PHOTO,
	UPLOAD_BANNER_LINK,
	WEBSITE_ICONS
} from './signature.constants';
import {
	isTheirPhoto,
	type MadeLookType,
	type SignatureRecordType,
	toBannerChoices,
	toBannerSource,
	toDriveFile,
	toFetchAddress,
	toIconPictures,
	toMailboxLook,
	toMailboxSignature,
	toPersonLook,
	toPersonSignature,
	toPhotoChoices,
	toPhotoSource,
	toPreview,
	toSharedAddresses,
	toSheets
} from './signature.utils';

const DRIVE_ID = '1AbCdEfGhIjKlMnOpQrStUv';
const ADA_PHOTO = '1AdaPhotoInProfileImages';
const MAP = '1MapBannerInEmailBanners';
const LOGO = '1LogoPhotoInProfileImages';

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
			banner: 'breakbulk.png',
			profileURL: 'ada-at-sea.png'
		},
		{
			email: 'grace@example.com',
			name: 'Grace Hopper',
			src: 'https://tridentcubed.com/branding/logo.png',
			profileURL: 'grace-hopper-profile.png'
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
			banner: 'breakbulk.png'
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
			banner: 'breakbulk.png',
			href: 'https://breakbulk.example',
			src: `https://drive.google.com/thumbnail?id=${DRIVE_ID}&sz=w2000`
		},
		{
			banner: DEFAULT_BANNER.name,
			'GOOGLE DRIVE PHOTOS URL href': 'https://tridentcubed.com',
			fileId: MAP,
			modified: '7/30/2026'
		},
		{ banner: 'no-picture.png' }
	],
	profiles: [
		{
			banner: 'ada-lovelace-linkedin-updated.png',
			fileId: '1AdaLinkedInPhoto',
			modified: '10/20/2026'
		},
		{ banner: 'ada-at-sea.png', fileId: ADA_PHOTO },
		{ banner: 'grace-hopper-profile.png', fileId: '1GracePhoto' },
		{ banner: 'alan-turing-profile.png', fileId: '1AlanPhoto' },
		{ banner: DEFAULT_PHOTO.name, fileId: LOGO },
		{ banner: 'no-file.png' }
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
	link: ''
};
const grace: SignatureRecordType = {
	...ada,
	name: 'Capt. Grace Hopper',
	email: 'grace@example.com'
};
const stranger: SignatureRecordType = { ...ada, name: 'New Person', email: 'new@example.com' };

const MADE: MadeLookType = {
	photo: 'https://next.app.example/signature/aaa.png',
	banner: 'https://next.app.example/signature/bbb.png',
	icons: {
		phone: 'https://next.app.example/signature/ccc.png',
		logo: 'https://next.app.example/signature/ddd.png'
	}
};

describe('the signature Sheets', () => {
	it('keeps the rows that are rows, the mailboxes by name, and only the three social links', () => {
		expect(sheets.people.map((each) => each.email)).toEqual([
			'Ada@Example.com',
			'grace@example.com'
		]);
		expect(sheets.mailboxes.map((each) => each.name)).toEqual(['Operations', 'Sales']);
		expect(sheets.banners.map((each) => each.banner)).toEqual([
			'breakbulk.png',
			DEFAULT_BANNER.name
		]);
		expect(sheets.profiles.map((each) => each.file)).toEqual([
			'1AdaLinkedInPhoto',
			ADA_PHOTO,
			'1GracePhoto',
			'1AlanPhoto',
			LOGO
		]);
		expect(sheets.social).toEqual({
			linkedin: 'https://www.linkedin.com/company/example',
			whatsapp: 'https://wa.me/15550100'
		});
	});

	it('names a Google Drive picture by its file, and reads it from its direct address', () => {
		expect(sheets.banners[0]).toMatchObject({
			src: `drive:${DRIVE_ID}`,
			href: 'https://breakbulk.example'
		});
		expect(sheets.banners[1]).toMatchObject({
			src: `drive:${MAP}`,
			href: 'https://tridentcubed.com'
		});
		expect(toDriveFile(`https://drive.google.com/file/d/${DRIVE_ID}/view`)).toBe(DRIVE_ID);
		expect(toDriveFile('https://example.com/?id=1AbCdEfGhIjKlMn')).toBeUndefined();
		expect(toFetchAddress(`drive:${DRIVE_ID}`)).toBe(
			`https://lh3.googleusercontent.com/d/${DRIVE_ID}=w2000`
		);
		expect(toPreview(`drive:${DRIVE_ID}`, 240)).toBe(
			`https://lh3.googleusercontent.com/d/${DRIVE_ID}=w240`
		);
		expect(toFetchAddress('https://tridentcubed.com/emails/ada.png')).toBe(
			'https://tridentcubed.com/emails/ada.png'
		);
	});
});

describe('the photos a person picks from', () => {
	it('are theirs by the Sheet’s name for them or by their first and last names in the file', () => {
		expect(isTheirPhoto('ada-at-sea.png', 'Ada Lovelace', 'ada-at-sea.png')).toBe(true);
		expect(isTheirPhoto('ada-lovelace-linkedin-updated.png', 'Ada Lovelace')).toBe(true);
		expect(isTheirPhoto('grace-hopper-profile.png', 'Capt. Grace Hopper')).toBe(true);
		expect(isTheirPhoto('ada-at-sea.png', 'Ada Lovelace')).toBe(false);
		expect(isTheirPhoto('alan-turing-profile.png', 'Ada Lovelace')).toBe(false);
		expect(isTheirPhoto('sneha.png', 'Sneha')).toBe(false);
	});

	it('are their upload, their website photo, their Profile Images photos, then the Trident logo', () => {
		expect(toPhotoChoices(ada, sheets, 'upload:0123456789abcdef01234567.jpg')).toEqual([
			{ source: 'upload:0123456789abcdef01234567.jpg', label: 'Your upload', preview: '' },
			{
				source: 'https://tridentcubed.com/emails/ada.png',
				label: 'Website photo',
				preview: 'https://tridentcubed.com/emails/ada.png'
			},
			{
				source: 'drive:1AdaLinkedInPhoto',
				label: 'Ada lovelace linkedin updated',
				preview: 'https://lh3.googleusercontent.com/d/1AdaLinkedInPhoto=w240'
			},
			{
				source: `drive:${ADA_PHOTO}`,
				label: 'Ada at sea',
				preview: `https://lh3.googleusercontent.com/d/${ADA_PHOTO}=w240`
			},
			{
				source: `drive:${LOGO}`,
				label: 'Trident logo',
				preview: `https://lh3.googleusercontent.com/d/${LOGO}=w240`
			}
		]);
	});

	it('leave out a website signature that shows the company logo, and still offer the logo with no Sheet', () => {
		expect(toPhotoChoices(grace, sheets).map((each) => each.source)).toEqual([
			'drive:1GracePhoto',
			`drive:${LOGO}`
		]);
		expect(
			toPhotoChoices(stranger, toSheets({ people: [], mailboxes: [], banners: [], social: [] }))
		).toEqual([
			{
				source: `drive:${DEFAULT_PHOTO.file}`,
				label: 'Trident logo',
				preview: `https://lh3.googleusercontent.com/d/${DEFAULT_PHOTO.file}=w240`
			}
		]);
	});
});

describe('the photo a signature shows', () => {
	it('is the one picked, else the website photo, the Sheet’s Profile Images photo, else the Trident logo', () => {
		expect(toPhotoSource(ada, sheets, 'drive:1AdaLinkedInPhoto')).toBe('drive:1AdaLinkedInPhoto');
		expect(toPhotoSource(ada, sheets)).toBe('https://tridentcubed.com/emails/ada.png');
		expect(toPhotoSource(grace, sheets)).toBe('drive:1GracePhoto');
		expect(toPhotoSource(stranger, sheets)).toBe(`drive:${DEFAULT_PHOTO.file}`);
	});

	it('is a photo kind, carrying when its Google Drive file last changed', () => {
		expect(toPersonLook(ada, sheets, { photo: 'drive:1AdaLinkedInPhoto' }).photo).toEqual({
			source: 'drive:1AdaLinkedInPhoto',
			kind: 'photo',
			version: '10/20/2026'
		});
	});
});

describe('the banner a signature shows', () => {
	it('is the one picked, none when they said so, else the Sheet’s, else the Trident Cubed map', () => {
		expect(toBannerSource(ada, sheets, `drive:${MAP}`)).toBe(`drive:${MAP}`);
		expect(toBannerSource(ada, sheets, '')).toBe('');
		expect(toBannerSource(ada, sheets)).toBe(`drive:${DRIVE_ID}`);
		expect(toBannerSource(stranger, sheets)).toBe(`drive:${MAP}`);
		expect(
			toBannerSource(stranger, toSheets({ people: [], mailboxes: [], banners: [], social: [] }))
		).toBe(`drive:${DEFAULT_BANNER.file}`);
	});

	it('takes a reader where its Sheet row says, and an upload to the website', () => {
		expect(toPersonLook(ada, sheets).banner).toEqual({
			picture: { source: `drive:${DRIVE_ID}`, kind: 'banner' },
			href: 'https://breakbulk.example',
			alt: 'Breakbulk'
		});
		expect(
			toPersonLook(ada, sheets, { banner: 'upload:0123456789abcdef01234567.png' }).banner
		).toMatchObject({ href: UPLOAD_BANNER_LINK, alt: 'Your upload' });
		expect(toPersonLook(ada, sheets, { banner: '' }).banner).toBeUndefined();
	});

	it('is picked from every banner in the folder, an upload first', () => {
		expect(toBannerChoices(sheets, 'upload:0123456789abcdef01234567.png')).toEqual([
			{
				source: 'upload:0123456789abcdef01234567.png',
				label: 'Your upload',
				preview: '',
				link: UPLOAD_BANNER_LINK
			},
			{
				source: `drive:${DRIVE_ID}`,
				label: 'Breakbulk',
				preview: `https://lh3.googleusercontent.com/d/${DRIVE_ID}=w600`,
				link: 'https://breakbulk.example'
			},
			{
				source: `drive:${MAP}`,
				label: 'Trident cubed map',
				preview: `https://lh3.googleusercontent.com/d/${MAP}=w600`,
				link: 'https://tridentcubed.com'
			}
		]);
	});
});

describe('a person’s signature', () => {
	it('takes the Team record first and the Sheet for what the record leaves out', () => {
		const signature = toPersonSignature(ada, sheets, toPersonLook(ada, sheets), MADE);

		expect(signature).toMatchObject({
			id: ada.id,
			type: 'person',
			name: 'Ada Lovelace',
			title: 'Port Captain',
			phone: '+1 555 0100',
			email: 'ada@example.com',
			href: 'https://www.linkedin.com/in/sheet',
			src: MADE.photo,
			slug: ada.id,
			socialLinks: sheets.social,
			banner: { href: 'https://breakbulk.example', src: MADE.banner, alt: 'Breakbulk' }
		});
	});

	it('shows the copied icons and logo, leaving the website’s own for any not copied', () => {
		const signature = toPersonSignature(ada, sheets, toPersonLook(ada, sheets), MADE);

		expect(signature.icons).toEqual({ phone: MADE.icons.phone });
		expect(signature.logoImage).toBe(MADE.icons.logo);
		expect(toIconPictures().map((each) => each.picture)).toEqual(
			Object.values(WEBSITE_ICONS).map((source) => ({ source, kind: 'icon' }))
		);
	});

	it('lists each shared address once, never their own', () => {
		const signature = toPersonSignature(ada, sheets, toPersonLook(ada, sheets), { icons: {} });

		expect(signature.group).toBe('ops@example.com, sales@example.com');
		expect(toSharedAddresses(' a@x.com ,, A@x.com, me@x.com ', 'ME@x.com')).toBe('a@x.com');
	});

	it('shows the company logo when no photo was made, and no banner when none was', () => {
		expect(
			toPersonSignature(stranger, sheets, toPersonLook(stranger, sheets), { icons: {} })
		).toMatchObject({ src: COMPANY_LOGO, group: '', href: '', banner: undefined });
	});
});

describe('a shared mailbox’s signature', () => {
	it('comes whole from its Sheet row, with no shared addresses under it', () => {
		const sales = sheets.mailboxes[1];
		const look = toMailboxLook(sales, sheets);

		expect(look.photo).toEqual({
			source: 'https://tridentcubed.com/branding/logo.png',
			kind: 'photo'
		});
		expect(look.banner?.picture).toEqual({ source: `drive:${DRIVE_ID}`, kind: 'banner' });
		expect(toMailboxSignature(sales, sheets, look, MADE)).toMatchObject({
			id: 'sales',
			type: 'group',
			name: 'Sales',
			email: 'sales@example.com',
			group: '',
			banner: { src: MADE.banner, alt: 'Breakbulk' }
		});
	});

	it('shows the company logo with no photo, and no banner when its Sheet names one that is not there', () => {
		const ops = sheets.mailboxes[0];
		const look = toMailboxLook(ops, sheets);

		expect(look).toEqual({ photo: { source: COMPANY_LOGO, kind: 'photo' }, banner: undefined });
		expect(toMailboxSignature(ops, sheets, look, MADE).banner).toBeUndefined();
	});
});
