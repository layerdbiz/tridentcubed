// Who a signed-in User is (#182; ADR 0003 and its 2026-11-12 amendment).
//
// `grantAccess` is the sign-in rule. Better Auth runs it each time a session is made (every sign-in, by any way):
// from the verified email, an access grant gives its role and the Super admin flag; otherwise the organization's
// email domain gives the Team role; otherwise the User is a Guest with no membership. It only ever adds what is
// missing, so signing in again changes nothing: no second membership, no changed role. It runs as the database
// owner, because access grants are private to it. #185 extends it to tie the User to their Team record.
//
// `findActor` is who the User is on a request: their organization, role and Super admin flag, read through the
// claims helper as the User themselves. `hooks.server.ts` puts it on `event.locals.actor`.
import { asc, eq } from 'drizzle-orm';
import type { ActorType, ClaimsType } from './db/claims';
import type { DatabaseType } from './db/index';
import { accessGrant, member, organizationDetails, user as users } from './db/schema';

/** Gives a User the memberships their verified email earns, and says which organization their session acts in. */
export async function grantAccess(db: DatabaseType, userId: string): Promise<string | null> {
	return db.transaction(async (tx) => {
		const [found] = await tx
			.select({ email: users.email, isVerified: users.emailVerified })
			.from(users)
			.where(eq(users.id, userId));
		if (!found) return null;

		if (found.isVerified) {
			const email = found.email.trim().toLowerCase();
			const domain = email.slice(email.lastIndexOf('@') + 1);
			const grants = await tx.select().from(accessGrant).where(eq(accessGrant.email, email));
			const domains = await tx
				.select({ organizationId: organizationDetails.organizationId })
				.from(organizationDetails)
				.where(eq(organizationDetails.emailDomain, domain));

			const earned = new Map<string, ActorType['role'] & string>();
			for (const each of domains) earned.set(each.organizationId, 'team');
			for (const grant of grants) earned.set(grant.organizationId, grant.role);
			for (const [organizationId, role] of earned) {
				await tx.insert(member).values({ organizationId, userId, role }).onConflictDoNothing();
			}
			if (grants.some((grant) => grant.isSuperAdmin)) {
				await tx.update(users).set({ isSuperAdmin: true }).where(eq(users.id, userId));
			}
		}

		const [first] = await tx
			.select({ organizationId: member.organizationId })
			.from(member)
			.where(eq(member.userId, userId))
			.orderBy(asc(member.createdAt))
			.limit(1);
		return first?.organizationId ?? null;
	});
}

/** Who the signed-in User is on this request. With no membership they are a Guest: no organization, no role. */
export async function findActor(
	claims: ClaimsType,
	user: { id: string; email: string },
	activeOrganizationId?: string | null
): Promise<ActorType> {
	return claims.run({ userId: user.id, organizationId: null }, async (tx) => {
		const [self] = await tx
			.select({ isSuperAdmin: users.isSuperAdmin })
			.from(users)
			.where(eq(users.id, user.id));
		const memberships = await tx
			.select({ organizationId: member.organizationId, role: member.role })
			.from(member)
			.where(eq(member.userId, user.id))
			.orderBy(asc(member.createdAt));
		const active =
			memberships.find((each) => each.organizationId === activeOrganizationId) ?? memberships[0];
		return {
			userId: user.id,
			email: user.email,
			organizationId: active?.organizationId ?? null,
			role: active?.role ?? null,
			isSuperAdmin: self?.isSuperAdmin ?? false
		};
	});
}
