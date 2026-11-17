// Email goes through one sender with two adapters (spec #179 "Files", #181): Resend from noreply@tridentcubed.com,
// and the server log, used outside production when no Resend key is set so the app can be signed into in a
// container. Nothing else in the app knows which one is in use.
import { Resend } from 'resend';

export type EmailType = { to: string; subject: string; text: string };

export type EmailSenderType = { send(email: EmailType): Promise<void> };

export const EMAIL_FROM = 'Trident Cubed <noreply@tridentcubed.com>';

export function createResendSender(apiKey: string): EmailSenderType {
	const resend = new Resend(apiKey);
	return {
		async send({ to, subject, text }) {
			const { error } = await resend.emails.send({ from: EMAIL_FROM, to, subject, text });
			if (error) throw new Error(`Resend refused the email: ${error.message}`);
		}
	};
}

// Each email is one log line: who it is to, then its subject and text.
export function createLogSender(write: (line: string) => void = console.info): EmailSenderType {
	return {
		async send({ to, subject, text }) {
			write(`[email] to ${to}: ${subject}. ${text.replaceAll('\n', ' ')}`);
		}
	};
}

// The sign-in code email. Its subject names the code, so it shows in a phone's notification.
export function toCodeEmail(to: string, code: string, minutes: number): EmailType {
	return {
		to,
		subject: `Your Trident Cubed sign-in code is ${code}`,
		text: `Your sign-in code is ${code}.\nIt works once, for ${minutes} minutes.\nIf you did not ask for it, you can ignore this email.`
	};
}
