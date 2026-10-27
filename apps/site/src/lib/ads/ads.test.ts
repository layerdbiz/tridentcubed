import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import {
	ADS_ID,
	LEAD_CONVERSION,
	PHONE_CONVERSION,
	configureAds,
	isAdsHost,
	reportLeadConversion,
	reportPhoneTap
} from './ads';

function stubWindow(hostname: string, gtag?: ReturnType<typeof vi.fn>) {
	vi.stubGlobal('window', { location: { hostname }, gtag });
}

function toTarget(href: string | null) {
	return {
		closest: (selector: string) =>
			href?.startsWith('tel:') && selector.includes('tel:') ? {} : null
	};
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('isAdsHost', () => {
	it('accepts only the production hosts', () => {
		expect(isAdsHost('www.tridentcubed.com')).toBe(true);
		expect(isAdsHost('tridentcubed.com')).toBe(true);
		expect(isAdsHost('dev.tridentcubed.com')).toBe(false);
		expect(isAdsHost('localhost')).toBe(false);
	});
});

describe('configureAds', () => {
	it('configures the Ads account on production', () => {
		const gtag = vi.fn();
		stubWindow('www.tridentcubed.com', gtag);
		expect(configureAds()).toBe(true);
		expect(gtag).toHaveBeenCalledWith('config', ADS_ID);
	});

	it('does nothing on dev', () => {
		const gtag = vi.fn();
		stubWindow('dev.tridentcubed.com', gtag);
		expect(configureAds()).toBe(false);
		expect(gtag).not.toHaveBeenCalled();
	});

	it('does nothing when the Google tag is blocked', () => {
		stubWindow('www.tridentcubed.com');
		expect(configureAds()).toBe(false);
	});
});

describe('reportLeadConversion', () => {
	it('sends the lead conversion once with no personal data', () => {
		const gtag = vi.fn();
		stubWindow('www.tridentcubed.com', gtag);
		expect(reportLeadConversion()).toBe(true);
		expect(gtag).toHaveBeenCalledTimes(1);
		expect(gtag).toHaveBeenCalledWith('event', 'conversion', {
			send_to: LEAD_CONVERSION,
			value: 1.0,
			currency: 'USD',
			transport_type: 'beacon'
		});
	});

	it('sends nothing off production', () => {
		const gtag = vi.fn();
		stubWindow('localhost', gtag);
		expect(reportLeadConversion()).toBe(false);
		expect(gtag).not.toHaveBeenCalled();
	});
});

describe('reportPhoneTap', () => {
	it('sends one phone conversion per tap on a tel link', () => {
		const gtag = vi.fn();
		stubWindow('www.tridentcubed.com', gtag);
		expect(reportPhoneTap({ target: toTarget('tel:+14095432725') as unknown as Element })).toBe(
			true
		);
		expect(gtag).toHaveBeenCalledTimes(1);
		expect(gtag.mock.calls[0][2]).toMatchObject({
			send_to: PHONE_CONVERSION,
			value: 1.0,
			currency: 'USD'
		});
	});

	it('ignores other links', () => {
		const gtag = vi.fn();
		stubWindow('www.tridentcubed.com', gtag);
		expect(
			reportPhoneTap({ target: toTarget('https://wa.me/15705751179') as unknown as Element })
		).toBe(false);
		expect(reportPhoneTap({ target: null })).toBe(false);
		expect(gtag).not.toHaveBeenCalled();
	});
});
