// Which phone the Install App how-to opens on (Justin, 2026-11-17): the one thing in the app read from what the
// browser says it is. It only picks the tab the how-to starts on, so the User sees their own steps with no extra
// tap; both tabs stay one tap away, and nothing else follows it.

export type PhoneType = 'iphone' | 'android';

/** The phone a browser's user agent names, when it names one. An iPad counts as an iPhone: its steps are the same. */
export function toPhone(userAgent: string): PhoneType | undefined {
	if (/android/i.test(userAgent)) return 'android';
	if (/iphone|ipad|ipod/i.test(userAgent)) return 'iphone';
	return undefined;
}
