// Runs in the browser before any page. A page opened over plain http by a network address (the dev server on a
// phone) has no `crypto.randomUUID`; see uuid.ts. Install App starts hearing the browser here, because the browser
// can offer its one-tap install before any page is drawn (#203). The app also leaves the server its hint about this
// device (#331), for the device beside each person in the menu's Online panel.
import { install } from '#lib/install/install.state.svelte.js';
import { DEVICE_COOKIE } from '#lib/presence/presence.constants.js';
import { toDeviceHint } from '#lib/presence/presence.utils.js';
import { ensureRandomUuid } from './uuid';

ensureRandomUuid();
install.listen(window);
leaveDeviceHint();

function leaveDeviceHint() {
	const isInstalled =
		matchMedia('(display-mode: standalone)').matches ||
		(navigator as { standalone?: boolean }).standalone === true;
	const hint = toDeviceHint({ touchPoints: navigator.maxTouchPoints, isInstalled });
	const secure = location.protocol === 'https:' ? '; secure' : '';
	document.cookie = `${DEVICE_COOKIE}=${hint}; path=/; max-age=31536000; samesite=lax${secure}`;
}
