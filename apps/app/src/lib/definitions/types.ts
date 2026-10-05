/**
 * Row types of the Report Generator's definitions: inputs, panels and report pages.
 *
 * Each field's JSDoc is the instruction row the definition sheet kept for that column
 * (36 rows on 2026-10-05). Three of those rows describe the instructions sheet itself and
 * have no field here:
 * - `entity` (list): Dataset this instruction row applies to. Used only by the instructions sheet itself.
 * - `name` (string): Exact column name this instruction row describes. Used only by the instructions sheet itself.
 * - `type` (list): Expected value type for the named column. Used only by the instructions sheet itself.
 *
 * Rows are written `as const satisfies readonly <Row>[]` in ./panels.ts, ./pages.ts and
 * ./inputs.ts, so every field is readonly and ids stay literal types.
 */

export type FieldSourceType = 'user' | 'system' | 'prefilled' | 'derived' | 'template' | 'external';

export type FieldValueType =
	| 'string'
	| 'number'
	| 'boolean'
	| 'date'
	| 'datetime'
	| 'enum'
	| 'object'
	| 'array'
	| 'file'
	| 'image'
	| 'richtext';

export type FieldInputType =
	| 'text'
	| 'textarea'
	| 'select'
	| 'multiselect'
	| 'date'
	| 'datetime'
	| 'number'
	| 'email'
	| 'tel'
	| 'url'
	| 'file'
	| 'image'
	| 'checkbox'
	| 'radio'
	| 'repeater'
	| 'richtext'
	| 'hidden';

export type FieldVisibilityType = 'visible' | 'hidden' | 'conditional';
export type PanelRendererType = 'fields' | 'time-log' | 'photos' | 'custom';
export type OutputPageSectionType = 'header' | 'main' | 'footer';
export type PreviewPageVariantType =
	| 'full'
	| 'toc'
	| 'list'
	| 'template'
	| 'team'
	| 'table'
	| 'photo';

/**
 * One question of the report editor. `PanelId` and `PageId` are the id unions derived from
 * ./panels.ts and ./pages.ts, so a row that names a missing panel or page does not compile.
 */
export interface InputDefinitionType<
	PanelId extends string = string,
	PageId extends string = string
> {
	/**
	 * Unique row identifier for the record or definition.
	 * Used across inputs, panels, and pages.
	 * @example INP-001
	 */
	readonly id: string;
	/**
	 * Controls whether something is shown hidden or conditionally shown.
	 * Used by both inputs and panels. Pages may also use it later if needed.
	 * Options: hidden, visible, conditional.
	 * @example visible
	 */
	readonly visibility: FieldVisibilityType | null;
	/**
	 * Panel this input belongs to in the editor.
	 * Join target for the panels sheet.
	 * Options: Organization, Project, Team, Client, Facility, Carrier, Items, Inspection, Damages, Discharge, Time Log, Custom.
	 * Stored as the panel id (`PanelIdType`); the sheet listed titles.
	 * @example Team
	 */
	readonly panel: PanelId;
	/**
	 * Human-readable input label shown in the UI.
	 * @example Owner
	 */
	readonly label: string;
	/**
	 * Unique logical storage path using dot notation.
	 * Should remain stable over time.
	 * @example team.owner.name
	 */
	readonly path: string;
	/**
	 * Where the value comes from.
	 * Options: user, system, prefilled, derived, template, external.
	 * @example user
	 */
	readonly source: FieldSourceType | null;
	/**
	 * Actual stored data type for the value.
	 * Options: string, number, boolean, date, datetime, enum, object, array, file, image, richtext.
	 * @example string
	 */
	readonly type: FieldValueType | null;
	/**
	 * UI control used to capture or edit the value (NOTE: use the `<InputNew>` component for all `<input>` related elements. The other 'form' components will be created later so it's ok to use normal html for those.
	 * Options: text, textarea, select, multiselect, date, datetime, number, email, tel, url, file, image, checkbox, radio, repeater, richtext, hidden.
	 * @example text
	 */
	readonly input: FieldInputType | null;
	/**
	 * Allowed options when the input uses select-like controls.
	 * Usually comma-separated values.
	 * @example Blake, Tom, Kate
	 */
	readonly options: readonly string[];
	/**
	 * Hint text shown before the user enters a value.
	 * @example Describe the activity
	 */
	readonly placeholder: string;
	/**
	 * Initial default value used when creating a new record.
	 * @example Survey Report
	 */
	readonly value: string;
	/**
	 * Whether the user can change the value.
	 * Options: TRUE, FALSE.
	 * @example TRUE
	 */
	readonly editable: boolean;
	/**
	 * Whether the record or field must exist to be considered valid.
	 * Used by inputs, panels, and pages.
	 * Options: TRUE, FALSE.
	 * @example TRUE
	 */
	readonly required: boolean;
	/**
	 * Whether this is an object or array in the code.
	 * Options: TRUE, FALSE.
	 * @example FALSE
	 */
	readonly repeatable: boolean;
	/**
	 * Validation rules such as min max pattern or format.
	 * Options: required, min, max, minLength, maxLength, pattern, email, url, phone, date.
	 * @example required
	 */
	readonly validation: readonly string[];
	/**
	 * Pages that consume this input during rendering.
	 * Usually comma-separated values.
	 * Options: Cover, Table of Contents, Introduction, Project Report, Personnel in Attendance, Cargo Description, Cargo Condition Inspection, Time Log, Cargo Operations, Cargo Damages, Cargo Storage, Cargo Trailer Securement, Ships Particulars, Ships Certifications, Barge Information, Lifting Plan, Lifting Gear, Stowage Plan, Post-Discharge Inspection, Disclaimer.
	 * Stored as page ids (`PageIdType`); the sheet listed titles.
	 * @example Cover
	 */
	readonly outputToPages: readonly PageId[];
	/**
	 * Page region where the input is rendered.
	 * Options: header, main, footer.
	 * @example main
	 */
	readonly outputToPageSection: readonly OutputPageSectionType[];
	/**
	 * Sample value used to clarify intent.
	 * Optional helper field.
	 * @example Justin
	 */
	readonly example: string;
	/**
	 * Implementation notes edge cases or extra context.
	 * Optional helper field.
	 * @example Prefilled from org data
	 */
	readonly notes: string;
	/**
	 * Reference to another row id used for inheritance reuse or dependency.
	 * Use when one row depends on or mirrors another.
	 * Input ids; ./inputs.ts checks that each one exists.
	 * @example PAGE-007
	 */
	readonly reference: readonly string[];
}

/** One panel of the report editor. */
export interface PanelDefinitionType {
	/**
	 * Unique row identifier for the record or definition.
	 * Used across inputs, panels, and pages.
	 * @example INP-001
	 */
	readonly id: string;
	/**
	 * Sort order used when rendering or listing rows.
	 * Used by panels and pages.
	 * @example 1
	 */
	readonly order: number;
	/**
	 * Controls whether something is shown hidden or conditionally shown.
	 * Used by both inputs and panels. Pages may also use it later if needed.
	 * Options: hidden, visible, conditional.
	 * @example visible
	 */
	readonly visibility: FieldVisibilityType | null;
	/**
	 * Emoji to use for icon. Will later be replaced with icon class name.
	 * @example 🖼️
	 */
	readonly icon: string;
	/**
	 * Title shown in the UI.
	 * @example Team
	 */
	readonly title: string;
	/**
	 * Panel behavior or rendering variant if needed.
	 * Optional for now; current data allows this column even if blank.
	 * Options: default, system, custom, repeater, photo.
	 * @example default
	 */
	readonly type: PanelRendererType | null;
	/**
	 * Human-readable explanation of what the row or field represents.
	 * Shared helper field when needed.
	 * @example Short explanation
	 */
	readonly description: string;
	/**
	 * Whether the record or field must exist to be considered valid.
	 * Used by inputs, panels, and pages.
	 * Options: TRUE, FALSE.
	 * @example TRUE
	 */
	readonly required: boolean;
	/**
	 * Whether the panel can be edited by the user.
	 * Options: TRUE, FALSE.
	 * @example FALSE
	 */
	readonly readonly: boolean;
	/**
	 * Whether the panel is enabled by default.
	 * Options: TRUE, FALSE.
	 * @example TRUE
	 */
	readonly enabled: boolean;
	/**
	 * Whether the panel can be reordered in the editor.
	 * Options: TRUE, FALSE.
	 * @example FALSE
	 */
	readonly draggable: boolean;
	/**
	 * Implementation notes edge cases or extra context.
	 * Optional helper field.
	 * @example Prefilled from org data
	 */
	readonly notes: string;
	/**
	 * Reference to another row id used for inheritance reuse or dependency.
	 * Use when one row depends on or mirrors another.
	 * @example PAGE-007
	 */
	readonly reference: readonly string[];
	/**
	 * Default photo variant for a photo panel (`photos-1` to `photos-8`); empty uses the page default.
	 */
	readonly photo: string;
	/**
	 * CSS class or token used to render the panel icon.
	 * @example icon-[tabler--briefcase-2-filled]
	 */
	readonly iconClass: string;
	/**
	 * Optional icon or asset URL associated with the panel.
	 * @example https://api.iconify.design/tabler:briefcase-2-filled.svg
	 */
	readonly iconUrl: string;
}

/** One page of the rendered report. */
export interface PageDefinitionType {
	/**
	 * Unique row identifier for the record or definition.
	 * Used across inputs, panels, and pages.
	 * @example INP-001
	 */
	readonly id: string;
	/**
	 * Sort order used when rendering or listing rows.
	 * Used by panels and pages.
	 * @example 1
	 */
	readonly order: number;
	/**
	 * Whether the record or field must exist to be considered valid.
	 * Used by inputs, panels, and pages.
	 * Options: TRUE, FALSE.
	 * @example TRUE
	 */
	readonly required: boolean;
	/**
	 * Name of the output page.
	 * Options: Cover, Table of Contents, Introduction, Project Report, Personnel in Attendance, Cargo Description, Cargo Condition Inspection, Time Log, Cargo Operations, Cargo Damages, Cargo Storage, Cargo Trailer Securement, Ships Particulars, Ships Certifications, Barge Information, Lifting Plan, Lifting Gear, Stowage Plan, Post-Discharge Inspection, Disclaimer.
	 * @example Cover
	 */
	readonly page: string;
	/**
	 * Render variant used for the page.
	 * Options: full, toc, list, template, team, table, photo.
	 * @example photo
	 */
	readonly variant: PreviewPageVariantType | string;
	/**
	 * Page regions enabled for the page layout.
	 * Usually comma-separated values.
	 * Options: header, main, footer.
	 * @example header, main, footer
	 */
	readonly section: readonly OutputPageSectionType[];
	/**
	 * Implementation notes edge cases or extra context.
	 * Optional helper field.
	 * @example Prefilled from org data
	 */
	readonly notes: string;
	/**
	 * Reference to another row id used for inheritance reuse or dependency.
	 * Use when one row depends on or mirrors another.
	 * @example PAGE-007
	 */
	readonly reference: string;
}

/** The three catalogues together, as `createProjectSchema` reads them. */
export interface ProjectDefinitionsType {
	readonly inputs: readonly InputDefinitionType[];
	readonly panels: readonly PanelDefinitionType[];
	readonly pages: readonly PageDefinitionType[];
}
