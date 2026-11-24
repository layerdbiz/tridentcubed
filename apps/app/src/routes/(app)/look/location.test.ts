// Where a record is (#320): its one Location keeps the whole place, and views read only its city and state, from the
// saved place's own parts when it was picked, else from the text.
import { describe, expect, it } from 'vite-plus/test';
import { cityStateOf, knowPlaces, partsOf } from './location';

describe('cityStateOf', () => {
	it('shows a whole address typed by hand as its city and state', () => {
		expect(cityStateOf('14035 Industrial Road, Houston, TX 77015, United States of America')).toBe(
			'Houston, TX'
		);
		expect(cityStateOf('La Porte, TX')).toBe('La Porte, TX');
		expect(cityStateOf('')).toBe('');
	});

	it('reads a picked place from the parts its lookup kept, not from its text', () => {
		const name = 'Suite 1, Level 10, 360 Collins Street, Melbourne, Victoria 3000, Australia';
		knowPlaces([
			{
				name,
				lat: -37.81,
				lng: 144.97,
				parts: {
					zip: '3000',
					city: 'Melbourne',
					state: 'VIC',
					street: '360 Collins Street',
					country: 'Australia'
				}
			}
		]);

		expect(cityStateOf(name)).toBe('Melbourne, Australia');
		expect(partsOf(` ${name.toUpperCase()} `).zip).toBe('3000');
	});

	it('leaves a place saved before parts were kept to the text reader', () => {
		knowPlaces([{ name: 'Beaumont, TX', lat: 30.08, lng: -94.1 }]);

		expect(partsOf('Beaumont, TX')).toMatchObject({ city: 'Beaumont', state: 'TX' });
	});
});
