// Each release on dev told in its own words (Justin, 2026-11-28): next.app lists every commit's What's New line, which
// is what he wants as the developer, but people on dev.app want "what the feature is, what it can do": each feature
// under a short bold title with a few highlights under it, then the fixes the same way. dev.app's What's New and the
// release's notes on GitHub show these in place of the lines (history.utils.ts), and next.app's Release notes show the
// next one at their top, as Coming to dev, so it is read there first.
//
// They are written as the work lands (Justin, 2026-11-28: "in the same breath"): a change people on dev.app will notice
// folds itself in here, in the same pull request as its What's New lines, for the version next leads to (the base of
// next's versions: v1.2.0-next.19 leads to 1.2.0). Rounds of work on one thing fold into the thing as it is now, and
// what was tried and replaced is left out. A fix is only for a problem people on dev.app had:
// one made and mended on next never reached them. A release on dev is not made without them: dev's build and the
// release workflow stop and say so (apps/app/AGENTS.md, "Releases and What's New").

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
				title: 'Sign in and work together',
				points: [
					'Sign in with Google or a code sent to your email.',
					'Everything you do is saved for the whole team.',
					"Install the app on your phone's home screen."
				]
			},
			{
				title: 'Projects, customers and the team',
				points: [
					'Projects, customers, the team, transport and facilities each have a page, on a map and as a list, cards or a board.',
					"A project's status moves along with the work.",
					'Keep a phone number and email for people at other companies; anyone without a picture shows their initials.'
				]
			},
			{
				title: 'Reports that build themselves',
				points: [
					'Each project builds its report as you fill it in: the cover with the trip, the contents, the time log, the operations stages, the photos and the item list.',
					'Download a report as a PDF or present it one page at a time, and scan its QR codes to open a page.',
					'Import a time log by pasting text or adding a file.'
				]
			},
			{
				title: 'Photos and files',
				points: [
					'Attach photos, videos, PDFs and other files to a project, and see at a glance how many of each it holds.',
					'Arrange photos in groups, drag them from one group to another, select several at once and choose how many go on a page.',
					'Turn, flip, straighten and crop any photo, PDF page or video picture, describe it, and see its details down to when and where it was taken.'
				]
			},
			{
				title: 'Help as you go',
				points: [
					'Every field has a ? that explains it.',
					'A tap on a percent shows which fields are still empty.'
				]
			},
			{
				title: 'Find things fast',
				points: [
					'Search everything from the menu, and pin what you use most to it.',
					"The menu shows your recent items and who's online, for how long and on what device."
				]
			},
			{
				title: 'Stay in the loop',
				points: [
					'The bell tells you when someone changes your projects or adds you to one.',
					'The Activity Log shows who did what and when, sorted and filtered your way.',
					"What's New shows what each update brings."
				]
			},
			{
				title: 'Settings and your email signature',
				points: [
					'Settings holds your profile, your notifications and the organization.',
					'Your email signature is ready to copy into Outlook.'
				]
			}
		],
		fixes: []
	},
	'1.1.0': {
		features: [
			{
				title: "What's New opens by itself",
				points: ["What's New opens whenever an update arrives, so you always see what changed."]
			}
		],
		fixes: []
	},
	'1.2.0': {
		features: [
			{
				title: 'Your email signature on your Team page',
				points: [
					'Your email signature lives on your Team page, with Page, Edit and Preview like a project, and copies from its preview ready for Outlook.',
					"Pick its photo, banner and link in one Signature section, and add your team's group emails, like Operations or Engineering.",
					"Its photos and banners work like a project's: tap one to crop or turn it, or drag them into order."
				]
			},
			{
				title: 'Team pages that work like projects',
				points: [
					"A team member's Edit has Profile and Email Signature panels, laid out like a project's.",
					'How complete the profile is shows at the top.'
				]
			},
			{
				title: 'Activity for everyone',
				points: [
					'Everyone has an Activity Log in Settings, showing what happened in the projects they are on, with its sorts and filters always at the top.',
					'View Activity in any ⋮ menu shows everything that happened to a project, customer, team member, transport mode or facility, on the whole screen of a phone.',
					"Group gathers each person's back-to-back work into one panel, even across days; opening one closes the others and slides it to the top."
				]
			},
			{
				title: 'Tidier notifications',
				points: [
					'Group your notifications by person, and open the Activity Log straight from them.',
					"A day's new versions fold into one line, and a tap on a version opens What's New right at it.",
					'On a computer the notifications take half the screen, and their day headings stay at the top as you scroll.'
				]
			},
			{
				title: 'Photo pages that fit their photos',
				points: [
					'Photo pages run Horizontal, Vertical or Auto, and Auto turns each page so its photos are cut the least.'
				]
			},
			{
				title: 'A clearer photo editor',
				points: [
					'Rotate and Flip sit at the top, Original shows the whole picture, and arrows step from photo to photo.',
					"A PDF's pages stack: tap one to bring it to the front, or swipe through them one by one.",
					'The crop corners stand clear of the photo, what you pick shows in bright blue, and a cropped or turned photo carries a small mark.'
				]
			},
			{
				title: 'A ? on every box',
				points: ['Every box you type in has a ? that says what goes in it.']
			},
			{
				title: 'Smoother What’s New and edit panels',
				points: [
					'Each update in What’s New is told like this: its features under short titles, with their highlights.',
					'What’s New opens on the newest update, and opening another closes the rest and slides it to the top in one smooth move.',
					'Edit panels slide smoothly to the top when you open one.'
				]
			}
		],
		fixes: [
			{
				title: 'PDF pages on the report',
				points: [
					'A PDF page you crop or turn in the photo editor shows on the report, not a blank space.'
				]
			},
			{
				title: 'Photo editor buttons stay put',
				points: ['Crop, Text and Reset stay in one place, and Reset is always there.']
			}
		]
	}
};
