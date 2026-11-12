// The claims helper (ADR 0002, #182): the only way app code reaches the database. `run(actor, work)` opens a
// transaction, sets the acting User's claims and switches to the restricted role in one statement, then hands
// `work` the transaction. Row Level Security applies to everything `work` does, and the claims end with the
// transaction, so a pooled connection never carries them to the next request. The one permission check
// (`#lib/server/permission.ts`) runs before; Row Level Security is the net behind it.
import { sql } from 'drizzle-orm';
import type { DatabaseType } from './index';
import type { RoleType } from './organization.schema';
import { APP_ROLE } from './policy';

/** Who is acting. A Guest has no organization and no role. */
export type ActorType = {
	userId: string;
	email: string;
	organizationId: string | null;
	role: RoleType | null;
	isSuperAdmin: boolean;
};

/** What the policies see of the actor (`app.user_id()`, `app.organization_id()`). */
export type ClaimsActorType = Pick<ActorType, 'userId' | 'organizationId'> &
	Partial<Pick<ActorType, 'role'>>;

export type TransactionType = Parameters<Parameters<DatabaseType['transaction']>[0]>[0];

export type ClaimsType = {
	/** Runs `work` in one transaction as `actor`; all of it or none of it is applied. */
	run<T>(actor: ClaimsActorType, work: (tx: TransactionType) => Promise<T>): Promise<T>;
};

export function toClaims(actor: ClaimsActorType) {
	return JSON.stringify({
		sub: actor.userId,
		org: actor.organizationId ?? '',
		role: actor.role ?? ''
	});
}

export function createClaims(db: DatabaseType): ClaimsType {
	return {
		run(actor, work) {
			return db.transaction(async (tx) => {
				await tx.execute(
					sql`select set_config('request.jwt.claims', ${toClaims(actor)}, true), set_config('role', ${APP_ROLE}, true)`
				);
				return work(tx);
			});
		}
	};
}
