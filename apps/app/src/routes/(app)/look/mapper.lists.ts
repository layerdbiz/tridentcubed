// The mapper's part for the organization's other lists (#184): Transport Modes, Facilities, saved places and the
// organization's own details (its name, letterhead, wording and disclaimer points). `toListRows` and `takeListRows`
// are called by mapper.ts's `toRows` and `takeRows`; the same rule holds: what goes out comes back equal.
import type { RowType, SavedRowType } from '#lib/rows/rows.schema.js';
import {
	type FacilityKindType,
	type FacilityType,
	ORGANIZATION,
	type OrganizationType,
	PARTICULARS,
	type TransportType,
	typeOfMode
} from './look.data';
import type { LookState } from './look.state.svelte';
import type { PlaceType } from './map.data';
import { text, toRecordId, toRecordName, toStamp } from './mapper.utils';

/**
 * A Transport Mode's particulars as saved: only the ones its mode has and that are filled in, in its mode's order.
 * The database keeps a map in its own key order, so the order is made here, both ways.
 */
export function toParticulars(mode: string, details: Record<string, string> | undefined) {
	const particulars: Record<string, string> = {};
	for (const label of PARTICULARS[mode] ?? []) {
		const value = details?.[label] ?? '';
		if (value) particulars[label] = value;
	}
	return particulars;
}

function toOrganizationRows(organization: OrganizationType): RowType[] {
	const rows: RowType[] = [];
	if (organization.id)
		rows.push({ table: 'organization', id: organization.id, values: { name: organization.name } });
	const { detailsId } = organization;
	if (!detailsId) return rows;
	rows.push({
		table: 'organization_details',
		id: detailsId,
		values: {
			logo: organization.logo,
			address: organization.address,
			phone: organization.phone,
			email: organization.email,
			groupEmail: organization.groupEmail,
			website: organization.website,
			disclaimerOpening: organization.disclaimer.opening,
			disclaimerNote: organization.disclaimer.note,
			closing: organization.closing,
			signoff: organization.signoff
		}
	});
	for (const [position, point] of organization.disclaimer.points.entries())
		rows.push({
			table: 'disclaimer_point',
			id: point.id,
			values: { detailsId, position, title: point.title, text: point.text }
		});
	return rows;
}

/** The lists' part of the screens' state as rows. A record with no id yet is not one the server knows. */
export function toListRows(look: LookState): RowType[] {
	const rows: RowType[] = [];
	for (const transport of look.transports)
		if (transport.id)
			rows.push({
				table: 'transport',
				id: transport.id,
				values: {
					name: transport.name,
					mode: transport.mode,
					picture: transport.photo ?? '',
					source: transport.source,
					particulars: toParticulars(transport.mode, transport.details)
				}
			});
	for (const facility of look.facilities)
		if (facility.id)
			rows.push({
				table: 'facility',
				id: facility.id,
				values: {
					name: facility.name,
					kind: facility.kind,
					city: facility.city ?? '',
					address: facility.address ?? '',
					picture: facility.photo ?? '',
					contactName: facility.contact ?? '',
					phone: facility.phone ?? '',
					email: facility.email ?? ''
				}
			});
	for (const place of look.places)
		if (place.id)
			rows.push({
				table: 'place',
				id: place.id,
				values: {
					name: place.name,
					latitude: place.lat,
					longitude: place.lng,
					detail: place.detail ?? ''
				}
			});
	rows.push(...toOrganizationRows(look.organization));
	return rows;
}

function toTransport(row: SavedRowType): TransportType {
	const { values } = row;
	const mode = text(values, 'mode');
	return {
		id: row.id,
		name: text(values, 'name'),
		type: typeOfMode(mode) ?? 'Sea',
		mode,
		source: text(values, 'source') === 'api' ? 'api' : 'manual',
		photo: text(values, 'picture'),
		details: toParticulars(mode, values.particulars as Record<string, string> | undefined),
		created: toStamp(row.createdAt),
		updated: toStamp(row.updatedAt)
	};
}

function toFacility(row: SavedRowType): FacilityType {
	const { values } = row;
	return {
		id: row.id,
		name: text(values, 'name'),
		kind: text(values, 'kind') as FacilityKindType,
		city: text(values, 'city'),
		address: text(values, 'address'),
		photo: text(values, 'picture'),
		contact: text(values, 'contactName'),
		phone: text(values, 'phone'),
		email: text(values, 'email'),
		created: toStamp(row.createdAt),
		updated: toStamp(row.updatedAt)
	};
}

function toPlace(row: SavedRowType): PlaceType {
	const { values } = row;
	return {
		id: row.id,
		name: text(values, 'name'),
		lat: Number(values.latitude),
		lng: Number(values.longitude),
		detail: text(values, 'detail'),
		created: toStamp(row.createdAt)
	};
}

// The organization as the screens hold it. Before its rows load (or for a Guest) it is Trident Cubed's starting one.
function toOrganization(rows: SavedRowType[]): OrganizationType {
	const found = rows.find((row) => row.table === 'organization');
	const details = rows.find((row) => row.table === 'organization_details');
	if (!found) return structuredClone(ORGANIZATION);
	const name = text(found.values, 'name');
	if (!details) return { ...structuredClone(ORGANIZATION), id: found.id, name };
	const { values } = details;
	const points = rows
		.filter((row) => row.table === 'disclaimer_point' && row.values.detailsId === details.id)
		.sort((a, b) => Number(a.values.position) - Number(b.values.position))
		.map((row) => ({
			id: row.id,
			title: text(row.values, 'title'),
			text: text(row.values, 'text')
		}));
	return {
		id: found.id,
		detailsId: details.id,
		name,
		logo: text(values, 'logo'),
		address: text(values, 'address'),
		phone: text(values, 'phone'),
		email: text(values, 'email'),
		groupEmail: text(values, 'groupEmail'),
		website: text(values, 'website'),
		disclaimer: {
			opening: text(values, 'disclaimerOpening'),
			points,
			note: text(values, 'disclaimerNote')
		},
		closing: text(values, 'closing'),
		signoff: text(values, 'signoff')
	};
}

/** The server's rows of the lists into the screens' state, in place of what it held for them. */
export function takeListRows(look: LookState, rows: SavedRowType[]) {
	const transports = rows.filter((row) => row.table === 'transport');
	const facilities = rows.filter((row) => row.table === 'facility');
	look.transports = transports.filter((row) => !row.deletedAt).map(toTransport);
	look.trashed.transports = transports.filter((row) => row.deletedAt).map(toTransport);
	look.facilities = facilities.filter((row) => !row.deletedAt).map(toFacility);
	look.trashed.facilities = facilities.filter((row) => row.deletedAt).map(toFacility);
	look.places = rows.filter((row) => row.table === 'place' && !row.deletedAt).map(toPlace);
	look.organization = toOrganization(rows);
}

/** A Transport Mode's id from the name the screens use, in the Trash or not (#188: a stop's transport). */
export function toTransportId(look: LookState, name: string) {
	return toRecordId(look.transports, look.trashed.transports, name);
}

/** The name the screens use for a Transport Mode's id, in the Trash or not. */
export function toTransportName(look: LookState, id: string) {
	return toRecordName(look.transports, look.trashed.transports, id);
}

/** A Facility's id from the name the screens use, in the Trash or not (#188: a stop's facility). */
export function toFacilityId(look: LookState, name: string) {
	return toRecordId(look.facilities, look.trashed.facilities, name);
}

/** The name the screens use for a Facility's id, in the Trash or not. */
export function toFacilityName(look: LookState, id: string) {
	return toRecordName(look.facilities, look.trashed.facilities, id);
}
