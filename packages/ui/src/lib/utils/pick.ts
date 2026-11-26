// A row of options with one picked, as Tabs and Radio draw it (#382). Only the picked option is reached with Tab;
// the arrow keys move along the row and pick as they go, round from the last option to the first, and Home and End
// go to the first and the last, as the WAI-ARIA tabs and radio group patterns have it.

export type PickRoleType = 'tab' | 'radio';

// What each option's own element wears, spread onto it by the component's owner, who draws it.
export interface PickProps {
	role: PickRoleType;
	tabindex: 0 | -1;
	'aria-selected'?: boolean;
	'aria-checked'?: boolean;
	onclick: (event: MouseEvent) => void;
	onkeydown: (event: KeyboardEvent) => void;
}

// What a component's `option` snippet is told about each option.
export interface PickOptionType<T> {
	value: T;
	index: number;
	isOn: boolean;
	props: PickProps;
}

const BACK = ['ArrowLeft', 'ArrowUp'];
const ON = ['ArrowRight', 'ArrowDown'];

// The option a key moves to, from the one at `index` of `count`; undefined for a key that moves nowhere. A row of
// tabs moves only with Left and Right, so Up and Down still scroll the page; a radio group moves with all four.
export function toPickedIndex(
	key: string,
	index: number,
	count: number,
	role: PickRoleType
): number | undefined {
	const isUpDown = key === 'ArrowUp' || key === 'ArrowDown';
	if (count === 0 || (isUpDown && role === 'tab')) return undefined;
	if (BACK.includes(key)) return (index - 1 + count) % count;
	if (ON.includes(key)) return (index + 1) % count;
	if (key === 'Home') return 0;
	if (key === 'End') return count - 1;
	return undefined;
}

// Every option's props for a row: the picked one (or the first, when none is) is the one Tab reaches. A key on an
// option that is not a button (a card holding a button of its own) picks it with Enter and Space as a button would.
// A disabled option (in a disabled fieldset, as a frozen project's fields are) picks nothing, even from a click made
// in code, which a browser still delivers.
export function createPickProps<T>(
	options: readonly T[],
	value: T | undefined,
	role: PickRoleType,
	pick: (value: T) => void
): PickProps[] {
	const picked = options.indexOf(value as T);
	const reached = picked === -1 ? 0 : picked;
	return options.map((option, index) => ({
		role,
		tabindex: index === reached ? 0 : -1,
		...(role === 'tab'
			? { 'aria-selected': index === picked }
			: { 'aria-checked': index === picked }),
		onclick: (event: MouseEvent) => {
			if (!(event.currentTarget as HTMLElement).matches(':disabled')) pick(option);
		},
		onkeydown: (event: KeyboardEvent) => {
			const own = event.currentTarget as HTMLElement;
			if ((event.key === 'Enter' || event.key === ' ') && own.tagName !== 'BUTTON') {
				event.preventDefault();
				return pick(option);
			}
			const next = toPickedIndex(event.key, index, options.length, role);
			if (next === undefined) return;
			event.preventDefault();
			pick(options[next]);
			const row = [...(own.parentElement?.children ?? [])].filter(
				(element) => element.getAttribute('role') === role
			);
			(row[next] as HTMLElement | undefined)?.focus();
		}
	}));
}
