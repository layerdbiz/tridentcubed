import type { ComponentProps } from '@layerd/ui';

export type FormFieldVariant = 'text' | 'icon text' | 'text icon' | 'icon text icon';

export interface FieldProps<TValue = unknown> extends Omit<ComponentProps, 'disabled'> {
	label?: string;
	/**
	 * Help text (glossary): what goes in the input. A ? right after the label opens it, shown once the label sits on
	 * the border (the input is in use or holds a value): a pop-up by the ? for a mouse, a sheet from the bottom for a
	 * finger. Neither takes the focus from the input.
	 */
	help?: string;
	variant?: FormFieldVariant;
	icon?: string;
	iconEnd?: string;
	value?: TValue;
	placeholder?: string;
	name?: string;
	id?: string;
	disabled?: boolean;
	required?: boolean;
	readonly?: boolean;
	'aria-describedby'?: string;
	'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
}

export interface TextFieldProps<
	TValue = unknown,
	TInputMode = string | undefined,
	TAutocomplete = string | undefined,
	TAutocorrect = string | undefined,
	TAutocapitalize = string | undefined
> extends FieldProps<TValue> {
	minlength?: number;
	maxlength?: number;
	inputmode?: TInputMode;
	autocomplete?: TAutocomplete;
	autocorrect?: TAutocorrect;
	autocapitalize?: TAutocapitalize;
	spellcheck?: boolean;
	/**
	 * A Generated value (glossary): the value the app makes. While `value` is empty the input shows it in bright blue
	 * with a wand; once someone types over it, the text turns dark and a reset empties `value`, which brings it back.
	 */
	generated?: string;
	/** Called after the reset has emptied `value`, for a consumer that saves by itself. */
	onreset?: () => void;
}

/**
 * A button at a field's end that does something with what the field holds (#393): opens it, copies it. With `href`
 * it is a link that opens in a new tab; otherwise `onclick` runs. `label` names it for screen readers and `title`
 * says more under a mouse.
 */
export type FieldActionType = {
	icon: string;
	label: string;
	title?: string;
	href?: string;
	onclick?: () => void;
};

export interface FormFieldStateOptions<TValue = unknown> {
	uid?: string;
	type?: string;
	label?: string;
	name?: string;
	id?: string;
	value?: TValue;
	icon?: string;
	iconEnd?: string;
}

export interface FormFieldStateType {
	labelText: string;
	field: {
		name: string;
		id: string;
	};
	trailingIcon?: string;
	hasValue: boolean;
	className: string;
}

function toCamelCase(value: string): string {
	const words = value
		.trim()
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/[^a-zA-Z0-9]+/g, ' ')
		.trim()
		.split(/\s+/)
		.filter(Boolean);

	if (!words.length) return 'field';

	return words
		.map((word, index) => {
			const normalized = word.toLowerCase();
			if (!index) return normalized;

			return normalized.charAt(0).toUpperCase() + normalized.slice(1);
		})
		.join('');
}

export function normalizeFieldLabel(label?: string): string {
	return label?.trim() || 'Text';
}

export function hasFieldValue(value: unknown): boolean {
	if (Array.isArray(value)) {
		return value.some((item) => hasFieldValue(item));
	}

	if (typeof value === 'number') return true;
	if (typeof value === 'boolean') return value;
	if (value == null) return false;

	if (typeof value === 'string') {
		return value.trim().length > 0;
	}

	return true;
}

export interface GeneratedStateType {
	/** What the input shows: its own value once typed, the app's while it is empty. */
	shown: string;
	/** The app's value is showing (bright blue, a wand). */
	isGenerated: boolean;
	/** Someone typed over the app's value (dark, a reset). */
	isTyped: boolean;
}

/**
 * Which value an input with a Generated value shows. An empty value, or one equal to the app's, is the app's; anything
 * else was typed over it. Without a Generated value the input shows its own value and is neither.
 */
export function toGeneratedState(value: unknown, generated?: string): GeneratedStateType {
	const own = value == null ? '' : String(value);
	if (generated === undefined) return { shown: own, isGenerated: false, isTyped: false };
	const isTyped = own.trim().length > 0 && own !== generated;
	return { shown: isTyped ? own : generated, isGenerated: !isTyped, isTyped };
}

/** The class names a field's fieldset takes for its Generated value. */
export function toGeneratedClass(state: GeneratedStateType): string {
	if (state.isTyped) return 'field-typed';
	return state.isGenerated ? 'field-generated' : '';
}

export function createFieldIdentity(options: {
	uid?: string;
	type?: string;
	label?: string;
	name?: string;
	id?: string;
}): FormFieldStateType['field'] {
	const labelText = normalizeFieldLabel(options.label);
	const fieldType = options.type?.trim() || 'field';

	return {
		name: options.name?.trim() || toCamelCase(labelText),
		id: options.id?.trim() || toCamelCase(`${fieldType} ${labelText} ${options.uid || ''}`)
	};
}

export function createFormField<TValue = unknown>(
	options: FormFieldStateOptions<TValue>
): FormFieldStateType {
	const labelText = normalizeFieldLabel(options.label);
	const field = createFieldIdentity(options);
	const trailingIcon = options.iconEnd || options.icon;
	const valuePresent = hasFieldValue(options.value);

	return {
		labelText,
		field,
		trailingIcon,
		hasValue: valuePresent,
		className: valuePresent ? 'field-filled' : 'field-empty'
	};
}
