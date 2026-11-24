// The address reader (#320): every part of a place read from the one line it is typed or picked as, and the short
// "City, ST" every view shows. The lines below are the shapes the app's places come in: the place lookup's own
// formatted lines, addresses typed by hand before it, and bare cities.
import { describe, expect, it } from 'vite-plus/test';
import { toAddressParts, toCityState } from './address';

describe('toAddressParts', () => {
	it('reads a United States street address from the place lookup', () => {
		expect(
			toAddressParts('14035 Industrial Road, Houston, TX 77015, United States of America')
		).toEqual({
			street: '14035 Industrial Road',
			city: 'Houston',
			state: 'TX',
			zip: '77015',
			country: 'United States of America'
		});
	});

	it('reads an address typed by hand with no country', () => {
		expect(toAddressParts('1515 E. Barbours Cut Blvd, La Porte, TX 77571')).toEqual({
			street: '1515 E. Barbours Cut Blvd',
			city: 'La Porte',
			state: 'TX',
			zip: '77571',
			country: ''
		});
	});

	it('keeps every line before the city in the street', () => {
		expect(
			toAddressParts('2900 North Loop W, Suite 1100, Houston, TX 77092, United States')
		).toMatchObject({ street: '2900 North Loop W, Suite 1100', city: 'Houston', zip: '77092' });
	});

	it('reads a state with no zip', () => {
		expect(toAddressParts('3808 Cookson Road, East St. Louis, IL, United States')).toMatchObject({
			street: '3808 Cookson Road',
			city: 'East St. Louis',
			state: 'IL',
			zip: ''
		});
	});

	it('reads a nine digit zip', () => {
		expect(
			toAddressParts('1299 Zurich Way, Schaumburg, IL 60196-1056, United States')
		).toMatchObject({ city: 'Schaumburg', state: 'IL', zip: '60196-1056' });
	});

	it('reads a bare city and state', () => {
		expect(toAddressParts('Houston, TX')).toEqual({
			street: '',
			city: 'Houston',
			state: 'TX',
			zip: '',
			country: ''
		});
	});

	it('reads a bare city and country', () => {
		expect(toAddressParts('Hamburg, Germany')).toMatchObject({
			city: 'Hamburg',
			country: 'Germany'
		});
	});

	it('reads a city alone', () => {
		expect(toAddressParts('Cartagena De Indias')).toMatchObject({
			street: '',
			city: 'Cartagena De Indias'
		});
	});

	it('reads a street alone as a street, never a city', () => {
		expect(toAddressParts('8301 Scenic Hwy.')).toMatchObject({
			street: '8301 Scenic Hwy.',
			city: ''
		});
	});

	it('reads a zip written before the city', () => {
		expect(toAddressParts('Am Sandtorkai 29, 20457 Hamburg, Germany')).toEqual({
			street: 'Am Sandtorkai 29',
			city: 'Hamburg',
			state: '',
			zip: '20457',
			country: 'Germany'
		});
	});

	it('reads a zip written after the city', () => {
		expect(toAddressParts('20 Fenchurch Street, London EC3M 3AW, United Kingdom')).toMatchObject({
			city: 'London',
			zip: 'EC3M 3AW',
			country: 'United Kingdom'
		});
		expect(toAddressParts('87B Amoy Street, Singapore 069906')).toMatchObject({
			street: '87B Amoy Street',
			city: 'Singapore',
			zip: '069906'
		});
	});

	it('reads a province code and a postal code abroad', () => {
		expect(
			toAddressParts('2100 Avenue Reverchon, Suite 100, Dorval, QC H9P 2S7, Canada')
		).toMatchObject({ city: 'Dorval', state: 'QC', zip: 'H9P 2S7', country: 'Canada' });
		expect(
			toAddressParts(
				'Avenida Presidente Juscelino Kubitschek, 360, Vila Nova Conceição, São Paulo, SP 04543-000, Brazil'
			)
		).toMatchObject({ city: 'São Paulo', state: 'SP', zip: '04543-000', country: 'Brazil' });
	});

	it('reads a state written out as its code, and a zip on its own line', () => {
		expect(toAddressParts('Houston, Texas')).toMatchObject({
			city: 'Houston',
			state: 'TX',
			country: ''
		});
		expect(toAddressParts('14950 Heathrow Forest Pkwy Ste 230, Houston, Texas, 77032')).toEqual({
			street: '14950 Heathrow Forest Pkwy Ste 230',
			city: 'Houston',
			state: 'TX',
			zip: '77032',
			country: ''
		});
	});

	it('reads a Dutch postcode', () => {
		expect(
			toAddressParts('H.J.E. Wenckebachweg 58, 1114 AD Amsterdam-Duivendrecht, Netherlands')
		).toMatchObject({ city: 'Amsterdam-Duivendrecht', zip: '1114 AD', country: 'Netherlands' });
	});

	it('gives nothing for nothing', () => {
		expect(toAddressParts('  ')).toEqual({ street: '', city: '', state: '', zip: '', country: '' });
	});
});

describe('toCityState', () => {
	it('shows a United States place as city and state', () => {
		expect(toCityState('14035 Industrial Road, Houston, TX 77015, United States of America')).toBe(
			'Houston, TX'
		);
		expect(toCityState('Houston, TX')).toBe('Houston, TX');
	});

	it('shows a place abroad as city and country', () => {
		expect(toCityState('20 Fenchurch Street, London EC3M 3AW, United Kingdom')).toBe(
			'London, United Kingdom'
		);
		expect(toCityState('2100 Avenue Reverchon, Suite 100, Dorval, QC H9P 2S7, Canada')).toBe(
			'Dorval, Canada'
		);
		expect(toCityState('Hamburg, Germany')).toBe('Hamburg, Germany');
	});

	it('takes parts already read, such as the place lookup keeps', () => {
		expect(toCityState({ city: 'Houston', state: 'TX', country: 'United States' })).toBe(
			'Houston, TX'
		);
		expect(toCityState({ city: 'Melbourne', state: 'VIC', country: 'Australia' })).toBe(
			'Melbourne, Australia'
		);
	});

	it('shows a city alone when that is all there is', () => {
		expect(toCityState('Cartagena De Indias')).toBe('Cartagena De Indias');
		expect(toCityState({ city: 'Singapore', country: 'Singapore' })).toBe('Singapore');
	});

	it('never shows a street', () => {
		expect(toCityState('8301 Scenic Hwy.')).toBe('');
		expect(toCityState('')).toBe('');
	});
});
