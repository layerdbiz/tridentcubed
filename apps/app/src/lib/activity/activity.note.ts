// What the app records itself for the Activity (#306): a project opened and a report's PDF downloaded. The command
// loads the first time one is noted, as the files' do (`files.state.svelte.ts`), so a component test that renders a
// screen never loads a remote function; one that does not reach the server stops nothing and says nothing.
import type { ProjectActivityType } from './activity.types';

/** Records `done` for an Admin's Activity, in the background. */
export function noteActivity(done: ProjectActivityType) {
	import('./activity.remote').then(({ recordActivity }) => recordActivity(done)).catch(() => {});
}
