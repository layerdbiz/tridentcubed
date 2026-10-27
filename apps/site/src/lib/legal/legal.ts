// The site's two legal pages (#52, #53). Each renders as its own route
// (/terms, /privacy) and in the footer's dialog from the same text.

export type LegalKind = 'terms' | 'privacy';

export interface LegalSection {
	heading: string;
	paragraphs: string[];
}

export interface LegalDocumentType {
	title: string;
	updated: string;
	sections: LegalSection[];
}

export const LEGAL_KINDS: LegalKind[] = ['terms', 'privacy'];

export function isLegalKind(value: unknown): value is LegalKind {
	return LEGAL_KINDS.includes(value as LegalKind);
}

export function toLegalHref(kind: LegalKind) {
	return `/${kind}`;
}

const ADDRESS = '800 Town and Country Blvd., Suite 500, Houston, TX 77024';

// Word for word from "TCS terms conditions r.1.pdf" (modified 2026-03-31).
const TERMS: LegalDocumentType = {
	title: 'Terms & Conditions',
	updated: 'March 31, 2026',
	sections: [
		{
			heading: 'Acceptance of Terms',
			paragraphs: [
				'Booking of services following receipt of this Terms & Conditions document constitutes acceptance of the rates, terms, and conditions herein, including any amendments. Any additional or superseding negotiations related to rates or services must be confirmed in writing via email to be considered valid. These Terms & Conditions apply globally to all work and services performed by Trident Cubed Solutions, LLC (“TCS”).'
			]
		},
		{
			heading: 'Rates and Working Conditions',
			paragraphs: [
				'Rates are based on current operating costs, applicable governmental regulations, exchange rates, and personnel availability. Operating costs related to the requested services are subject to change and will be billed at cost unless otherwise agreed to in writing. All rates are exclusive of governmental taxes, duties, and similar charges. A working day is defined as any day during which a TCS representative is dedicated to the Client’s assignment. All working days are billed at a full day rate unless otherwise agreed in writing. This includes, but is not limited to, travel days, vessel delays, weather restrictions, operational delays, quarantine periods, immigration requirements, force majeure events, and other similar circumstances.'
			]
		},
		{
			heading: 'Cancellations and Expenses',
			paragraphs: [
				'Cancellation of work may result in charges depending on the circumstances at the time of cancellation. TCS is not responsible for change or cancellation fees associated with travel arrangements, material or equipment procurement, or facility access requirements. TCS will make reasonable efforts to minimize costs for the Client by evaluating available options based on project requirements. Travel arrangements are determined by TCS representatives, who may rely on local contacts or U.S. Embassy recommendations for guidance.'
			]
		},
		{
			heading: 'Invoicing and Payment Terms',
			paragraphs: [
				'Invoices will be issued in accordance with the agreed scope of work. At the Client’s discretion, one or more invoices may be issued prior to completion of the operation. TCS reserves the right to submit or amend invoices within ninety (90) days of completion of services. Payment terms are NET 30 unless otherwise agreed in writing. Any unpaid balance will incur a late fee of ten percent (10%) of the outstanding amount upon expiration of the NET 30 term. Late fees will compound every thirty (30) days thereafter until paid in full. Invoices will not be considered settled until full payment, including any applicable late fees, has been received.'
			]
		},
		{
			heading: 'Legal Fees and Enforcement',
			paragraphs: [
				'In the event of any dispute, claim, or legal action arising out of or related to the services provided by Trident Cubed Solutions, LLC (“TCS”), including the enforcement of these Terms & Conditions or collection of unpaid invoices, the Client agrees to be fully responsible for all costs incurred by TCS. This includes, without limitation, reasonable attorneys’ fees, court costs, arbitration costs, expert fees, and any other legal or professional expenses incurred by TCS.'
			]
		},
		{
			heading: 'Currency, Liens, and Claims',
			paragraphs: [
				'Foreign currency conversions will be calculated using prevailing exchange rates at the time of invoicing. The Client is responsible for all applicable exchange fees and related charges. Local currency charges may be subject to fluctuation. All services are rendered in accordance with these TCS Terms & Conditions. TCS reserves the right to place a lien on cargo as permitted by law. Any claims against TCS are time-barred unless brought within six (6) months of completion of services. Clients are strongly advised to review these Terms & Conditions in full prior to TCS commencing any work, including but not limited to travel arrangements.'
			]
		},
		{
			heading: 'Contact',
			paragraphs: [`Trident Cubed Solutions, LLC, ${ADDRESS}.`]
		}
	]
};

// Draft for Trident's approval: describes only what this site actually does.
const PRIVACY: LegalDocumentType = {
	title: 'Privacy Policy',
	updated: 'October 27, 2026',
	sections: [
		{
			heading: 'Who we are',
			paragraphs: [
				`This policy covers tridentcubed.com, the website of Trident Cubed Solutions, LLC (“Trident Cubed”, “we”, “us”), ${ADDRESS}.`
			]
		},
		{
			heading: 'What you send us',
			paragraphs: [
				'When you use the contact form, you give us your name, phone number, email address and message. We use them to answer your inquiry and to talk with you about our services.',
				'The form is delivered to our team through Zapier, a service that forwards messages for us. If you call or message us, we receive whatever you choose to share in that call or message.'
			]
		},
		{
			heading: 'What the website measures',
			paragraphs: [
				'We use Google Analytics to understand how visitors use the site, such as which pages and buttons are used. Google Analytics uses cookies and similar technologies and receives information such as your device, browser, approximate location and the pages you visit.',
				'We use Google Ads to measure our advertising. When you tap one of our phone numbers or successfully send the contact form, the site tells Google Ads that it happened. The contents of the form are never sent to Google.',
				'You can limit this measurement with your browser’s cookie settings, Google’s ad settings (adssettings.google.com) or the Google Analytics opt-out add-on (tools.google.com/dlpage/gaoptout).'
			]
		},
		{
			heading: 'Who else receives information',
			paragraphs: [
				'The website is hosted by Vercel, whose servers process standard request information such as IP addresses to deliver the site. Zapier and Google process information on our behalf as described above.'
			]
		},
		{
			heading: 'Links to other sites',
			paragraphs: [
				'Our Facebook, LinkedIn and WhatsApp links lead to services with their own privacy policies.'
			]
		},
		{
			heading: 'Questions and requests',
			paragraphs: [
				`For questions about this policy or the information you have sent us, contact us through the form on this site, call +1 (409) 543-2725, or write to us at ${ADDRESS}.`
			]
		},
		{
			heading: 'Changes',
			paragraphs: ['If we change this policy, we will update this page and the date above.']
		}
	]
};

export const LEGAL_DOCUMENTS: Record<LegalKind, LegalDocumentType> = {
	terms: TERMS,
	privacy: PRIVACY
};
