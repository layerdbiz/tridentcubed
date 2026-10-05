> Written by Justin (oneezy) on 2026-10-03; added to the repo verbatim on 2026-10-05.

# Trident V1 architecture research

Checked October 3, 2026. This is a proposed architecture decision for review in the repository. It supersedes the earlier recommendation that left authentication outside V1. No repository changes, account grants, subscriptions, or deployments were made.

My recommendation is SvelteKit 3, TypeScript, Valibot, Supabase Postgres, Drizzle, Supabase Auth, and private Supabase Storage. Use Supabase Broadcast and Presence for live interaction. For the full offline and simultaneous-editing requirement, PowerSync remains the first sync engine to evaluate on its free tier. Add Yjs only where several users must edit the same text together. Do not assume that either live queries or a database acquisition delivers a complete offline collaboration system.

**The smallest decision to lock before persistence.**

> Supabase Postgres is the authoritative business database; Supabase Auth supplies verified identities; active memberships and report assignments determine access. Drizzle owns application schema migrations. Reports, time entries, revisions, and asset metadata are SQL records. File bytes live in private object storage under immutable keys. Device edits persist locally until acknowledged by the server. Retried writes cannot create duplicates, independent additions survive, and conflicting edits are retained or merged according to field semantics. Live delivery does not count as a durable save.

This locks the data and authorization contract. It leaves the paid synchronization provider and eventual media provider open until a small proof and measured usage justify them.

**What the framework and database actually provide.**

SvelteKit 3 was released on October 1. Remote functions and async Svelte still require experimental flags. The official CLI is sv. Its Better Auth add-on scaffolds an auth setup with Drizzle, but selecting that add-on is optional. A scaffold is not a requirement to use its authentication choice in every SvelteKit app. Sources: [SvelteKit 3 release](https://svelte.dev/blog/sveltekit-3-is-here), [migration guide](https://svelte.dev/docs/kit/migrating-to-sveltekit-3), [CLI Better Auth add-on](https://svelte.dev/docs/cli/better-auth).

| Layer | Built in | Trident still needs |
| --- | --- | --- |
| SvelteKit remote functions | Typed reads/writes, input validation, live server values | Authorization, persistent local edits, a sync protocol |
| SvelteKit service workers | Worker bundling and registration | Offline shell caching and update policy |
| Postgres | Durable shared records, transactions, constraints | A database on each device and reconciliation |
| Supabase Realtime | WebSocket messages, presence, database-change notifications | Durable recovery of missed changes |
| IndexedDB | Local records and blobs across reloads | Uploads, server synchronization, conflict handling |

Supabase does not currently supply a complete native IndexedDB write queue and offline reconciliation engine for this SvelteKit workflow. Its own partner catalog describes PowerSync as an added offline layer. Postgres replication operates on the server side; it does not turn a browser into an offline database. Sources: [Supabase PowerSync integration](https://supabase.com/partners/integrations/powersync), [SvelteKit service workers](https://svelte.dev/docs/kit/service-workers), [PowerSync client architecture](https://docs.powersync.com/architecture/client-architecture).

**Authentication and permissions belong in V1.**

Supabase Auth is the fewest integration steps when Supabase also supplies private Storage, Realtime, and database policies. Better Auth is still a valid TypeScript/SvelteKit choice, particularly if application-owned sessions are a priority. Its session cookie does not automatically authorize Supabase APIs, though; that route needs server-mediated access or an explicit token integration. Supabase's documented first-class external JWT providers do not currently include Better Auth. Pick one identity authority. Source: [Supabase third-party authentication](https://supabase.com/docs/guides/auth/third-party/overview).

The following rules are proposed onboarding and routing behavior. They are not implemented grants.

| Verified identity or account category | Membership rule | Default portal | Access scope |
| --- | --- | --- | --- |
| Exact tridentcubed.com email domain | Create basic team membership once | /team | Create reports and work on assigned reports |
| admin@tridentcubed.com | Controlled exact-address bootstrap/invitation | /admin | Trident administration and authorized business data |
| JustinONeill2007@gmail.com | Same controlled bootstrap/invitation | /admin | Same Trident admin scope |
| Approved founders/core team with personal addresses | Explicit administrator invitation | /admin | Same Trident admin scope |
| Client | Invitation tied to client organization and report sharing | /client | Their shared/published reports and allowed requests |
| Marketer | Explicit role assignment | /marketing | Approved assets and marketing data |
| Uninvited external signup | Pending profile | /pending | No private client/team records |

Trusted verification must happen before domain or approved-address provisioning. Compare the parsed, normalized domain exactly. Do not authorize from an arbitrary email field the user submits. After onboarding, bind membership to the stable auth user ID. Suspension and revocation override auto-onboarding, so a former employee cannot regain access merely by signing in again. An email change or a recycled mailbox must not re-run an unrestricted admin grant.

Use organization-scoped roles and report assignments rather than a single global role string. Team membership does not need to mean every employee can see every client's reports. A user may hold more than one role and switch between authorized portals. Redirects and hidden buttons provide navigation; server checks and database policies provide protection.

Canonical access belongs in controlled database membership tables. End-user-editable user_metadata is unsuitable for roles. Trusted JWT claims can help coarse routing but remain stale until refresh, so sensitive actions and data policies should consult current membership. Sources: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [server-side identity verification](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

A direct Drizzle connection does not inherit the user's browser JWT. Owner, postgres, or bypass credentials can skip RLS. Use a single server access helper that verifies identity and runs user-scoped SQL under restricted credentials with transaction-local user context. Keep administrative access separate. Alternatively, use the user's token through Supabase's Data API and retain Drizzle for migrations. Do not mix these routes accidentally. Source: [Drizzle RLS](https://orm.drizzle.team/docs/rls).

The same organization/report access predicates must cover records, storage objects, live channels, offline write acceptance, and AI data. Private Realtime authorization is cached for the connection and reevaluated on a new token or reconnect; deleting a membership row does not immediately silence an existing channel. Account for token expiry and channel termination in revocation behavior. Source: [Realtime authorization](https://supabase.com/docs/guides/realtime/authorization).

**Offline editing is a local database plus synchronization.**

The device first saves the change locally. Online, the queue sends it to an authenticated server action. The server checks current access, commits or records a conflict, and acknowledges the result. Reconnection also retrieves authorized server changes; receiving a live notification is not the recovery mechanism.

For a custom outbox, the report change and pending operation must commit in one IndexedDB transaction. A client-generated stable record ID makes offline additions possible; a unique operation ID makes retries safe. Apply field patches and expected versions rather than replacing an entire report JSON document. Preserve conflicting values as revisions. An acknowledgement lost after a successful commit must not cause the retry to create a second time entry or attachment.

| Record/edit | Required behavior |
| --- | --- |
| Two workers add photos or time entries | Insert separate records; keep both |
| Two workers change different fields | Apply compatible field changes |
| Two workers change the same scalar field | Keep both versions and resolve explicitly |
| Two workers type in the same paragraph | Use a text collaboration algorithm such as Yjs |
| Delete meets an offline edit | Retain recoverable work and apply an explicit policy |
| Access is revoked before reconnect | Reject unauthorized upload without discarding the user's unsent draft silently |

These are Trident's product rules, not default database behavior. Scope downloaded data to selected reports and the signed-in user. Account switching must not send one user's pending work as another user. Distinguish saved on device, syncing, saved on server, conflict, and upload failed in the UI.

| Sync option | Benefit | Remaining responsibility | Recommendation |
| --- | --- | --- | --- |
| Dexie + custom outbox | Small IndexedDB API and no sync-service subscription | Retries, checkpoints, deletions, revisions, permissions, migrations, multi-tab behavior | Suitable for bounded drafts with explicit conflicts |
| PowerSync | Local SQLite, queued writes and scoped server replication | Backend write authorization, idempotency and conflict semantics | First evaluation for the full stated scope |
| RxDB | Replication framework and Supabase plugin without another hosted sync service | Local document schema, permission rules, custom conflicts, media | Credible alternative if its data model feels simpler |
| Yjs | Shared text/data structures and offline merge | Authenticated transport and durable server state; relational records still separate | Use for shared text, alongside one record-sync choice |

PowerSync uses browser SQLite with IndexedDB backing by default. Choosing it does not mean abandoning IndexedDB. Its SDK stores local changes and an ordered upload queue; the app connector uploads to the app's backend, while the service streams the user's allowed subset back. Sources: [Web SDK](https://docs.powersync.com/client-sdks/reference/javascript-web), [client architecture](https://docs.powersync.com/architecture/client-architecture).

PowerSync does not supply Trident's no-lost-edit policy automatically. Its simplest backend behavior is per-field last-write-wins, and its docs assign conflict handling and idempotency to the application. Yjs data can be synchronized, but this is a designed integration. Source: [PowerSync conflict handling](https://docs.powersync.com/handling-writes/handling-update-conflicts).

PowerSync Cloud has a free evaluation plan; Pro starts at $49/month. With Supabase Pro, the known starting platform subscriptions would be $74/month before overages and app hosting. Media bytes should remain outside the database sync stream. Source: [PowerSync pricing](https://powersync.com/pricing).

RxDB's Supabase plugin uses PostgREST for pull/push and Realtime notifications. Its free core includes a Dexie storage option. Premium IndexedDB/OPFS engines start at $99/month billed annually. Its default master-wins conflict behavior also needs customization to preserve local edits. It is an alternative worth checking, not an automatic free replacement with identical semantics. Sources: [Supabase replication](https://rxdb.info/replication-supabase.html), [replication conflicts](https://rxdb.info/replication.html), [pricing](https://rxdb.info/premium/).

My recommendation is to test PowerSync's free tier before buying or building a sync framework. Compare against a custom Dexie queue only if V1 accepts explicit revision conflicts. Do not combine PowerSync, RxDB, and another outbox for the same business records.

**Figma-style responsiveness needs transport and merge semantics.**

query.live delivers current server values through streaming fetch and reconnects dropped established streams. It does not queue writes or replay a durable history. Source: [SvelteKit remote functions](https://svelte.dev/docs/kit/remote-functions).

The precise framing is Server-Sent Events over fetch, not WebSocket, WebRTC, or the EventSource browser API. I verified the official iterator source: it sends Accept: text/event-stream and parses the response with read_sse. Source: [official client iterator](https://github.com/sveltejs/kit/blob/main/packages/kit/src/runtime/client/remote-functions/query-live/iterator.js), Git object d1322a35463d9463fdc1b7e6cfd7be7692317dc3.

| Interaction | Proposed mechanism |
| --- | --- |
| Own keystrokes | Immediate local UI and durable local edit |
| Who is online / viewing report | Supabase Presence |
| Remote cursors and typing indicators | Throttled Supabase Broadcast |
| Saved report changes | Record synchronization and authorized notifications |
| Shared paragraph editing | Yjs with local persistence and durable server recovery |
| Live counts/status | query.live where a server-derived stream is useful |

Supabase Broadcast uses WebSockets. Presence is for slow-changing state; its docs direct cursor and pointer traffic to Broadcast. Database Broadcast does not replay missed history. Sources: [Broadcast](https://supabase.com/docs/guides/realtime/broadcast), [Presence rate guidance](https://supabase.com/docs/guides/troubleshooting/realtime-client-presence-rate-limit-reached), [no history replay](https://supabase.com/docs/guides/troubleshooting/realtime-warn-sending-broadcast-message).

Yjs merges shared text changes and y-indexeddb persists local document state. It still needs an authenticated network provider and server persistence. Relaying updates through Supabase Broadcast alone does not save them. Persist updates/snapshots and recover on reconnect, or use a provider that supplies those guarantees. Sources: [Yjs](https://docs.yjs.dev/), [offline persistence](https://docs.yjs.dev/getting-started/allowing-offline-editing).

Render local work without waiting for the network. Send compact edits and coalesced cursor positions, not the entire report or media on each input. Transport choice alone does not determine perceived speed. There is no measured Figma-equivalent latency guarantee here. Test on field devices and realistic connections. Long-lived query streams also need a compatible hosting lifetime and buffering configuration.

**Photos, videos, and CAD are object-storage work.**

Keep binaries outside Postgres. SQL stores stable asset IDs, report ownership, object keys, sizes, MIME types, checksums, upload state, and derivative relationships. Upload browser-to-storage directly; remote functions authorize and finalize rather than proxying multi-GB bodies. Generate immutable unique keys and avoid upsert. Replacement media creates a new version.

Start with private Supabase Storage and resumable TUS uploads. Its free plan's 50MB per-file limit is restrictive for video; Pro supports higher configurable limits. TUS is recommended for large files or unreliable networks, but upload sessions expire after 24 hours, so retain local bytes and recovery state. Sources: [pricing and limits](https://supabase.com/pricing), [resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads).

| Object store | Standard storage | Internet delivery | V1 assessment |
| --- | --- | --- | --- |
| Supabase Pro | 100GB included; $0.0213/GB-month beyond | 250GB cached + 250GB uncached separately included; then $0.03/$0.09 per GB | Simplest permissions and resumable-upload integration |
| Cloudflare R2 | 10GB free; $0.015/GB-month beyond | No R2 egress charge; requests and optional Workers cost separately | Best migration candidate for sustained heavy delivery |
| AWS S3, us-east-1 | $0.023/GB-month at first tier | Direct transfer allowance/rates apply; CloudFront changes economics | Strong option, more configuration |

Illustrative monthly media charges for 100GB continuously stored and 500GB delivered, assuming the same existing $25 Supabase Pro backend and otherwise unused relevant allowances:

| Delivery path | Additional media storage/transfer | With $25 backend |
| --- | ---: | ---: |
| Supabase: 250GB cached + 250GB uncached | $0 | $25 |
| Supabase: all cached | $7.50 | $32.50 |
| Supabase: all uncached | $22.50 | $47.50 |
| R2 Standard | $1.35 | $26.35 |
| S3 direct delivery | $38.30 | $63.30 |
| S3 through CloudFront PAYG within its allowance | $2.30 | $27.30 |

These are estimates derived from published rates, not invoices. Requests, transformations, Workers, transcoding, hosting, and taxes are excluded. R2 request charges are zero only within its free operation allowances. AWS direct transfer assumes the account's shared 100GB allowance is unused; CloudFront assumes its ongoing 1TB/10M-request allowance is available. Other Supabase traffic consumes its uncached quota. Sources: [Supabase pricing](https://supabase.com/pricing), [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [S3 pricing](https://aws.amazon.com/s3/pricing/), [CloudFront PAYG](https://aws.amazon.com/cloudfront/pricing/pay-as-you-go/).

Exact AWS regional rates were checked against the [S3 machine-readable offer](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/current/us-east-1/index.json), published September 28, and [transfer offer](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSDataTransfer/current/index.json), published September 16.

The Supabase estimate depends on the actual cache mix. Newly generated signed URLs create separate cache entries. Smart CDN also documents that cached signed responses may outlive token expiry until cache TTL ends. Choose a private-file delivery/cache policy that matches the required revocation window. Source: [Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn).

Use IndexedDB blobs initially and consider OPFS for larger local files. Browser persistence requests may be denied, storage can fill, and users can clear it. Check space, handle failed writes, and retain unsent originals until server completion is acknowledged. Promise reliable recovery when the app reopens; background upload after the browser closes is not a universal browser guarantee. Source: [browser quota and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

Use thumbnails and optimized previews by default. Download originals or CAD assets on demand. Object storage can hold future 3D assets without a database change; interactive CAD requires a viewer and often a conversion pipeline. Prefer optimized GLB/glTF derivatives and a poster for browser display, with originals preserved separately. Video transcoding and model conversion have their own compute costs.

Suggested policy: review R2 when additional media charges are consistently above roughly $25–$50/month or sustained heavy video delivery is established. This is my budget heuristic, not a provider threshold. Keep provider/bucket/key in asset metadata and issue download capabilities on demand, so saved reports do not depend on permanent vendor URLs.

**AI and TypeScript fit this foundation.**

Supabase Postgres supports pgvector; Drizzle supports vector columns and indexes. Keep profiles, reports, time entries, conversations, and counts relational. Use embeddings for finding relevant report passages or documents, with chunks linked to their original report/client. Sources: [Supabase AI/vector support](https://supabase.com/docs/guides/ai), [Drizzle pgvector](https://orm.drizzle.team/docs/guides/vector-similarity-search).

Permission-aware RAG filters accessible chunks before supplying them to the model. RLS can apply to vector searches. A client retrieves their allowed material; a field worker retrieves assigned work; an admin gets the authorized Trident scope. The model does not decide who is an admin. Source: [RAG with permissions](https://supabase.com/docs/guides/ai/rag-with-permissions).

How many clients or reports are in progress is an authorized SQL query. Creating a report, adding a revision, or sending one uses the same validated business action as the UI. These actions should not get broad database privileges just because an AI assistant requested them. No separate vector database is needed for the initial design.

The proposed tools have TypeScript paths. Keep Drizzle's application schema/migrations authoritative, infer server record types, generate Supabase SDK types when needed, and share Valibot input schemas with remote functions. Runtime validation still matters because TypeScript does not validate requests or stored local data. Source: [Supabase generated TypeScript types](https://supabase.com/docs/guides/api/rest/generating-types).

Supabase supports self-hosting, although managed backups and other platform features are not reproduced automatically. Standard Postgres, portable SQL migrations, and object keys reduce migration work; auth, file policies, and live-channel integration still need porting. Hosted Supabase is the simpler V1 operations choice. Source: [self-hosting](https://supabase.com/docs/guides/self-hosting).

**What to prove next in the repo.**

Before spreading persistence across components, build one report flow with the chosen access helper and sync candidate. Two users add distinct photos/time entries, edit different fields, and contend on one text field. One device goes offline, saves, closes, reopens, and reconnects. Lose the response after a successful commit and retry. Change access before replay. Confirm both additions survive, same-field work remains recoverable, retries produce no duplicates, uploads resume from available source bytes, and no user receives another client's data. Use Yjs in that proof if automatic shared-paragraph merging is a V1 promise.

That proof determines whether a bounded Dexie queue stays simple enough or PowerSync removes enough engineering work to justify its cost. The database and permissions decision can be made now; paying for the sync service should follow evidence.
