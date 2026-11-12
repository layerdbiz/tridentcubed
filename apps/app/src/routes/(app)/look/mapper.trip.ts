// The mapper for what the Transport Mode, Items and Time Log panels hold (#188; spec #179 stories 54 to 56 and 58):
// the trip's stops, the item rows and attachments, and the time log's days and entries, as rows and back. mapper.ts
// calls it per panel. Order is data: each row's `position` is its place in its list. A stop names its Transport Mode
// and Facility by id here, so a renamed one shows on every stop without the stop rows changing.
//
// Stops load with the lists (registry scope `organization`), so the lists can show a project's route and the
// Transport Mode and Facility pages the projects that call on them before the project opens.
import type { RowType } from '#lib/rows/rows.schema.js';
import {
	type AttachmentType,
	type DayType,
	type ItemType,
	type PanelType,
	type PointType,
	type ProjectType,
	type StopType,
	typeOfMode
} from './look.data';
import type { LookState } from './look.state.svelte';
import { toFacilityId, toFacilityName, toTransportId, toTransportName } from './mapper.lists';

type ValuesType = RowType['values'];

function text(values: ValuesType, column: string) {
	return String(values[column] ?? '');
}

function byPosition(a: { values: ValuesType }, b: { values: ValuesType }) {
	return Number(a.values.position) - Number(b.values.position);
}

/** The rows of what one panel holds, by its kind: stops, items and attachments, or days and entries. */
export function toPanelRows(look: LookState, projectId: string, panel: PanelType): RowType[] {
	const panelId = panel.id;
	if (panel.kind === 'transport')
		return panel.stops.map((stop, position) => ({
			table: 'stop',
			id: stop.id,
			values: {
				projectId,
				panelId,
				position,
				point: stop.point,
				leg: stop.leg ?? '',
				transportId: (stop.name && toTransportId(look, stop.name)) || null,
				facilityId: (stop.facility && toFacilityId(look, stop.facility)) || null,
				mode: stop.mode,
				isExtra: Boolean(stop.isExtra)
			}
		}));
	if (panel.kind === 'items')
		return [
			...panel.items.map((item, position) => ({
				table: 'item' as const,
				id: item.id,
				values: {
					projectId,
					panelId,
					position,
					quantity: item.quantity,
					description: item.description
				}
			})),
			...(panel.attachments ?? []).map((file, position) => ({
				table: 'item_attachment' as const,
				id: file.id,
				values: { projectId, panelId, position, name: file.name, file: file.src, kind: file.kind }
			}))
		];
	if (panel.kind === 'timelog')
		return panel.days.flatMap((day, position) => [
			{
				table: 'time_log_day' as const,
				id: day.id,
				values: { projectId, panelId, position, date: day.date }
			},
			...day.entries.map((entry, index) => ({
				table: 'time_log_entry' as const,
				id: entry.id,
				values: {
					projectId,
					dayId: day.id,
					position: index,
					time: entry.time,
					activity: entry.activity
				}
			}))
		]);
	return [];
}

function toStop(look: LookState, row: RowType): StopType {
	const { values } = row;
	const mode = text(values, 'mode');
	const stop: StopType = {
		id: row.id,
		point: text(values, 'point') as StopType['point'],
		type: typeOfMode(mode) ?? '',
		mode,
		name: values.transportId ? (toTransportName(look, String(values.transportId)) ?? '') : '',
		facility: values.facilityId ? (toFacilityName(look, String(values.facilityId)) ?? '') : ''
	};
	if (values.leg) stop.leg = String(values.leg);
	if (values.isExtra) stop.isExtra = true;
	return stop;
}

function ofTable(rows: RowType[], table: RowType['table'], column: string, id: string) {
	return rows.filter((row) => row.table === table && row.values[column] === id).sort(byPosition);
}

/** What one panel holds, from its rows, in place of what it held. A panel with no rows holds nothing. */
export function takePanelRows(look: LookState, panel: PanelType, rows: RowType[]) {
	if (panel.kind === 'transport')
		panel.stops = ofTable(rows, 'stop', 'panelId', panel.id).map((row) => toStop(look, row));
	if (panel.kind === 'items') {
		panel.items = ofTable(rows, 'item', 'panelId', panel.id).map((row): ItemType => ({
			id: row.id,
			quantity: text(row.values, 'quantity'),
			description: text(row.values, 'description')
		}));
		panel.attachments = ofTable(rows, 'item_attachment', 'panelId', panel.id).map(
			(row): AttachmentType => ({
				id: row.id,
				name: text(row.values, 'name'),
				src: text(row.values, 'file'),
				kind: text(row.values, 'kind') === 'file' ? 'file' : 'photo'
			})
		);
	}
	if (panel.kind === 'timelog')
		panel.days = ofTable(rows, 'time_log_day', 'panelId', panel.id).map((day): DayType => ({
			id: day.id,
			date: text(day.values, 'date'),
			entries: ofTable(rows, 'time_log_entry', 'dayId', day.id).map((entry) => ({
				id: entry.id,
				time: text(entry.values, 'time'),
				activity: text(entry.values, 'activity')
			}))
		}));
}

/** A project's stop rows (the lists'), each project's in its own list. */
export function stopsByProject(rows: RowType[]) {
	const stops = new Map<string, RowType[]>();
	for (const row of rows)
		if (row.table === 'stop') {
			const projectId = text(row.values, 'projectId');
			stops.set(projectId, [...(stops.get(projectId) ?? []), row]);
		}
	return stops;
}

/** The trip as the lists show it (its route, its map pin, the pages of its transports and facilities). */
export function toTrip(look: LookState, rows: RowType[]): ProjectType['stops'] {
	return [...rows]
		.sort(byPosition)
		.map((row) => toStop(look, row))
		.filter((stop) => stop.name || stop.facility)
		.map((stop) => ({
			point: (stop.point || 'Stop') as PointType,
			transport: stop.name,
			facility: stop.facility
		}));
}
