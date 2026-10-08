---
status: accepted
---

# Offline work lives on the phone and syncs through PowerSync

Report Generator V1 keeps a database on every phone and computer that signs in, saves every change there first, and sends it to the server through PowerSync, a hosted sync service, when there is a signal. PowerSync also brings everyone else's saved changes down to each device. Surveyors work on ships and in ports with no signal for hours, on Android and iPhone, as an installed PWA, and Justin wants speed to V1 over building the hard parts ourselves. PowerSync is the only sync engine that works with Better Auth owning identity and the SvelteKit server as the only Supabase client ([sync engine research](../research/2026-10-05-sync-engines-for-offline-and-live.md), #121): its uploads go to our own `command`, and it accepts our own tokens. Decided on 2026-10-08 ([#122](https://github.com/layerdbiz/tridentcubed/issues/122)).

## Considered options

- A queue we build ourselves on IndexedDB (Dexie): $0, but we would write the phone database, the retrying queue, catching up after being offline and upgrades of the phone database, the most code to get wrong. Out of scope for V1; it stays possible later because the server side (the `command` and its checks) is ours either way.
- RxDB with its Supabase plugin, and y-supabase: both need a Supabase token in the browser, which ADR 0002 rules out. RxDB's fast storage is also $1,188 a year.
- Zero and ElectricSQL: Zero has no offline writes, and Electric does not sync writes at all.

## Consequences

- Cost: PowerSync's free tier first, on top of Supabase Pro ($25 a month). The free tier is deleted after 7 days without use, so the pilot keeps it busy. Outgrowing it means PowerSync Pro at $49, $74 a month in all, or $78 if PowerSync needs Supabase's IPv4 add-on: slightly over the $75 budget, decided when the numbers say so. "Prove one report end to end" (#128) proves it before anything is bought.
- Every change PowerSync replays goes through the one `command` of ADR 0005, which checks the session and membership (ADR 0003) and treats a change id it has already applied as done, so a save resent after a lost reply never doubles up.
- What a device keeps: the values of every project that is not Complete or Archived, and a tiny blurred preview of every photo in them (the preview of ADR 0004, a few KB each). Full photos are kept only for projects the User is on or has opened. Offline, a photo not on the device shows its preview stretched to size, never an empty photo box. #128 checks the size and speed.
- Signing out first sends what it can. Anything still unsent stays on the device, locked to that User, and is sent when they sign in again; the next person never sees it. A separate "Remove my data from this device" wipes it.
- Offline editing works in a browser tab too, but phones ask to install the app until it is installed, and warn harder when unsent changes sit in a tab: iPhone Safari deletes a website's data after 7 days without use unless it is installed.
- Changes that reach the server after a project was marked Sent, Complete or Archived are not applied: the Sent copy never changes. They are kept in History, marked as arriving after Sent, and the User who made them is told when they reconnect. A button that starts a Revision with them comes later.
- Before Sent, changes apply in every status, Trash included, and never move a project between statuses: a Ready project stays Ready. People are told that changes were made; how (a notification bell) is for the V1 spec.
- The four save states show in one banner at the top of the report, only when there is something to know: none online with everything saved (a small "Saved" tick by the title), grey and staying while offline ("Offline. Your work saves on this device. Photos already in the report look blurry until you are back online."), blue while syncing, green "All saved" that fades, red "Not synced" with the reason and Retry until fixed. No popup when someone else's change wins; History keeps the other value. Photos keep their small upload icons (ADR 0004).
- iPhone sends nothing while the app is closed, so the queue drains whenever the app is open; Android does the same and may also sync in the background.
- Two people typing in the same paragraph at once is not solved here: values are last change wins (ADR 0005), and shared text is "Live editing" (#123).
