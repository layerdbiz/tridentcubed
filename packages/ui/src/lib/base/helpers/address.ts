// The address reader (#320): a place is typed or picked once, as one line, and every part of it is read from that
// line here: street, city, state, zip and country. Views show only `toCityState`, "Houston, TX" (abroad, "London,
// United Kingdom"), never the street. A place the lookup found keeps its parts already read, so this reader is for
// lines typed by hand; it remembers each line it has read, so asking again costs nothing.

export type AddressPartsType = {
	street: string;
	city: string;
	/** The state or province, as its short code when the line gives one: "TX", "QC". */
	state: string;
	zip: string;
	country: string;
};

const EMPTY: AddressPartsType = { street: '', city: '', state: '', zip: '', country: '' };
const KEPT = 1000;
const READ = new Map<string, AddressPartsType>();

const UNITED_STATES = /^(united states( of america)?|usa?|u\.s\.(a\.)?)$/i;
// A state or province code: "TX", "QC", "TAM".
const CODE = /^[A-Z]{2,3}$/;
// A code and a zip: "TX 77015", "IL 60196-1056", "QC H9P 2S7", "SP 04543-000".
const CODE_ZIP = /^([A-Z]{2,3})\s+(\d[\d-]{3,9}|[A-Z]\d[A-Z]\s?\d[A-Z]\d)$/;
// A zip before the city, as Europe writes it: "20457 Hamburg".
const ZIP_CITY = /^(\d[\d-]{3,})\s+(\D.*)$/;
// A city before its zip: "Singapore 069906", "London EC3M 3AW".
const CITY_ZIP = /^(\D+?)\s+(\d[\d-]{3,}|[A-Z]{1,2}\d[A-Z\d]?\s\d[A-Z]{2})$/;
// A zip on a line of its own: "Houston, Texas, 77032".
const ZIP = /^\d[\d-]{3,9}$/;
// A Dutch postcode before the city: "1114 AD Amsterdam-Duivendrecht".
const DUTCH_CITY = /^(\d{4}\s?[A-Z]{2})\s+(\D.*)$/;
const DIGIT = /\d/;

// A state written out ("Houston, Texas") reads as its code, so every view shows "Houston, TX".
const STATES: Record<string, string> = {
	alabama: 'AL',
	alaska: 'AK',
	arizona: 'AZ',
	arkansas: 'AR',
	california: 'CA',
	colorado: 'CO',
	connecticut: 'CT',
	delaware: 'DE',
	florida: 'FL',
	georgia: 'GA',
	hawaii: 'HI',
	idaho: 'ID',
	illinois: 'IL',
	indiana: 'IN',
	iowa: 'IA',
	kansas: 'KS',
	kentucky: 'KY',
	louisiana: 'LA',
	maine: 'ME',
	maryland: 'MD',
	massachusetts: 'MA',
	michigan: 'MI',
	minnesota: 'MN',
	mississippi: 'MS',
	missouri: 'MO',
	montana: 'MT',
	nebraska: 'NE',
	nevada: 'NV',
	'new hampshire': 'NH',
	'new jersey': 'NJ',
	'new mexico': 'NM',
	'new york': 'NY',
	'north carolina': 'NC',
	'north dakota': 'ND',
	ohio: 'OH',
	oklahoma: 'OK',
	oregon: 'OR',
	pennsylvania: 'PA',
	'rhode island': 'RI',
	'south carolina': 'SC',
	'south dakota': 'SD',
	tennessee: 'TN',
	texas: 'TX',
	utah: 'UT',
	vermont: 'VT',
	virginia: 'VA',
	washington: 'WA',
	'west virginia': 'WV',
	wisconsin: 'WI',
	wyoming: 'WY',
	'district of columbia': 'DC'
};

function toStateCode(line: string) {
	return STATES[line.toLowerCase()] ?? '';
}

function isUnitedStates(country: string) {
	return UNITED_STATES.test(country.trim());
}

function read(text: string): AddressPartsType {
	const lines = text
		.split(',')
		.map((line) => line.trim())
		.filter(Boolean);
	if (!lines.length) return { ...EMPTY };
	const parts = { ...EMPTY };

	// The country comes last, has no digits and is not a state; two lines are a city and its country.
	const last = lines.at(-1) ?? '';
	const isCountry = !DIGIT.test(last) && !CODE.test(last) && !toStateCode(last);
	if (lines.length >= 2 && isCountry) parts.country = lines.pop() ?? '';
	if (ZIP.test(lines.at(-1) ?? '') && lines.length >= 2) parts.zip = lines.pop() ?? '';

	const line = lines.pop() ?? '';
	let match: RegExpMatchArray | null;
	if ((match = line.match(CODE_ZIP))) {
		[, parts.state, parts.zip] = match;
		parts.city = lines.pop() ?? '';
	} else if (toStateCode(line) && lines.length) {
		parts.state = toStateCode(line);
		parts.city = lines.pop() ?? '';
	} else if (parts.country && (match = line.match(DUTCH_CITY) ?? line.match(ZIP_CITY))) {
		// Only abroad: at home "8301 Scenic Hwy." is a street.
		[, parts.zip, parts.city] = match;
	} else if ((match = line.match(CITY_ZIP))) {
		[, parts.city, parts.zip] = match;
	} else if (CODE.test(line)) {
		parts.state = line;
		parts.city = lines.pop() ?? '';
	} else if (DIGIT.test(line.charAt(0))) {
		// A street alone ("8301 Scenic Hwy."): no city to show.
		lines.push(line);
	} else {
		parts.city = line;
	}
	parts.street = lines.join(', ');
	return parts;
}

/** Every part of a place, read once from the line it was typed or picked as. */
export function toAddressParts(text: string): AddressPartsType {
	const line = text.trim();
	const kept = READ.get(line);
	if (kept) return { ...kept };
	const parts = read(line);
	if (READ.size >= KEPT) READ.clear();
	READ.set(line, parts);
	return { ...parts };
}

/** What every view shows of a place: "Houston, TX", or abroad "London, United Kingdom". Never the street. */
export function toCityState(place: string | Partial<AddressPartsType>): string {
	const {
		city = '',
		state = '',
		country = ''
	} = typeof place === 'string' ? toAddressParts(place) : place;
	const isAbroad = Boolean(country) && !isUnitedStates(country);
	const region = isAbroad || !state ? country : state;
	if (!city) return '';
	if (!region || region === city || isUnitedStates(region)) return city;
	return `${city}, ${region}`;
}
