export interface ExportSession<DataType = unknown> {
	token: string;
	data: DataType;
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

export function createExportSession<DataType>(
	input: { data: DataType; filename: string },
) {
	cleanupExpiredSessions();

	const token = crypto.randomUUID();
	const session: ExportSession<DataType> = {
		token,
		data: input.data,
		filename: input.filename,
		createdAt: Date.now(),
	};

	sessions.set(token, session);
	return session;
}

export function getExportSession<DataType = unknown>(token: string) {
	cleanupExpiredSessions();
	return (sessions.get(token) as ExportSession<DataType> | undefined) ?? null;
}

export function deleteExportSession(token: string) {
	sessions.delete(token);
}
