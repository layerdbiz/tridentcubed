import { redirect } from "@sveltejs/kit";
import { fetchAllEmails } from "#lib/email/email.remote.js";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	const emailData = await fetchAllEmails();

	// Redirect to the first person's page
	if (emailData.persons.length > 0) {
		const firstPerson = emailData.persons[0];
		redirect(302, `/company/emails/${firstPerson.slug}`);
	}

	// Fallback: redirect to first group if no persons exist
	if (emailData.groups.length > 0) {
		const firstGroup = emailData.groups[0];
		redirect(302, `/company/emails/${firstGroup.slug}`);
	}

	// If somehow no data exists, stay on page
	return {};
};
