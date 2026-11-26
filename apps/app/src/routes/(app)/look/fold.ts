// The app's look for a folding section, the library Accordion (2026-11-26, Justin: a library piece's look is set
// from outside): a faint grey box with round corners and a grey chevron. The panel groups (group.svelte) and the
// Activity's runs of entries wear it, so the two stay one look.
export const FOLD_LOOK = {
	class: 'rounded-2xl bg-slate-900/[0.03] transition',
	icon: 'icon-[mdi--chevron-down] text-slate-400'
};
