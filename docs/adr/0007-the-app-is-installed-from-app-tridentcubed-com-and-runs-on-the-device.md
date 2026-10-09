---
status: accepted
---

# The app is installed from app.tridentcubed.com and runs on the device

Report Generator V1 lives at `app.tridentcubed.com` and is an installable PWA on Android, iPhone and computers. Once signed in, the app is downloaded once and draws every screen on the device from the device's own database (ADR 0006), so it opens instantly with or without signal; only sign-in, the PDF export and admin pages come from the server. SvelteKit 3's own service worker keeps the app's files on the device. Justin wants the simplest version of every part: no browser or device sniffing, no custom code for edge cases until a real case asks for it. Decided on 2026-10-09 ([#127](https://github.com/layerdbiz/tridentcubed/issues/127)), on top of the [PWA research](../research/2026-10-05-pwa-on-iphone-and-android.md) (#126).

## Considered options

- `tridentcubed.com/app`: shares the website's address, so the two would share offline storage and service worker scope. A separate domain (`tridentcubed.app`) adds a second brand to keep. The address cannot change later without every device reinstalling and losing anything unsent, so it is chosen once.
- Pages drawn by the server with a stored copy offline: faster first paint on a computer, but two ways to draw every page and stale pages offline. The data already lives on the device, so drawing there is one path.
- The vite-pwa plugin (Workbox): its SvelteKit wrapper still only supports SvelteKit 2. SvelteKit's own service worker is about 100 lines we own.

## Consequences

- Home screen: full name "Trident Cubed", "Trident" under the icon, the Trident logo on brand navy, opening full screen with no browser bars. Upright and sideways both work for now.
- No zoom: the viewport tag turns zoom off and text boxes are at least 16px, so tapping one never zooms the page. iPhone still allows pinch zoom (Apple overrides the tag for accessibility); nothing fights it.
- The service worker keeps the app's files, never data: data is PowerSync's (ADR 0006), and server responses are never cached.
- Updates: a new version downloads quietly and takes over the next time the app opens from closed; if it stays open, a small "New version, tap to update" note appears. It never switches while anything is unsent or uploading, and offline it keeps the old version until everything is sent.
- Old versions: no version-checking code. The server stores changes as they arrive, from any app version; a Value for an input that no longer exists is kept but not shown.
- Storage: the installed app asks the phone once to protect its data from being cleared. Nothing else: no space cleanup, no storage screen.
- Installing: Settings (from the avatar menu) has "Install app". Where the browser offers a one-tap install it uses it; otherwise a choice of "Android" or "iPhone" shows a short how-to. Asking the browser whether it can install is not sniffing the device. Once installed the button reads "Installed". Settings also holds Sign out and "Remove my data from this device" (ADR 0006); uninstalling is the phone's own. The only nudge outside Settings is the offline banner (ADR 0006) adding "Install the app to keep this safe" while unsent work sits in a browser tab. This replaces ADR 0006's phones being asked to install until they do. The look of Settings and the how-to comes from a design grilling.
- Offline, things that need the internet (first sign-in, PDF export, the Users page, full photos not yet on the device) stay where they are, greyed, with "Needs internet"; nothing extra is queued.
- No push notifications in V1: the in-app bell (V1 spec) comes first.
- The facts only a real phone proves (iPhone keeps the data protected after install, a 50 MB photo set survives a week and a restart, the app opens in airplane mode, an update never sends a change twice) are checked in "Prove one report end to end" (#128) on an iPhone and an Android phone.
- Pointing `app.tridentcubed.com` at the Vercel project is a one-time step by hand.
