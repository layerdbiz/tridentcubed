// Email signatures (#354): a person's signature from their Team record, with the signature Sheets filling in what the
// app does not hold yet; the photo and banners a person can pick, edit and link, which they show and what they start
// with; and the pictures that are copied to the app's public signature address.
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
	toLink,
	toMailboxLook,
	toMailboxSignature,
	toOriginal,
	toBannerPanel,
	toGroupChoices,
	toGroupEmails,
	toPersonBanner,
	toPersonLook,
	toPersonParts,
	toPersonPhoto,
	toPersonSignature,
	toPhotoChoices,
	toPhotoPanel,
	toPhotoSource,
	toPreview,
	toSharedAddresses,
	toShownSize,
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

const BANNER = 'https://next.app.example/signature/bbb.png';
const MADE: MadeLookType = {
	photo: 'https://next.app.example/signature/aaa.png',
	banners: [{ address: BANNER, width: 1200, height: 350 }],
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

	it('are the Trident logo, their profile picture, their email photo, then their Profile Images photos', () => {
		expect(toPhotoChoices({ ...ada, photo: '/start/team/ada.webp' }, sheets)).toEqual([
			{
				source: `drive:${LOGO}`,
				label: 'Trident logo',
				preview: `https://lh3.googleusercontent.com/d/${LOGO}=w480`
			},
			{
				source: 'profile:/start/team/ada.webp',
				label: 'Profile picture',
				preview: '/start/team/ada.webp'
			},
			{
				source: 'https://tridentcubed.com/emails/ada.png',
				label: 'Email photo',
				preview: 'https://tridentcubed.com/emails/ada.png'
			},
			{
				source: 'drive:1AdaLinkedInPhoto',
				label: 'LinkedIn photo',
				preview: 'https://lh3.googleusercontent.com/d/1AdaLinkedInPhoto=w480'
			},
			{
				source: `drive:${ADA_PHOTO}`,
				label: 'At sea photo',
				preview: `https://lh3.googleusercontent.com/d/${ADA_PHOTO}=w480`
			}
		]);
	});

	it('leave out a website signature that shows the company logo, and still offer the logo with no Sheet', () => {
		expect(toPhotoChoices(grace, sheets).map((each) => each.source)).toEqual([
			`drive:${LOGO}`,
			'drive:1GracePhoto'
		]);
		expect(
			toPhotoChoices(stranger, toSheets({ people: [], mailboxes: [], banners: [], social: [] }))
		).toEqual([
			{
				source: `drive:${DEFAULT_PHOTO.file}`,
				label: 'Trident logo',
				preview: `https://lh3.googleusercontent.com/d/${DEFAULT_PHOTO.file}=w480`
			}
		]);
	});

	it('sit in a panel with their uploads, in the order left, each with its edit, new built-in ones at the end', () => {
		const upload = 'upload:0123456789abcdef01234567.jpg';
		const first = toPhotoPanel(ada, sheets, { photo: upload, photoEdit: { turns: 1 } });
		expect(first.map(({ source, edit, isOwn }) => ({ source, edit, isOwn }))).toEqual([
			{ source: `drive:${LOGO}`, edit: undefined, isOwn: false },
			{ source: 'https://tridentcubed.com/emails/ada.png', edit: undefined, isOwn: false },
			{ source: 'drive:1AdaLinkedInPhoto', edit: undefined, isOwn: false },
			{ source: `drive:${ADA_PHOTO}`, edit: undefined, isOwn: false },
			{ source: upload, edit: { turns: 1 }, isOwn: true }
		]);
		expect(first.at(-1)).toMatchObject({
			label: 'Your upload',
			preview: '/api/signature?upload=0123456789abcdef01234567.jpg'
		});

		const moved = toPhotoPanel(ada, sheets, {
			photoList: [
				{ source: upload },
				{ source: 'drive:1AdaLinkedInPhoto', edit: { isFlipped: true } },
				{ source: 'drive:gone-from-the-folder' }
			]
		});
		expect(moved.map((each) => each.source)).toEqual([
			upload,
			'drive:1AdaLinkedInPhoto',
			`drive:${LOGO}`,
			'https://tridentcubed.com/emails/ada.png',
			`drive:${ADA_PHOTO}`
		]);
		expect(moved[1].edit).toEqual({ isFlipped: true });
	});
});

describe('the photo a signature shows', () => {
	it('is the one picked, else the website photo, the Sheet’s Profile Images photo, else the Trident logo', () => {
		expect(toPhotoSource(ada, sheets, 'drive:1AdaLinkedInPhoto')).toBe('drive:1AdaLinkedInPhoto');
		expect(toPhotoSource(ada, sheets)).toBe('https://tridentcubed.com/emails/ada.png');
		expect(toPhotoSource(grace, sheets)).toBe('drive:1GracePhoto');
		expect(toPhotoSource(stranger, sheets)).toBe(`drive:${DEFAULT_PHOTO.file}`);
	});

	it('is a photo kind, carrying when its Google Drive file last changed and how it was edited', () => {
		const edit = { turns: 1, frame: { x: 0.1, y: 0.2, w: 0.5, h: 0.5 } };

		expect(
			toPersonLook(ada, sheets, { photo: 'drive:1AdaLinkedInPhoto', photoEdit: edit }).photo
		).toEqual({ source: 'drive:1AdaLinkedInPhoto', kind: 'photo', version: '10/20/2026', edit });
		expect(toPersonLook(ada, sheets, { photoEdit: edit }).photo.edit).toBeUndefined();
	});

	it('takes a reader to the link given, else the Team record’s, else the Sheet’s', () => {
		expect(toPersonPhoto(ada, sheets).link).toBe('https://www.linkedin.com/in/sheet');
		expect(toPersonPhoto({ ...ada, link: 'https://ada.example' }, sheets).link).toBe(
			'https://ada.example'
		);
		expect(toPersonPhoto(ada, sheets, { photoLink: '' }).link).toBe('');
		expect(
			toPersonSignature(ada, sheets, toPersonLook(ada, sheets, { photoLink: '' }), MADE).href
		).toBe('');
	});
});

describe('the links a signature’s photo and banners take', () => {
	it('keep an address as typed, an email as a mail link, anything else on the web', () => {
		expect(toLink(' https://x.example/a ')).toBe('https://x.example/a');
		expect(toLink('tridentcubed.com/expo')).toBe('https://tridentcubed.com/expo');
		expect(toLink('ops@tridentcubed.com')).toBe('mailto:ops@tridentcubed.com');
		expect(toLink('')).toBe('');
	});

	it('refuse what is not an address', () => {
		expect(toLink('not a link')).toBeUndefined();
		expect(toLink('nowhere')).toBeUndefined();
		expect(toLink(`https://x.example/${'a'.repeat(2100)}`)).toBeUndefined();
	});
});

describe('the banners a signature shows', () => {
	it('start with the one picked, none when they said so, else the Sheet’s, else the Trident Cubed map', () => {
		expect(toBannerSource(ada, sheets, `drive:${MAP}`)).toBe(`drive:${MAP}`);
		expect(toBannerSource(ada, sheets, '')).toBe('');
		expect(toBannerSource(ada, sheets)).toBe(`drive:${DRIVE_ID}`);
		expect(toBannerSource(stranger, sheets)).toBe(`drive:${MAP}`);
		expect(
			toBannerSource(stranger, toSheets({ people: [], mailboxes: [], banners: [], social: [] }))
		).toBe(`drive:${DEFAULT_BANNER.file}`);
		expect(toPersonBanner(ada, sheets)).toEqual({
			id: 'sheet',
			source: `drive:${DRIVE_ID}`,
			link: 'https://breakbulk.example'
		});
		expect(toPersonBanner(ada, sheets, { banner: '' })).toBeUndefined();
	});

	it('is ONE: the first saved, with its edit and link, none for an empty list', () => {
		const saved = [
			{ id: 'a', source: `drive:${MAP}`, link: 'https://expo.example', edit: { turns: 2 } },
			{ id: 'b', source: 'upload:0123456789abcdef01234567.png', link: UPLOAD_BANNER_LINK }
		];
		const look = toPersonLook(ada, sheets, { banner: '', banners: saved });

		expect(toPersonBanner(ada, sheets, { banner: '', banners: saved })).toBe(saved[0]);
		expect(look.banners).toEqual([
			{
				picture: {
					source: `drive:${MAP}`,
					kind: 'banner',
					version: '7/30/2026',
					edit: { turns: 2 }
				},
				href: 'https://expo.example',
				alt: 'Trident cubed map'
			}
		]);
		expect(toPersonLook(ada, sheets, { banners: [] }).banners).toEqual([]);
	});

	it('is picked from a panel of every company banner and their uploads, each with the link it starts with', () => {
		const upload = 'upload:0123456789abcdef01234567.png';
		const panel = toBannerPanel(ada, sheets, {
			banners: [{ id: 'b', source: upload, link: 'https://mine.example' }]
		});
		expect(panel.map(({ source, link, isOwn }) => ({ source, link, isOwn }))).toEqual([
			{ source: `drive:${DRIVE_ID}`, link: 'https://breakbulk.example', isOwn: false },
			{ source: `drive:${MAP}`, link: 'https://tridentcubed.com', isOwn: false },
			{ source: upload, link: UPLOAD_BANNER_LINK, isOwn: true }
		]);
	});

	it('show at their own shape, as wide as the signature at most', () => {
		expect(toShownSize({ width: 1200, height: 350 })).toEqual({ width: 600, height: 175 });
		expect(toShownSize({ width: 400, height: 100 })).toEqual({ width: 400, height: 100 });
	});

	it('are added from every banner in the folder', () => {
		expect(toBannerChoices(sheets)).toEqual([
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

describe('what the screen edits', () => {
	it('is the photo and the one banner with their names and pictures, their panels and the group emails', () => {
		const upload = 'upload:0123456789abcdef01234567.png';
		const parts = toPersonParts(
			ada,
			sheets,
			{
				photo: 'drive:1AdaLinkedInPhoto',
				banners: [{ id: 'b', source: upload, link: '' }],
				groupEmails: ['sales@example.com']
			},
			[{ email: 'engineering@example.com', name: 'Engineering' }]
		);

		expect(parts.photo).toEqual({
			source: 'drive:1AdaLinkedInPhoto',
			link: 'https://www.linkedin.com/in/sheet',
			label: 'LinkedIn photo',
			preview: 'https://lh3.googleusercontent.com/d/1AdaLinkedInPhoto=w480',
			original: 'https://lh3.googleusercontent.com/d/1AdaLinkedInPhoto=w1600',
			isPicked: true
		});
		expect(parts.banner).toEqual({
			id: 'b',
			source: upload,
			link: '',
			label: 'Your upload',
			preview: '/api/signature?upload=0123456789abcdef01234567.png',
			original: '/api/signature?upload=0123456789abcdef01234567.png'
		});
		expect(parts.photos).toEqual(toPhotoPanel(ada, sheets, { photo: 'drive:1AdaLinkedInPhoto' }));
		expect(parts.banners.map((each) => each.source)).toEqual([
			`drive:${DRIVE_ID}`,
			`drive:${MAP}`,
			upload
		]);
		expect(parts.groups).toEqual([
			{ email: 'ops@example.com', name: 'Operations' },
			{ email: 'sales@example.com', name: 'Sales' },
			{ email: 'engineering@example.com', name: 'Engineering' }
		]);
		expect(parts.groupEmails).toEqual(['sales@example.com']);
		expect(toOriginal('https://tridentcubed.com/emails/ada.png')).toBe(
			'https://tridentcubed.com/emails/ada.png'
		);
	});

	it('offers every group email once, the Sheet’s then the app’s, and starts from the Sheet row’s', () => {
		expect(
			toGroupChoices(sheets, [
				{ email: 'SALES@example.com', name: 'Again' },
				{ email: ' ', name: 'Empty' },
				{ email: 'hr@example.com', name: '' }
			])
		).toEqual([
			{ email: 'ops@example.com', name: 'Operations' },
			{ email: 'sales@example.com', name: 'Sales' },
			{ email: 'hr@example.com', name: 'hr@example.com' }
		]);
		expect(toGroupEmails(ada, sheets)).toEqual([
			'ops@example.com',
			'ada@example.com',
			'ops@example.com',
			'sales@example.com'
		]);
		expect(toGroupEmails(ada, sheets, { groupEmails: [] })).toEqual([]);
		expect(toGroupEmails(stranger, sheets)).toEqual([]);
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
			banners: [
				{
					href: 'https://breakbulk.example',
					src: BANNER,
					alt: 'Breakbulk',
					width: 600,
					height: 175
				}
			]
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

	it('lists each shared address once, never their own, the group emails they picked over the Sheet’s', () => {
		const signature = toPersonSignature(ada, sheets, toPersonLook(ada, sheets), { icons: {} });

		expect(signature.group).toBe('ops@example.com, sales@example.com');
		expect(
			toPersonSignature(
				ada,
				sheets,
				toPersonLook(ada, sheets),
				{ icons: {} },
				{ groupEmails: ['hr@x.com'] }
			).group
		).toBe('hr@x.com');
		expect(toSharedAddresses(' a@x.com ,, A@x.com, me@x.com ', 'ME@x.com')).toBe('a@x.com');
	});

	it('shows the company logo when no photo was made, and no banner when none was', () => {
		expect(
			toPersonSignature(stranger, sheets, toPersonLook(stranger, sheets), { icons: {} })
		).toMatchObject({ src: COMPANY_LOGO, group: '', href: '', banners: [] });
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
		expect(look.banners.map((each) => each.picture)).toEqual([
			{ source: `drive:${DRIVE_ID}`, kind: 'banner' }
		]);
		expect(toMailboxSignature(sales, sheets, look, MADE)).toMatchObject({
			id: 'sales',
			type: 'group',
			name: 'Sales',
			email: 'sales@example.com',
			group: '',
			href: 'https://example.com',
			banners: [{ src: BANNER, alt: 'Breakbulk' }]
		});
	});

	it('shows the company logo with no photo, and no banner when its Sheet names one that is not there', () => {
		const ops = sheets.mailboxes[0];
		const look = toMailboxLook(ops, sheets);

		expect(look).toEqual({
			photo: { source: COMPANY_LOGO, kind: 'photo' },
			photoLink: '',
			banners: []
		});
		expect(toMailboxSignature(ops, sheets, look, MADE).banners).toEqual([]);
	});
});
