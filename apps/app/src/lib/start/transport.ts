// The starting Transport Modes and Facilities (Justin, 2026-11-16: "I want the transport modes and the facilities to
// be complete, having their proper location and name and photo. All of that should be real."). Every one is a real
// ship, aircraft, vehicle, port, airport or yard. A detail is here only when a source gave it: the vessels'
// particulars from their operators' sheets and the ship registers that quote them, the facilities' addresses from
// the port authorities' own pages and the state's. What no source gave is left empty for the team to fill in.
// Their pictures are in `transport/` and `facility/` beside this file, each from Wikimedia Commons under a licence
// that allows reuse; who made each one, and under which licence, is in CREDITS.md.
import type { FACILITY_KINDS, TRANSPORT_MODES } from '#lib/rows/rows.schema.js';

export type StartTransportType = {
	name: string;
	mode: (typeof TRANSPORT_MODES)[number];
	/** Its picture's file in `transport/`. */
	file: string;
	/** Its mode's particulars, by the labels the app lists for that mode. */
	particulars: Record<string, string>;
};

export type StartFacilityType = {
	name: string;
	kind: (typeof FACILITY_KINDS)[number];
	/** Its location (#320): its whole address, which its stop page prints; every other view shows its city. */
	city: string;
	phone: string;
	/** Its picture's file in `facility/`. */
	file: string;
};

export const TRANSPORTS: StartTransportType[] = [
	{
		name: 'Happy Star',
		mode: 'Vessel',
		file: 'happy-star.jpg',
		particulars: {
			'IMO number': '9661259',
			Flag: 'Netherlands',
			'Year built': '2014',
			'Length overall': '156 m'
		}
	},
	{
		name: 'Jumbo Kinetic',
		mode: 'Vessel',
		file: 'jumbo-kinetic.jpg',
		particulars: {
			'IMO number': '9634165',
			Flag: 'Netherlands',
			'Year built': '2014',
			'Gross tonnage': '18,099',
			'Length overall': '152.6 m'
		}
	},
	{
		name: 'BBC Amber',
		mode: 'Vessel',
		file: 'bbc-amber.jpg',
		particulars: {
			'IMO number': '9563706',
			Flag: 'Antigua and Barbuda',
			'Year built': '2011',
			'Gross tonnage': '12,838',
			'Length overall': '153.44 m'
		}
	},
	{
		name: 'Crowley 450-10',
		mode: 'Barge',
		file: 'crowley-450-10.jpg',
		particulars: { Flag: 'United States' }
	},
	{
		name: 'Antonov An-124 UR-82008',
		mode: 'Plane',
		file: 'antonov-ur-82008.jpg',
		particulars: {
			Registration: 'UR-82008',
			'Aircraft type': 'Antonov An-124-100M Ruslan',
			Airline: 'Antonov Airlines'
		}
	},
	{
		name: 'Union Pacific 7767',
		mode: 'Train',
		file: 'union-pacific-7767.jpg',
		particulars: { Railroad: 'Union Pacific' }
	},
	{
		name: 'Felbermayr Schnabel Car',
		mode: 'Railcar',
		file: 'felbermayr-schnabel-car.jpg',
		particulars: { Railroad: 'Felbermayr Transport- und Hebetechnik', 'Car type': 'Schnabel car' }
	},
	{
		name: 'Mammoet Actros 4161',
		mode: 'Truck',
		file: 'mammoet-actros-4161.jpg',
		particulars: { Haulier: 'Mammoet' }
	},
	{
		name: 'Scheuerle SPMT',
		mode: 'Trailer',
		file: 'scheuerle-spmt.png',
		particulars: { 'Trailer type': 'Self-propelled modular transporter' }
	}
];

export const FACILITIES: StartFacilityType[] = [
	{
		name: 'Barbours Cut Container Terminal',
		kind: 'Port',
		city: '1515 E. Barbours Cut Blvd, La Porte, TX 77571',
		phone: '+1 (713) 670-2400',
		file: 'barbours-cut.jpg'
	},
	{
		name: 'Bayport Container Terminal',
		kind: 'Port',
		city: '12621 Port Road, Pasadena, TX 77586',
		phone: '+1 (713) 670-2400',
		file: 'bayport.jpg'
	},
	{
		name: 'Turning Basin Terminal',
		kind: 'Port',
		city: '111 East Loop North, Houston, TX 77029',
		phone: '+1 (713) 670-2400',
		file: 'turning-basin.jpg'
	},
	{
		name: 'Port of Galveston',
		kind: 'Port',
		city: '123 Rosenberg Ave, Galveston, TX 77553',
		phone: '+1 (409) 766-7105',
		file: 'port-of-galveston.jpg'
	},
	{
		name: 'Port of Beaumont',
		kind: 'Port',
		city: '1225 Main St, Beaumont, TX 77701',
		phone: '+1 (409) 835-5367',
		file: 'port-of-beaumont.jpg'
	},
	{
		name: 'Port of Corpus Christi',
		kind: 'Port',
		city: '400 Harbor Drive, Corpus Christi, TX 78401',
		phone: '+1 (361) 882-5633',
		file: 'port-of-corpus-christi.jpg'
	},
	{
		name: 'Port of New Orleans',
		kind: 'Port',
		city: '1350 Port of New Orleans Place, New Orleans, LA 70130',
		phone: '',
		file: 'port-of-new-orleans.jpg'
	},
	{
		name: 'George Bush Intercontinental Airport',
		kind: 'Airport',
		city: '2800 N Terminal Rd, Houston, TX 77032',
		phone: '',
		file: 'houston-intercontinental.jpg'
	},
	{
		name: 'Union Pacific Englewood Yard',
		kind: 'Rail yard',
		city: '5500 Wallisville Rd, Houston, TX 77020',
		phone: '',
		file: 'englewood-yard.jpg'
	}
];
