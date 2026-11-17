---
status: accepted
---

# The app is installed from app.tridentcubed.com and runs on the device

Report Generator V1 lives at `app.tridentcubed.com` and is an installable PWA on Android, iPhone and computers. It gets there in two steps. Install comes first, on the app as it is today, which needs a connection: SvelteKit 3's own service worker keeps the app's files on the device, and with no signal the app shows its own Needs Internet screen. Offline comes second (ADR 0006): once signed in, the app is downloaded once and draws every screen on the device from the device's own database, so it opens instantly with or without signal; only sign-in, the PDF export and admin pages come from the server. The same installed app gains offline work with no reinstall. Justin wants the simplest version of every part: no browser or device sniffing, no custom code for edge cases until a real case asks for it. Decided on 2026-10-09 ([#127](https://github.com/layerdbiz/tridentcubed/issues/127)), on top of the [PWA research](../research/2026-10-05-pwa-on-iphone-and-android.md) (#126). Updated on 2026-11-17 by "Install the app on phones" ([#199](https://github.com/layerdbiz/tridentcubed/issues/199)), when Justin put install ahead of offline so the Trident Cubed team can have the app on their phones now. What changed that day carries the date.

## Considered options

- `tridentcubed.com/app`: shares the website's address, so the two would share offline storage and service worker scope. A separate domain (`tridentcubed.app`) adds a second brand to keep. The address cannot change later without every device reinstalling and losing anything unsent, so it is chosen once.
- Pages drawn by the server with a stored copy offline: faster first paint on a computer, but two ways to draw every page and stale pages offline. The data already lives on the device, so drawing there is one path.
- The vite-pwa plugin (Workbox): its SvelteKit wrapper still only supports SvelteKit 2. SvelteKit's own service worker is about 100 lines we own.
- Install waiting for offline, where "Sign in and save to the real database" (#179) had left it: one release instead of two, but the team has no app on their phones until offline is built. A phone does not require offline support before it allows an install: Chrome dropped that rule in 2023 and iPhone never had it (research #126). Nothing built for install is redone for offline, so install goes first (2026-11-17).

## Consequences

Install ships now, with #199:

- Home screen: full name "Trident Cubed", "Trident" under the icon, the dark-background Trident Cubed logo on black, opening full screen with no browser bars. Upright and sideways both work for now. Black replaced brand navy on 2026-11-17.
- The test copy (2026-11-17): an installed app belongs to the address it was installed from. The team installs a test copy from the dev address, `dev.app.tridentcubed.com`, named "Trident Cubed Dev" with "Trident Dev" under the icon, and installs once more from `app.tridentcubed.com` at go-live. The name follows the address by itself: the real address gives the real name and any other address gives the Dev name, so no setting is changed by hand at go-live. The move needs nothing but signing in, because the installed app keeps no work on the device yet. `app.tridentcubed.com` stays the one address that is chosen once.
- The app answers the manifest itself and does not keep it as a file: every app in this repository serves the same static folder, so a manifest file there would be served by the Website too.
- No zoom: the viewport tag turns zoom off and text boxes are at least 16px, so tapping one never zooms the page. iPhone still allows pinch zoom (Apple overrides the tag for accessibility); nothing fights it.
- The service worker keeps the app's files, never data. It keeps this version's built files, the Needs Internet screen, the icons and the logo, and never the whole shared static folder, which carries the Website's videos and photos. It answers a built file from the device and gives a page request that fails the Needs Internet screen. Everything else goes to the server untouched: remote functions, server routes, file addresses and anything that is not a plain read. Server responses are never cached. When offline arrives, data is PowerSync's (ADR 0006), still never the service worker's.
- No signal (2026-11-17): the app shows its Needs Internet screen, with the logo, "Needs Internet", one line saying that working with no signal is coming, and Try Again. It comes back by itself when the signal returns, on the page that was asked for. Losing signal while the app is open changes nothing: what is on screen stays, and changes show Not saved with Retry, as before.
- Updates: a new version downloads quietly and takes over the next time the app opens from closed; if it stays open, a small "New version, tap to update" note appears. It never switches while a change is Saving or Not saved: the note waits until everything is saved, then updates on a tap.
- Old versions: no version-checking code. The server stores changes as they arrive, from any app version; a Value for an input that no longer exists is kept but not shown.
- Installing: "Install App" is a line in the profile picture menu, between Organization and Log Out, and a small link on the login page, so a visitor can install before signing in. Where the browser offers a one-tap install it uses it; otherwise a how-to with an iPhone tab and an Android tab shows three short steps each. The User picks the phone; the app never guesses it. Asking the browser whether it can install is not sniffing the device. The browser's own install offer is left alone. Inside the installed app, and right after a one-tap install, Install App is hidden. Uninstalling is the phone's own. Until 2026-11-17 this was "Install app" on a Settings screen reached from the avatar menu, reading "Installed" once installed, and only there. No general Settings screen exists, and Log Out already sits in the profile picture menu.
- No push notifications in V1: the in-app bell (V1 spec) comes first.
- Real phones prove the icon and name on the home screen, full screen, signing in inside the installed app, the top status bar and an update arriving, on an iPhone and an Android phone ("Check the install on a real iPhone and Android", #205). On iPhone the installed app keeps its own sign-in, separate from Safari. Still unproven: whether Google and Microsoft sign-in return inside the installed app; if they do not, the emailed code is the way in.
- Pointing `app.tridentcubed.com` at the Vercel project is a one-time step by hand, done at go-live.

These wait for the offline spec (ADR 0006, #128), because they only matter once work is stored on the device (Justin, 2026-11-17):

- The device database, opening with no signal and everything that depends on them stay with ADR 0006.
- Storage: the installed app asks the phone once to protect its data from being cleared. Nothing else: no space cleanup, no storage screen.
- "Remove my data from this device" (ADR 0006). Its home was Settings; the offline spec gives it a new one.
- The only nudge to install is the offline banner (ADR 0006) adding "Install the app to keep this safe" while unsent work sits in a browser tab. This replaces ADR 0006's phones being asked to install until they do.
- Offline, things that need the internet (first sign-in, PDF export, the Users page, full photos not yet on the device) stay where they are, greyed, with "Needs internet"; nothing extra is queued.
- Offline, an update keeps the old version until everything is sent.
- The facts only a real phone proves once work is stored on it (iPhone keeps the data protected after install, a 50 MB photo set survives a week and a restart, the app opens in airplane mode, an update never sends a change twice) are checked in "Prove one report end to end" (#128) on an iPhone and an Android phone.
