// Trident Cubed's real details and report wording (#184): the seed's organization details and disclaimer points, and
// what the app shows until the server's rows load. Kept here, beside the other starting files, so the seed (server)
// and the screens read one copy.
// Trident Cubed itself: the organization every report is written for (the Organization drop-down, the letterhead).
// Run 15: kept once and edited by an admin in Settings (settings-page.svelte), as the glossary's Organization says:
// its details print in every page's header, and its disclaimer and sign-off wording on the report's last page.
export type OrganizationType = {
	/** The organization's id and its details row's, once the server's rows are in (#184). */
	id?: string;
	detailsId?: string;
	name: string;
	logo: string;
	address: string;
	phone: string;
	email: string;
	// The shared inbox printed last in the owner's sign-off.
	groupEmail: string;
	website: string;
	disclaimer: {
		opening: string;
		points: { id: string; title: string; text: string }[];
		note: string;
	};
	// The line before the sign-off, and the sign-off itself.
	closing: string;
	signoff: string;
};

export const ORGANIZATION: OrganizationType = {
	name: 'Trident Cubed',
	logo: '/logo-color.svg',
	address: '800 Town and Country, Ste 500, Houston, TX 77024',
	phone: '+1 409 543 2725',
	email: 'operations@tridentcubed.com',
	groupEmail: 'ProjectGroup@TridentCubed.com',
	website: 'tridentcubed.com',
	disclaimer: {
		opening:
			'This Cargo Survey Report is prepared based on the observations, conditions, and information available to the undersigned at the time of the inspection. The findings and conclusions herein are made to the best of our knowledge and belief, but are subject to the following limitations:',
		points: [
			[
				'Scope Limitation',
				'The survey was conducted without dismantling or intrusive testing unless explicitly stated otherwise. Our observations are limited to visible and accessible parts of the cargo.'
			],
			[
				'No Warranty',
				"This report does not constitute a warranty or guarantee of the cargo's condition, quality, or fitness for any particular purpose. It is not a guarantee against latent defects or conditions not apparent at the time of inspection."
			],
			[
				'Use Limitation',
				'This report is provided solely for the use of the party to whom it is addressed. No liability is assumed by the Company or the undersigned for any use or reliance by third parties.'
			],
			[
				'Liability Limitation',
				'The liability of the Company and the undersigned, if any, arising from this report shall be limited to the fee charged for this service. We shall not be liable for any indirect, consequential, or special damages, including but not limited to loss of profit or business interruption.'
			],
			[
				'Accuracy of Information',
				'The accuracy of this report depends on the information provided by the customer and others involved. We do not guarantee the accuracy of such third-party information.'
			],
			[
				'Right to Amend',
				'We reserve the right to amend or supplement this report should additional pertinent information become available.'
			],
			[
				'Legal Context',
				'This report is not intended to be used for legal proceedings without the express written consent of the Company.'
			],
			[
				'No Endorsement',
				'This survey does not endorse or approve the cargo for any specific use or handling beyond what is stated in the report.'
			]
		].map(([title, text], index) => ({ id: `point-${index + 1}`, title, text })),
		note: 'Please note that this report reflects the situation as observed on a date of Inspection and may not reflect subsequent changes or conditions.'
	},
	closing:
		'Thank you for trusting Trident Cubed with your cargo. Call or email me with any question about this report.',
	signoff: 'Best Regards,'
};
