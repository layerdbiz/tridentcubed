// Words for What's New's batches (#399): a friendly title and a line or two for a batch of work, in plain words for
// the team, written by whoever lands it. A note goes to the batch whose time it falls in (`at`, any moment inside
// it); a batch with none is named by when it began. The repository is public: no client names or data here.
import type { NoteType } from './history.utils.ts';

export const NOTES: NoteType[] = [
	{
		at: '2026-11-26T03:00:00Z',
		title: 'Search, pins, faces and the Activity',
		summary:
			'The menu gets a search, a Pinned list and the bell beside your picture. People show their initials, attachments show their details, the Activity groups each person’s work, and What’s New keeps every update. The app’s boxes, switches and sheets now come from one shared library, so they look and work the same everywhere.'
	},
	{
		at: '2026-11-25T09:00:00Z',
		title: 'Reports, people and who’s online',
		summary:
			'Report pages show one at a time and the contents link to each page. Other companies’ people get a phone and email, a project’s status follows the work, photo groups take PDFs and videos, the online list shows time online and each device, and the first Activity view arrives.'
	}
];
