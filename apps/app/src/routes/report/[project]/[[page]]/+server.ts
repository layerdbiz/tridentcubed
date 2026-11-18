// A report's link (#216): what the QR code on a report page holds, `/report/<project>/<page>`. It sends the
// browser on to that project's Preview in the app, at that page. The sign-in guard has run before this: a
// signed-out visitor is on the login page (and lands here again after signing in), a Guest on Waiting for access.
// Whether the project is this member's organization's is the app's own check, as for any project address.
import { redirect } from '@sveltejs/kit';
import { toReportAddress } from '#lib/report/report.utils.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params }) => {
	redirect(303, toReportAddress(params.project, params.page));
};
