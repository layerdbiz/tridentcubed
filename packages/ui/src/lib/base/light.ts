// The base component's light path (Justin, 2026-11-26: every library component is built on the base component, an
// avatar in every list row too). A component that asks for no layout and none of the base props renders straight
// from the base component, without Root and the base props' machinery, which would only hand its props and children
// back. These say when that is, and what the root element is given on it: exactly what Root would give it.
import { createComponent, mergeStyles, type ComponentRenderProps } from '@layerd/ui';

/** The layout props, which Root takes for itself: the zones, cells, rows, columns, halves and layers, and the grid's. */
export const LAYOUT_PROPS = new Set([
	'topLeft',
	'top',
	'topRight',
	'left',
	'center',
	'right',
	'bottomLeft',
	'bottom',
	'bottomRight',
	'a1',
	'b1',
	'c1',
	'a2',
	'b2',
	'c2',
	'a3',
	'b3',
	'c3',
	'row1',
	'row2',
	'row3',
	'col1',
	'col2',
	'col3',
	'topHalf',
	'bottomHalf',
	'leftHalf',
	'rightHalf',
	'bg',
	'full',
	'fg',
	'grid',
	'rail',
	'rails',
	'ratio',
	'mode',
	'items',
	'content',
	'rows',
	'cols',
	'gap',
	'inset'
]);

// The base component's own props, which never reach the element.
const OWN_PROPS = new Set([
	'label',
	'children',
	'class',
	'component',
	'debug',
	'observe',
	'persist',
	'persistContext',
	'persistGetValue',
	'persistSetValue',
	'scroll',
	'value',
	'checked',
	'snippets',
	'tag',
	'total'
]);

// What Root takes for itself from what it is handed, beside the layout props.
const ROOT_PROPS = new Set([
	'style',
	'size',
	'tag',
	'label',
	'children',
	'debug',
	'snippets',
	'root'
]);

// The elements whose value the base component binds: they take the full path, where the binding lives.
const BOUND_TAGS = new Set(['input', 'textarea', 'select']);

function hasValue(value: unknown): boolean {
	return value !== undefined && value !== null && value !== false && value !== '';
}

/** Whether a component with these props can take the light path: no layout, no base props, no bound value. */
export function isLightRequest(props: Record<string, unknown>): boolean {
	if (props.debug || props.observe || props.scroll || props.persist) return false;
	if (props.total !== undefined) return false;
	if (props.snippets && Object.keys(props.snippets).length) return false;
	if (
		BOUND_TAGS.has(
			String(props.tag ?? '')
				.trim()
				.toLowerCase()
		)
	)
		return false;
	for (const key of Object.keys(props)) {
		if (LAYOUT_PROPS.has(key) && hasValue(props[key])) return false;
	}
	return true;
}

/**
 * What a component was handed, as one plain object read once. Props reach a library piece through Svelte's proxies,
 * one inside another for each piece that hands them on (a Chip's to the base component's), and every read walks all
 * of them; the light path asks twice (is it light, what does the element get), so it reads a plain copy (#381: a
 * list of chips and count badges spent more time walking proxies than drawing, measured).
 */
export function toPlainProps(props: object): Record<PropertyKey, unknown> {
	const plain: Record<PropertyKey, unknown> = {};
	for (const key of Reflect.ownKeys(props))
		plain[key] = (props as Record<PropertyKey, unknown>)[key];
	return plain;
}

/**
 * What the root element is given on the light path: the theme's classes and the props, as Root would hand them.
 * Attachments, which come as symbol keys, are handed on too. The caller's class comes last.
 */
export function toLightRootProps(props: Record<PropertyKey, unknown>): ComponentRenderProps {
	const rest: Record<PropertyKey, unknown> = {};
	for (const key of Reflect.ownKeys(props)) {
		if (typeof key === 'string' && (OWN_PROPS.has(key) || LAYOUT_PROPS.has(key))) continue;
		rest[key] = props[key];
	}
	// Read by key, symbols (attachments) too, which ComponentReturn's type leaves out.
	const handed = createComponent(rest) as unknown as Record<PropertyKey, unknown>;
	const element: Record<PropertyKey, unknown> = {};
	for (const key of Reflect.ownKeys(handed)) {
		if (key === 'class' || (typeof key === 'string' && ROOT_PROPS.has(key))) continue;
		element[key] = handed[key];
	}
	const theme = handed.class as string;
	const own = props.class;
	element.class = (own ? (theme ? `${theme} ${own}` : `${own}`) : theme).trim();
	element.style = mergeStyles(handed.style as string | undefined);
	return element as ComponentRenderProps;
}
