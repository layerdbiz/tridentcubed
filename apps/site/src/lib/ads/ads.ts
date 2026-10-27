// Google Ads conversions Michael set up on account AW-17990211960 (#168).
// Only the production site counts, so dev and preview builds send nothing.

export const ADS_ID = 'AW-17990211960';
export const ADS_HOSTS = ['www.tridentcubed.com', 'tridentcubed.com'];

// "Website Phone Call": a tap on a phone link, not a completed call
export const PHONE_CONVERSION = `${ADS_ID}/XFcqCMCsvaodEPiys4JD`;
// "Website Lead Form": a contact form message that reached Zapier
export const LEAD_CONVERSION = `${ADS_ID}/xb15CLSjwaodEPiys4JD`;

type Gtag = (command: string, target: string | Date, params?: Record<string, unknown>) => void;

export function isAdsHost(hostname: string) {
	return ADS_HOSTS.includes(hostname);
}

function toGtag() {
	if (typeof window === 'undefined' || !isAdsHost(window.location.hostname)) return null;
	const gtag = (window as Window & { gtag?: Gtag }).gtag;
	return typeof gtag === 'function' ? gtag : null;
}

/** Adds the Ads account to the site's existing Google tag. */
export function configureAds() {
	const gtag = toGtag();
	if (!gtag) return false;
	gtag('config', ADS_ID);
	return true;
}

function sendConversion(sendTo: string) {
	const gtag = toGtag();
	if (!gtag) return false;
	gtag('event', 'conversion', {
		send_to: sendTo,
		value: 1.0,
		currency: 'USD',
		transport_type: 'beacon'
	});
	return true;
}

export function reportLeadConversion() {
	return sendConversion(LEAD_CONVERSION);
}

/**
 * Document click handler: counts one phone conversion per tap on any
 * `tel:` link and leaves the dialling itself to the browser.
 */
export function reportPhoneTap(event: Pick<MouseEvent, 'target'>) {
	const target = event.target as Element | null;
	if (!target?.closest?.('a[href^="tel:"]')) return false;
	return sendConversion(PHONE_CONVERSION);
}
