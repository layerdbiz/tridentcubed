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

/** Where the screen asks for a signature: its own Vercel function, since it makes pictures with sharp. */
export const SIGNATURE_API = '/api/signature';

/**
 * How big each picture is made: twice the size the signature shows it at (a 112 px photo, a banner up to 600 px), so
 * it stays sharp on a high-density screen.
 */
export const PICTURE_SIZES = {
	photo: { width: 224, height: 264 },
	banner: { width: 1200, height: 600 }
} as const;

/**
 * Raised when the way a picture is made changes, so every picture is made again under a new name and emails already
 * sent keep the one they were sent with.
 */
export const PICTURE_VERSION = 1;

/** The picture a signature shows for someone with no photo, as the website's signatures do. */
export const COMPANY_LOGO = 'https://tridentcubed.com/branding/logo.png';

/** The website's own files, which stay where they are: they never move with the app's storage or database. */
export const OWN_HOSTS = ['tridentcubed.com', 'www.tridentcubed.com'];

/**
 * The signature Google Sheets the website reads through Sheetari (#62): the shared addresses under each person, the
 * banners, the company's social links and the shared mailboxes. The app reads them until they move into the app.
 */
export const SHEETS = {
	api: 'https://sheetari.oneezy.deno.net',
	people: '1Eauw3boJ1Gu6B78ywFuYB_bE3H1yHZyes0U0Mg9qRUs',
	social: '1BT2OPDOA-sEIF-JkyikVrB3StvsfdJNAnP4ih9bHhj4'
} as const;

/** The sheet an Admin edits those in. */
export const SHEET_EDIT_URL = `https://docs.google.com/spreadsheets/d/${SHEETS.people}/edit`;
