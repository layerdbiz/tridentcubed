interface ExportSession {
	token: string;
	markup: string;
	filename: string;
	createdAt: number;
}

const sessionTtlMs = 5 * 60 * 1000;
const sessions = new Map<string, ExportSession>();

function cleanupExpiredSessions(now = Date.now()) {
	for (const [token, session] of sessions) {
		if (now - session.createdAt > sessionTtlMs) {
			sessions.delete(token);
		}
	}
}

export function createExportSession(
	input: { markup: string; filename: string },
) {
	cleanupExpiredSessions();

	const token = crypto.randomUUID();
	const session: ExportSession = {
		token,
		markup: input.markup,
		filename: input.filename,
		createdAt: Date.now(),
	};

	sessions.set(token, session);
	return session;
}

export function getExportSession(token: string) {
	cleanupExpiredSessions();
	return sessions.get(token) ?? null;
}

export function deleteExportSession(token: string) {
	sessions.delete(token);
}
