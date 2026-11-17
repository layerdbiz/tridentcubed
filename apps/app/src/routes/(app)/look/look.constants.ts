// The look each part of the app shows, by part id. The look prototype (#161) let Justin flip each part between
// letters with its prototype selector; V1 (#180) ships without the selector, and each part shows the letter that
// was its default there (the newest, or the one he picked). The code of the other letters is still in the parts
// that read `look.variant(id)` and goes with the UI cleanup after sign-in and the database (spec #179, out of scope).
export const LOOKS: Record<string, string> = {
	bar: 'E',
	sidebar: 'B',
	login: 'A',
	add: 'C',
	more: 'A',
	'dash-header': 'C',
	top: 'B',
	'chart-choice': 'B',
	stats: 'B',
	map: 'B',
	area: 'A',
	bars: 'A',
	pie: 'B',
	half: 'B',
	list: 'A',
	cards: 'A',
	board: 'A',
	header: 'C',
	'page-picture': 'B',
	'page-map': 'B',
	'project-page': 'A',
	'record-page': 'A',
	panels: 'B',
	'panel-project': 'A',
	'panel-transport': 'A',
	'panel-items': 'A',
	'panel-timelog': 'A',
	'panel-photos': 'A',
	'record-form': 'A',
	cover: 'A',
	report: 'B',
	'report-transport': 'B',
	'report-timelog': 'A',
	'report-photos': 'A',
	disclaimer: 'B',
	zoom: 'A',
	settings: 'A'
};

// The letter a part shows; a part not listed has only the one look, A.
export function lookOf(id: string) {
	return LOOKS[id] ?? 'A';
}
