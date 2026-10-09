---
status: accepted
---

# Live editing and presence ride PowerSync

Report Generator V1 shows other people's work through the one connection it already has, PowerSync (ADR 0006): saved Values reach every open screen without a reload, a second or two after the person pauses typing, and the faces of who has a project open travel the same way. V1 does not use Supabase Realtime. Justin wants the Google Docs feeling of two people on one report, and dreams of a Figma-style live view (named cursors, selections, following someone around the page), but wants things working first and no special UI cases or untested performance in V1. Decided on 2026-10-09 ([#123](https://github.com/layerdbiz/tridentcubed/issues/123)), on top of the [sync engine research](../research/2026-10-05-sync-engines-for-offline-and-live.md) (#121).

## Considered options

- Letter by letter through Supabase Realtime: a message goes from phone to Supabase to the other phones in tens of milliseconds and is never stored, the right tool for moving cursors. It is a second connection, and under ADR 0002 it needs the browser to hold a token Supabase accepts, which "Prove a Better Auth session can join a Supabase Realtime private channel" (#117) was to prove. For faces, a second's delay is invisible, so V1 takes the one connection and #117 waits for the cursor feature.
- Merging two people's typing in one box (Yjs, run through PowerSync as in PowerSync's own example): both people's words survive, online and offline, but long text stops being one Value and the server must turn merged edits back into text for the PDF and History. Last change wins (ADR 0005) stays the V1 rule; merging long text boxes is the first upgrade if testing on #128 or real use shows lost words.
- An outline on the box, photo or panel someone is in (2 px, their name and face on a tag at its top left, never moving the layout): Justin likes it, and it is the first visual add-on after V1, not V1.

## Consequences

- Live editing is ADR 0006's sync and nothing more: a phone batches its changes for about a second, the `command` saves them, and PowerSync streams them from Postgres to every device. About 1 to 2 seconds end to end; #128 measures it on real phones.
- Presence: each open project writes a small "I'm here, in this panel" note through PowerSync every 30 seconds or so, and on changing panel. It is never written while offline, never queued, never part of a report or of History, and a note older than about a minute means the person has left. Every device already receives the notes, so the faces show at the top of the workspace and on the project cards in the project list. Tapping a face shows the panel the person is in ("Alex, Time Log").
- No marker on the box someone else is typing in. When two people change one Value, the last change to reach the server wins and History keeps the other (ADR 0005, ADR 0006), with no popup.
- A Deactivated User's access pass is not renewed: PowerSync uses a short-lived pass the app renews in the background (15 minutes by default), so their device stops receiving changes within that time, and their changes are already refused (ADR 0003). No extra code wipes their device; what it holds stays until they sign out or use "Remove my data from this device" (ADR 0006).
- A 30-day sign-in running out stays as ADR 0002 decided: keep working, unsent work waits on the device until they sign in again.
- #117 is not needed for V1 and closes as later work. ADR 0002's fallback ("if the Realtime token fails, V1 drops Supabase Realtime") is now V1's plan by choice.
- After V1, in Justin's words of 2026-10-09: Figma-style cursors with names, selections shown per person, following someone so the page scrolls with them, the outline with a name tag, letter-by-letter typing, and tapping a face to jump to where that person is. Cursors and letter-by-letter typing need Supabase Realtime (#117) and a performance test first.
