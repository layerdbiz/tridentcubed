// Email signatures (#354): what the screen, the server and the sign-in guard share.

/**
 * Where a signature's pictures are answered, to anyone: a reader's mail app loads them signed out, for as long as the
 * email is read. Each is one file under this address, named by what it was made from.
 */
export const SIGNATURE_PICTURES = '/signature/';

/** A signature picture's file name: what it was made from, hashed, and always a PNG. */
export const SIGNATURE_PICTURE_FILE = /^[0-9a-f]{24}\.png$/;

/** Where the server keeps them in the file store, beside the app's own files. */
export const SIGNATURE_FOLDER = 'signatures';

/** Where it keeps the pictures people upload for their signature, untouched: never answered to anyone. */
export const UPLOAD_FOLDER = `${SIGNATURE_FOLDER}/uploads`;

/** Where the screen asks for a signature and saves a choice: its own Vercel function, since it makes pictures. */
export const SIGNATURE_API = '/api/signature';

/**
 * How big each picture is made, at most: twice the size the signature shows it at, so it stays sharp on a
 * high-density screen. A photo is a 112 px circle (a website photo already shaped keeps its 112 by 132 box), a banner
 * up to 600 px wide, and an icon or logo at most 96 px high.
 */
export const PICTURE_SIZES = {
	photo: { width: 224, height: 264 },
	banner: { width: 1200, height: 600 },
	icon: { width: 480, height: 192 }
} as const;

/** The size of a photo's circle. */
export const CIRCLE_SIZE = PICTURE_SIZES.photo.width;

/**
 * Raised when the way a picture is made changes, so every picture is made again under a new name and emails already
 * sent keep the one they were sent with. 2: photos are circles, and every picture, icons too, is copied (#354).
 */
export const PICTURE_VERSION = 2;

/** The picture a signature shows when no photo can be made, as the website's signatures do. */
export const COMPANY_LOGO = 'https://tridentcubed.com/branding/logo.png';

/**
 * The icons and logos of the website's signature, which every signature shows: copied once to the signature address
 * like the photos, so a reader's mail app keeps them for a year and never goes through the website's redirect.
 */
export const WEBSITE_ICONS = {
	phone: 'https://tridentcubed.com/emails/icon-phone.png',
	email: 'https://tridentcubed.com/emails/icon-email.png',
	globe: 'https://tridentcubed.com/emails/icon-globe.png',
	linkedin: 'https://tridentcubed.com/emails/icon-linkedin.png',
	facebook: 'https://tridentcubed.com/emails/icon-facebook.png',
	whatsapp: 'https://tridentcubed.com/emails/icon-whatsapp.png',
	bbb: 'https://tridentcubed.com/emails/bbb-logo.png',
	logo: 'https://tridentcubed.com/branding/logo-dark-horizontal.png'
} as const;

/** How a picture in Google Drive is named in a choice: its file id after this. */
export const DRIVE = 'drive:';

/** How an uploaded picture is named in a choice: its file name in `UPLOAD_FOLDER` after this. */
export const UPLOAD = 'upload:';

/** An uploaded picture's file name: a hash of its bytes, and what it is. */
export const UPLOAD_FILE = /^[0-9a-f]{24}\.(jpg|png|webp)$/;

/** The biggest picture an upload takes; the screen shrinks a photo well under it first. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** The longest side the screen shrinks an uploaded picture to before it goes. */
export const UPLOAD_SIDE = 1600;

/**
 * The photo everyone starts with when the Sheet has none of their own: the Trident logo on white, from the Profile
 * Images folder in Google Drive (`profile-500x500.png`), drawn in the circle like any photo.
 */
export const DEFAULT_PHOTO = {
	file: '1IFEV95Fczh0XrG2fpG-1AG69t9wY3zXb',
	name: 'profile-500x500.png'
};

/** The banner everyone starts with when the Sheet names none: the Trident Cubed map, from the Email Banners folder. */
export const DEFAULT_BANNER = {
	file: '1UNzuLtVXhzzLeTqwVp2ad8EtHNZYchI0',
	name: 'trident-cubed-map.png',
	href: 'https://tridentcubed.com'
};

/** Where a banner someone uploads takes a reader. */
export const UPLOAD_BANNER_LINK = 'https://tridentcubed.com';

/**
 * The signature Google Sheets the website reads through Sheetari (#62): the shared addresses under each person, the
 * Google Drive photos and banners to pick from, the company's social links and the shared mailboxes. The app reads
 * them until they move into the app.
 */
export const SHEETS = {
	api: 'https://sheetari.oneezy.deno.net',
	people: '1Eauw3boJ1Gu6B78ywFuYB_bE3H1yHZyes0U0Mg9qRUs',
	social: '1BT2OPDOA-sEIF-JkyikVrB3StvsfdJNAnP4ih9bHhj4'
} as const;

/** The sheet an Admin edits those in. */
export const SHEET_EDIT_URL = `https://docs.google.com/spreadsheets/d/${SHEETS.people}/edit`;
