// Plain words for What's New (#399), for the changes made before every commit carried its own (Justin, 2026-11-27:
// "only things in layman terms for the user"). Each is the commit's title words, as releases.utils.ts reads them,
// and what people noticed, in everyday words. A change missing here stays out of What's New: the work behind the
// scenes, the library's own pieces, the prototype days. Commits from now on say it themselves, in a line
// `What's New: <words>` in their message (apps/app/AGENTS.md). The repository is public: no client names or data.
import type { PlainType } from './history.utils.ts';

export const PLAIN: PlainType = {
	// 2026-11-16 to 11-19
	'Sign in and save to the real database':
		'Sign in with your email, and your work is saved for the whole team.',
	'Cards show photos, samples finish themselves, no selection while dragging':
		'Project cards show their photos again.',
	'Install the app on phones': "Install the app on your phone's home screen.",
	'Stop the update note coming back after every tap':
		'The update message no longer comes back after every tap.',
	'Recents and online panels in the menu, safari dropdowns fixed':
		"The menu shows your recent items and who's online.",
	"Report qr codes open the project's preview at their page":
		'The QR codes in a report open that page of the report.',
	'Operations panel with stages, a title on every photo panel, a switch on every group':
		'A new Operations section, with its stages.',
	'Pictures no longer go missing from pdf exports':
		'Pictures no longer go missing from downloaded PDFs.',
	'Project date, job number and customer reference on the report':
		'Reports show the project date, job number and customer reference.',
	'The time log prints in reports again': 'The time log prints in reports again.',
	'Tidier cover, vessel photo on transport mode, switched-off panels read not planned':
		'A tidier report cover.',
	'Online list shows the newest arrival first and who is idle':
		"The online list shows who arrived last and who's away.",
	'Completed counts match the inputs in each section': "Completed counts match what's filled in.",
	'Project files link, whole items pictures and attach any file':
		'Attach any file to a project, and link to its files.',
	'The preview keeps your scroll spot when fresh data arrives':
		'The preview stays where you scrolled when new data comes in.',
	"Report prints the customer's own location beside its name":
		"Reports show the customer's location next to its name.",
	'Pdf download works for big reports and shows its progress':
		'Big reports download as a PDF, with a progress bar.',
	'A pasted or uploaded packing list prints as a table':
		'A pasted or uploaded packing list prints as a table.',
	'Cover route strip, editable report description, contact details and one-page disclaimer':
		'The report cover shows the trip, and you can edit the report description.',
	// 2026-11-20 to 11-24
	'Taps, swipes and preview drags no longer freeze the screen':
		'Taps, swipes and drags no longer freeze the screen.',
	'Photo sliders show every photo and always light a dot': 'Photo sliders show every photo.',
	'Final cover trip strip and photos dragged between groups':
		'Drag photos from one group to another.',
	'Page ranges in the contents and a page count on long photo groups':
		'The contents show the pages of each section.',
	'Run the table of contents on to a continued page':
		'A long contents list carries on to the next page.',
	'Open photos in a pop-up to crop and describe': 'Tap a photo to crop it and describe it.',
	"Convert photos the phone can't read on the server": 'Photos in any format can be added.',
	'Help text for every input, from the database': 'Every field has a ? that explains it.',
	'Type a location once and show only city and state':
		'Places are typed once and show just the city and state.',
	// 2026-11-25
	'Spread the preview pages over the whole screen': 'The preview uses the whole screen.',
	'Present the report pages one at a time': 'Present a report one page at a time.',
	"Add phone and email to other companies' people":
		'Add a phone number and email for people at other companies.',
	'Status follows the work, and a Team Lead alone completes the team':
		"A project's status moves along with the work.",
	'Link each contents line to its page': 'Tap a line in the contents to go to its page.',
	'Show time online and device in the online list':
		'The online list shows how long each person has been on, and on what device.',
	'Add PDFs and videos to photo groups': 'Add PDFs and videos to photo groups.',
	'Draw a Sent, Complete or Archived project all in its status colour':
		'Sent, Complete and Archived projects show in their status colour.',
	'Add an Activity view to the profile menu': "See the team's Activity from your profile menu.",
	'List the empty inputs behind a percent': 'Tap a percent to see which fields are still empty.',
	"Count an attached PDF as the Items panel's item list": 'Attach a PDF as the item list.',
	// 2026-11-26
	'Show initials and company codes instead of icons':
		'People and companies show their initials when they have no picture.',
	'Show the bell beside your picture on desktop':
		'The notifications bell sits next to your picture.',
	'Add a Pinned list to the menu': 'Pin anything to the menu.',
	"Show each attachment's original and saved details, and its real type":
		'See the details of each attachment.',
	"Show what's new after each update, with the version in the profile menu":
		"What's New shows what changed after each update.",
	'Add a search pop-up to the menu': 'Search from the menu.',
	'Group the Activity by person first, link its names, and record every sign-in in the database':
		"The Activity groups each person's work.",
	'Search groups by page with avatars, and opens from an icon beside the logo':
		'Search results are grouped by page.',
	'Reload, the X and a tap outside always bring the newest version':
		'Updating always brings the newest version.',
	"List every metadata field, and when and where it was taken, in the photo's Details":
		"See when and where a photo was taken in the photo's Details.",
	"Give a photo just taken the phone's place when the phone strips it, and ask for location once":
		'Photos taken in the app keep where they were taken.',
	'Record sign-outs, unused sign-in codes, project opens and PDF downloads in the Activity':
		'The Activity shows sign-outs, opened projects and PDF downloads.',
	'Import a time log from pasted text or a file, checked before it is added':
		'Import a time log by pasting text or adding a file.',
	"Show the version and link each release's notes in What's New":
		"What's New shows the version and links to its release notes.",
	'Opening a project no longer saves a Location change':
		'Opening a project no longer changes its location.',
	'Select several photos at once': 'Select several photos at once.',
	'The team types in Spanish and the report prints the English beside it':
		'Type in Spanish, and the report prints the English beside it.',
	"A tap from one field into the next no longer closes a phone's keyboard mid-tap":
		'The keyboard stays up when you tap from one field to the next.',
	"The bell's Notifications stay on the screen of a phone":
		"Notifications fit on a phone's screen.",
	// 2026-11-27
	"Every push to next is a prerelease, v1.0.0-next.1 and on, and a new release opens What's New on its own glow":
		"Every update has a version number, and What's New opens it in its own colours."
};

/**
 * Tickets whose work is on the branch but switched off for now, left out of What's New and a release's notes until
 * they are taken off here, when the feature is turned on. #360 Translate to English (Justin, 2026-11-27: "I don't
 * want you to include the translate to English feature yet").
 */
export const HIDDEN_TICKETS = [360];
