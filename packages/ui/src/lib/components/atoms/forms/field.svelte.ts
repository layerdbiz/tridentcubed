import type { ComponentProps } from "@layerd/ui";

export type FormFieldVariant =
	| "text"
	| "icon text"
	| "text icon"
	| "icon text icon";

export interface FieldProps<TValue = unknown>
	extends Omit<ComponentProps, "disabled"> {
	label?: string;
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
	"aria-describedby"?: string;
	"aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
}

export interface TextFieldProps<
	TValue = unknown,
	TInputMode = string | undefined,
	TAutocomplete = string | undefined,
	TAutocorrect = string | undefined,
	TAutocapitalize = string | undefined,
> extends FieldProps<TValue> {
	minlength?: number;
	maxlength?: number;
	inputmode?: TInputMode;
	autocomplete?: TAutocomplete;
	autocorrect?: TAutocorrect;
	autocapitalize?: TAutocapitalize;
	spellcheck?: boolean;
}

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
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/[^a-zA-Z0-9]+/g, " ")
		.trim()
		.split(/\s+/)
		.filter(Boolean);

	if (!words.length) return "field";

	return words
		.map((word, index) => {
			const normalized = word.toLowerCase();
			if (!index) return normalized;

			return normalized.charAt(0).toUpperCase() + normalized.slice(1);
		})
		.join("");
}

export function normalizeFieldLabel(label?: string): string {
	return label?.trim() || "Text";
}

export function hasFieldValue(value: unknown): boolean {
	if (Array.isArray(value)) {
		return value.some((item) => hasFieldValue(item));
	}

	if (typeof value === "number") return true;
	if (typeof value === "boolean") return value;
	if (value == null) return false;

	if (typeof value === "string") {
		return value.trim().length > 0;
	}

	return true;
}

export function createFieldIdentity(options: {
	uid?: string;
	type?: string;
	label?: string;
	name?: string;
	id?: string;
}): FormFieldStateType["field"] {
	const labelText = normalizeFieldLabel(options.label);
	const fieldType = options.type?.trim() || "field";

	return {
		name: options.name?.trim() || toCamelCase(labelText),
		id: options.id?.trim() ||
			toCamelCase(`${fieldType} ${labelText} ${options.uid || ""}`),
	};
}

export function createFormField<TValue = unknown>(
	options: FormFieldStateOptions<TValue>,
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
		className: valuePresent ? "field-filled" : "field-empty",
	};
}
