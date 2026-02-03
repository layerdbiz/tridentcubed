# TODO

- import and use the `<Component>` into both `grid.svelte` and `item.svelte` like the other components do it
- read the `component.svelte` and `component.svelte.ts` to see how they work and refactor the `grid.svelte` and `item.svelte` to account for what's already built (e.g. the `class` utility that allows you to use class on any component.) we'll need to make a special case for `debug` since it serves 2 separate purposes since there's also a `debug.svelte.ts` that's built into the `component.svelte`
- Instead of making the `grid.svelte` component hardwired to 100% height and 100% width, we need to instead make that a default, but allow it to easily be overridden with a Tailwind class.

<Grid place="center">
	<Item>1</Item>
	<Item place="end">2</Item>
	<Item>3</Item>
</Grid>
