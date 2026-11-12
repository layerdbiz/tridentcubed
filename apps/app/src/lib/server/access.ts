// Who a signed-in User is (#182; ADR 0003 and its 2026-11-12 amendment).
//
// `grantAccess` is the sign-in rule. Better Auth runs it each time a session is made (every sign-in, by any way):
// from the verified email, an access grant gives its role and the Super admin flag; otherwise the organization's
// email domain gives the Team role; otherwise the User is a Guest with no membership. It only ever adds what is
// missing, so signing in again changes nothing: no second membership, no changed role. It runs as the database
// owner, because access grants are private to it.
//
// It also ties each staff User to their Team record (#185): the record with their email, or the one their grant
// names, whatever its capitals; else a new record made from their name, email and picture, under a name nobody on
// the page has. At the first sign-in the role the record showed becomes the membership's role, unless a grant gives
// one; from then on the record's role is the membership's. A User already tied keeps their record as it is.
//
// `findActor` is who the User is on a request: their organization, role and Super admin flag, read through the
// claims helper as the User themselves. `hooks.server.ts` puts it on `event.locals.actor`.
import { and, asc, eq, isNull, lt, or, sql } from 'drizzle-orm';
import type { ActorType, ClaimsType, TransactionType } from './db/claims';
import type { DatabaseType } from './db/index';
import type { RoleType } from './db/organization.schema';
import { accessGrant, member, organizationDetails, team, user as users } from './db/schema';

type GrantType = typeof accessGrant.$inferSelect;

type SignInUserType = { id: string; email: string; name: string; image: string | null };

/** A name from an email's first part when the User gave none: "rosa.vega@…" is "Rosa Vega". */
export function toNameOfEmail(email: string) {
	return email
		.slice(0, email.indexOf('@'))
		.split(/[._+-]+/)
		.filter(Boolean)
		.map((part) => part[0].toUpperCase() + part.slice(1))
		.join(' ');
}

// The name itself, or with 2, 3… after it, whichever no record outside the Trash has, whatever its capitals.
async function toFreeName(tx: TransactionType, organizationId: string, name: string) {
	const taken = new Set(
		(
			await tx
				.select({ name: team.name })
				.from(team)
				.where(and(eq(team.organizationId, organizationId), isNull(team.deletedAt)))
		).map((each) => each.name.trim().toLowerCase())
	);
	let free = name;
	for (let count = 2; taken.has(free.toLowerCase()); count += 1) free = `${name} ${count}`;
	return free;
}

const RANKS: Record<RoleType, number> = { admin: 1, manager: 2, team: 3 };

// The tie of one User to their Team record in one organization (see the top of this file).
async function tieTeam(
	tx: TransactionType,
	found: SignInUserType,
	organizationId: string,
	grant: GrantType | undefined,
	isFirst: boolean
) {
	const [tied] = await tx
		.select({ id: team.id })
		.from(team)
		.where(and(eq(team.organizationId, organizationId), eq(team.userId, found.id)));
	if (tied) return;
	const [membership] = await tx
		.select({ role: member.role })
		.from(member)
		.where(and(eq(member.organizationId, organizationId), eq(member.userId, found.id)));
	if (!membership) return;

	const email = (grant?.teamEmail ?? found.email).trim().toLowerCase();
	const [record] = await tx
		.select({ id: team.id, role: team.role })
		.from(team)
		.where(
			and(
				eq(team.organizationId, organizationId),
				sql`lower(${team.email}) = ${email}`,
				isNull(team.userId),
				isNull(team.deletedAt)
			)
		)
		.orderBy(asc(team.createdAt))
		.limit(1);

	if (record) {
		const role = isFirst ? (grant?.role ?? record.role) : membership.role;
		await tx
			.update(member)
			.set({ role })
			.where(and(eq(member.organizationId, organizationId), eq(member.userId, found.id)));
		await tx.update(team).set({ userId: found.id, role }).where(eq(team.id, record.id));
		return;
	}
	const name = await toFreeName(
		tx,
		organizationId,
		found.name.trim() || toNameOfEmail(found.email)
	);
	await tx.insert(team).values({
		id: crypto.randomUUID(),
		organizationId,
		name,
		email: found.email,
		photo: found.image ?? '',
		role: membership.role,
		rank: RANKS[membership.role],
		userId: found.id
	});
}

/** Gives a User the memberships their verified email earns, and says which organization their session acts in. */
export async function grantAccess(db: DatabaseType, userId: string): Promise<string | null> {
	return db.transaction(async (tx) => {
		const [found] = await tx
			.select({
				id: users.id,
				email: users.email,
				name: users.name,
				image: users.image,
				isVerified: users.emailVerified
			})
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
				const added = await tx
					.insert(member)
					.values({ organizationId, userId, role })
					.onConflictDoNothing()
					.returning({ id: member.id });
				const grant = grants.find((each) => each.organizationId === organizationId);
				await tieTeam(tx, found, organizationId, grant, added.length > 0);
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

// When each User's last seen was stamped by this server, so a busy minute asks the database once.
const STAMPED = new Map<string, number>();

/**
 * Stamps the acting User's Team record as seen now (#185): their online dot. The server does it on every request of
 * a member, at most once a minute (here, and again in the database, for the servers that do not share this memory).
 */
export async function stampSeen(claims: ClaimsType, actor: ActorType, now = Date.now()) {
	if (!actor.organizationId) return;
	const key = `${actor.userId} ${actor.organizationId}`;
	if (now - (STAMPED.get(key) ?? 0) < 60_000) return;
	STAMPED.set(key, now);
	await claims.run(actor, (tx) =>
		tx
			.update(team)
			.set({ lastSeen: sql`now()` })
			.where(
				and(
					eq(team.userId, actor.userId),
					or(isNull(team.lastSeen), lt(team.lastSeen, sql`now() - interval '1 minute'`))
				)
			)
	);
}
