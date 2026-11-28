// Each release on dev told in its own words (Justin, 2026-11-28): next.app lists every commit's What's New line, which
// is what he wants as the developer, but people on dev.app want "what the feature is, what it can do": each feature
// under a short bold title with a few highlights under it, then the fixes the same way. dev.app's What's New and the
// release's notes on GitHub show these in place of the lines (history.utils.ts), and next.app's Release notes show the
// next one at their top, as Coming to dev, so it is read there first.
//
// They are plain and they are kept up: every change people on dev.app will notice rewrites the coming version here, in
// the same pull request as its What's New lines, so it reads as the features are now. How to write them is
// apps/app/AGENTS.md's "A dev release is told in its highlights"; highlights.test.ts holds their shape. A release on dev
// is not made without them: dev's build and the release workflow stop and say so.

/** A feature or a fix as a release tells it: a short title and its highlights, each a short sentence. */
export type HighlightType = { title: string; points: string[] };

/** What a release on dev brings, as people on dev.app read it. */
export type HighlightsType = { features: HighlightType[]; fixes: HighlightType[] };

/** Each release's highlights, by its version. */
export const HIGHLIGHTS: Record<string, HighlightsType> = {
	// The first release: what the app does, each feature once; everything worked as expected, so no fixes.
	'1.0.0': {
		features: [
			{
				title: 'Easy sign-in',
				points: [
					'Sign in with Google, or with a code sent to your email.',
					"Add the app to your phone's home screen, and it opens like any other app.",
					'Everything you change is saved right away for the whole team.'
				]
			},
			{
				title: 'Projects, customers and team',
				points: [
					'Projects, customers, team members, transport and facilities each have their own page.',
					'See them on a map, in a list, as cards or on a board.',
					"A project's status changes by itself as the work moves along."
				]
			},
			{
				title: 'Project reports',
				points: [
					'Each project builds its report as you fill it in: the cover, time log, work stages, photos and item list.',
					'Paste in a time log instead of typing it.',
					'Download the report as a PDF, or show it one page at a time.'
				]
			},
			{
				title: 'Photos and files',
				points: [
					'Add photos, videos, PDFs and other files to a project.',
					'Sort photos into groups, and drag them where you want them.',
					'Crop, turn or straighten a photo, and write a note under it.'
				]
			},
			{
				title: 'Built-in help',
				points: [
					'Tap the ? next to a box to see what goes in it.',
					'Tap a percent to see which boxes are still empty.'
				]
			},
			{
				title: 'Search and pins',
				points: [
					'Search for anything from the menu.',
					'Pin the things you use most to the menu.',
					"See what you opened last, and who's online right now."
				]
			},
			{
				title: 'Notifications',
				points: [
					"The bell tells you when someone changes a project you're on, or adds you to one.",
					'The Activity Log shows who did what, and when.',
					"What's New shows what each update brings."
				]
			},
			{
				title: 'Settings',
				points: [
					'Settings holds your profile, your notifications and the company details.',
					'Copy your email signature from there into Outlook.'
				]
			}
		],
		fixes: []
	},
	'1.1.0': {
		features: [
			{
				title: "What's New pops up",
				points: ["When the app updates, What's New opens by itself and shows what changed."]
			}
		],
		fixes: []
	},
	'1.2.0': {
		features: [
			{
				title: 'Email signatures in the app',
				points: [
					'Your email signature now lives on your Team page. Check how it looks, then copy it into Outlook.',
					'Pick your photo, banner and link, and add group emails like Operations or Engineering.',
					'Team members: please set up your signature here soon. The old Google Sheet is going away.'
				]
			},
			{
				title: 'Team member pages',
				points: [
					'Team member pages work like project pages, with Page, Edit and Preview.',
					'The top of the page shows how complete a profile is.'
				]
			},
			{
				title: 'Activity Log for everyone',
				points: [
					"Everyone can open the Activity Log in Settings, for the projects they're on. Its buttons stay at the top as you scroll.",
					'Tap ⋮ and then View Activity on anything to see its history. On a phone it fills the screen.',
					"Turn on Group to put each person's changes in a row into one panel. Open one to see what they did."
				]
			},
			{
				title: 'Cleaner notifications',
				points: [
					'Group your notifications by person.',
					"A day's app updates show as one line. Tap it to see what changed.",
					'On a computer, notifications open in a wider panel.'
				]
			},
			{
				title: 'Better photo editor',
				points: [
					'Turn, flip and crop are easier to find, and arrows take you to the next photo.',
					'Flip through the pages of a PDF right in the editor.',
					'Photos you have changed show a small mark.'
				]
			},
			{
				title: 'Photo pages that fit',
				points: [
					'Photo pages in a report can be wide or tall.',
					'Or pick Auto, and the app turns each page so less of each photo is cut off.'
				]
			},
			{
				title: 'Help on every box',
				points: ['Every box you type in now has a ? that tells you what goes in it.']
			},
			{
				title: "Smoother What's New",
				points: [
					"What's New shows each update as a short list of features, like this one.",
					"Opening a section in What's New, or a panel in Edit, slides it smoothly to the top."
				]
			}
		],
		fixes: [
			{
				title: 'PDF pages in reports',
				points: ['A PDF page you crop or turn now shows in the report, not a blank space.']
			},
			{
				title: 'Photo editor buttons',
				points: ['Crop, Text and Reset stay in the same place.']
			}
		]
	}
};
