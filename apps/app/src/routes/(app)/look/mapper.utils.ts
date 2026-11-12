// What every part of the mapper shares (mapper.ts and its parts, mapper.<part>.ts): reading a column as text, the
// order of rows by `position`, the server's times as the screens' stamps, and the name <-> id lookup of a record the
// screens name by name.
import type { RowType } from '#lib/rows/rows.schema.js';

/** A column's value as the screens' text: '' for nothing. */
export function text(values: RowType['values'], column: string) {
	return String(values[column] ?? '');
}

/** Sorts rows by their place in their list. */
export function byPosition(a: { values: RowType['values'] }, b: { values: RowType['values'] }) {
	return Number(a.values.position) - Number(b.values.position);
}

/** A server time as the stamp the screens keep: "2026-11-10T16:20", in this device's time zone. */
export function toStamp(iso: string) {
	const time = new Date(iso);
	return new Date(time.getTime() - time.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

type NamedType = { id?: string; name: string };

/** A record's id from the name the screens use: the records on the page first, then the Trash. */
export function toRecordId(live: NamedType[], trashed: NamedType[], name: string) {
	return (
		live.find((record) => record.name === name) ?? trashed.find((record) => record.name === name)
	)?.id;
}

/** The name the screens use for a record's id, on the page or in the Trash. */
export function toRecordName(live: NamedType[], trashed: NamedType[], id: string) {
	return [...live, ...trashed].find((record) => record.id === id)?.name;
}
