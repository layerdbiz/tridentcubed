<script lang="ts">
	// PROTOTYPE (#161): the inputs inside one panel, by kind: project, transport, items, time log or photo groups.
	// Everything is live: typing moves the panel's count, its bar, the project's bar and the preview. The Project panel is
	// its fields with the Team after Customer; its drop-downs offer "Add new", a quick sheet (note 26). The Transport panel
	// (Justin, 2026-10-25) is the trip, one stop per place in trip order: its point (Start, Stop, End, each with its
	// colour), Transport type, Transport mode, the transport from the organization's list, and the facility, whose list
	// puts the kind that suits the transport type first. Stops, photo groups and time log days are the same Group, with
	// Delete at the far right of its bottom row (run 8 note 10); every delete asks first. Each photo has its own
	// description: tap it, or Edit description in its ⋮ (notes 12 and 14). V1 (#180) took out the sample day and the
	// sample photo, the last buttons that wrote made-up data.
	// Run 9: Items is rows of quantity and description, like the time log's entries (note 24); a photo with a
	// description shows an icon instead of its text (note 16), its ⋮ is bare dots (note 15), and the photos-per-page
	// buttons draw their own layout (note 17). Uploads are shrunk here, as V1 will, so the browser can keep them.
	// Run 16 (Justin, 2026-11-10): the Project panel is Title, Subtitle, Project Type, Organization, Customer, the
	// customer's Contact, the Team and Location, and the + sheet shows this same panel for a new project (`isDraft`:
	// nothing is saved until Create). Its Organization and Customer lists are read live, and "Add new" makes a real
	// customer, transport mode or facility through `look.add`, the same as the + sheet.
	// Run 19 (Justin, 2026-11-10): the Team is a section of its own, like a stop: Lead (once Owner) and Assigned are
	// pickers that show faces, Assigned taking several; Add Personnel adds people who are not on the team, each in a
	// section of their own. Location is gone: a project is where its first stop's facility is. The Transport Mode
	// panel opens on one Trip section with Start, Stop and End together, each a transport mode and a facility, and
	// Add stop still adds a stop with a section of its own. Items takes rows pasted from a spreadsheet and photos or
	// files of the item list. The Time Log's times are typed on the 24-hour clock.
	// Run 21 (Justin, 2026-11-11): the Project panel is three sections that open like the Team did: Project (title,
	// subtitle, type), Customer (customer and contact) and Team (organization, Team Lead, Team Assigned). Every
	// dropdown in them is picker.svelte, so a person is always the app's own Avatar and a company its logo. Add
	// Personnel adds a company's section: its name, then as many people from it as needed, each a name and a title.
	import type { Attachment } from 'svelte/attachments';
	import { flip } from 'svelte/animate';
	import BottomSheet from './bottom-sheet.svelte';
	import Group from './group.svelte';
	import TransportLegs from './variants/transport-legs.svelte';
	import { startUpload, type Upload } from '#lib/files/files.state.svelte.js';
	import { shrink } from './image';
	import ImageField from './image-field.svelte';
	import {
		createId,
		FACILITY_ICONS,
		itemOf,
		LAYOUTS,
		newPerson,
		newPersonnel,
		PAGE_ICONS,
		PROJECT_TYPES,
		type AttachmentType,
		type FacilityKindType,
		type FieldType,
		type PanelType,
		type PhotoType
	} from './look.data';
	import type { LookState } from './look.state.svelte';
	import Menu from './menu.svelte';
	import Picker from './picker.svelte';
	import PlaceField from './place-field.svelte';
	import { addGroup as addPhotoGroup, addPhotos, hasFiles, uploadOf } from './photos';
	import { customerOf } from './records.data';
	import { sortable } from './sortable';

	let {
		look,
		panel,
		isDraft = false
	}: {
		look: LookState;
		panel: PanelType;
		// A project not made yet (the + sheet): typing saves nothing and no other project's lock applies.
		isDraft?: boolean;
	} = $props();

	function save() {
		if (!isDraft) look.saved();
	}

	// The Project panel's sections, open or folded: Project, Customer, Team, and one per company of personnel.
	let openSections = $state<string[]>(['project', 'customer', 'team']);
	const personnel = $derived(panel.personnel ?? []);
	const members = $derived(look.members.map((member) => ({ id: member.name, label: member.name })));

	function fieldOf(label: string) {
		return panel.fields.find((field) => field.label === label);
	}

	function setField(label: string, value: string) {
		const field = fieldOf(label);
		if (field) field.value = value;
		save();
	}

	// A different customer has different contacts, so the one picked before no longer applies.
	function setCustomer(name: string) {
		if (fieldOf('Customer')?.value !== name) panel.contact = undefined;
		setField('Customer', name);
	}

	function setLead(name: string) {
		panel.owner = name;
		panel.assigned = panel.assigned.filter((other) => other !== name);
		save();
	}

	function assign(name: string) {
		panel.assigned = panel.assigned.includes(name)
			? panel.assigned.filter((other) => other !== name)
			: [...panel.assigned, name];
		save();
	}

	// Another company's people on the job: its own section, opened ready to type into.
	function addPersonnel() {
		const company = newPersonnel();
		panel.personnel = [...personnel, company];
		openSections = [...openSections, company.id];
		save();
	}

	// Rows pasted from a spreadsheet become items: a first cell that is a number is the quantity, the rest the
	// description. A single pasted word goes into the field as usual.
	function pasteItems(event: ClipboardEvent) {
		const text = event.clipboardData?.getData('text/plain') ?? '';
		if (!/[\t\n]/.test(text.trim())) return;
		event.preventDefault();
		const rows = text
			.split(/\r?\n/)
			.map((line) =>
				line
					.split('\t')
					.map((cell) => cell.trim())
					.filter(Boolean)
			)
			.filter((cells) => cells.length);
		for (const cells of rows) {
			const hasQuantity = cells.length > 1 && /^[\d.,]+$/.test(cells[0]);
			panel.items.push(
				itemOf(hasQuantity ? cells[0] : '', (hasQuantity ? cells.slice(1) : cells).join(' · '))
			);
		}
		const filled = panel.items.filter((item) => item.quantity.trim() || item.description.trim());
		panel.items.splice(0, panel.items.length, ...filled);
		save();
		look.say(`${rows.length} ${rows.length === 1 ? 'row' : 'rows'} pasted`);
	}

	// The 24-hour clock, typed: "730" and "0730" both become 07:30, "7" becomes 07:00.
	function clockOf(text: string) {
		const digits = text.replace(/\D/g, '').slice(0, 4);
		if (!digits) return '';
		const padded = digits.length <= 2 ? `${digits.padStart(2, '0')}00` : digits.padStart(4, '0');
		const hours = Math.min(23, Number(padded.slice(0, 2)));
		const minutes = Math.min(59, Number(padded.slice(2)));
		return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
	}

	// The Project panel's lists are the live ones: the organization itself, and the Customers page.
	function optionsOf(field: FieldType) {
		const options =
			field.label === 'Organization'
				? [look.organization.name]
				: field.label === 'Customer'
					? look.customers
					: (field.options ?? []);
		return field.value && !options.includes(field.value) ? [field.value, ...options] : options;
	}

	const customerName = $derived(
		panel.fields.find((field) => field.label === 'Customer')?.value ?? ''
	);
	const contacts = $derived(
		customerName ? (customerOf(look, customerName).contacts ?? []).filter((item) => item.name) : []
	);

	let openDays = $state<string[]>([panel.days[0]?.id ?? '']);
	let openGroups = $state<string[]>([panel.groups[0]?.id ?? '']);

	function toggle(list: string[], id: string) {
		return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
	}

	async function pick(event: Event, onfile: (url: string, name: string) => void) {
		const input = event.currentTarget as HTMLInputElement;
		const files = [...(input.files ?? [])];
		input.value = '';
		for (const file of files)
			onfile(file.type.startsWith('image/') ? await shrink(file) : '', file.name);
		save();
	}

	// The item list attached as photos or the spreadsheet itself (#188): each file goes to private storage through the
	// upload helper, showing in place while it goes, and joins the panel's attachments once it is there.
	type SendingType = { id: string; name: string; kind: AttachmentType['kind']; upload: Upload };
	let sending = $state<SendingType[]>([]);

	function attach(event: Event, kind: AttachmentType['kind']) {
		const input = event.currentTarget as HTMLInputElement;
		const files = [...(input.files ?? [])];
		input.value = '';
		for (const file of files) {
			const id = crypto.randomUUID();
			const upload = startUpload(file, {
				for: { table: 'item_attachment', column: 'file', id, projectId: look.projectId },
				kind: kind === 'photo' ? 'photo' : 'document',
				ondone: (src) => {
					sending = sending.filter((other) => other.id !== id);
					panel.attachments = [...(panel.attachments ?? []), { id, name: file.name, src, kind }];
					save();
				}
			});
			sending.push({ id, name: file.name, kind, upload });
		}
	}

	// Asks first, then takes the item out of its list.
	function remove<T>(list: T[], item: T, title: string, note?: string) {
		look.confirm({
			title,
			note,
			onyes: () => {
				const index = list.indexOf(item);
				if (index >= 0) list.splice(index, 1);
				save();
			}
		});
	}

	// "Add new" in a drop-down: the quick sheet adds the name to its list and picks it. A new facility also asks its
	// kind; a new transport takes the stop's type and mode.
	type AskType = { label: string; kinds?: FacilityKindType[]; onadd: (name: string) => void };
	let asking = $state<AskType>();
	let draft = $state('');
	let draftKind = $state<FacilityKindType>('Port');

	function ask(asked: AskType) {
		draft = '';
		draftKind = asked.kinds?.[0] ?? 'Port';
		asking = asked;
	}

	// A dropdown field of plain words (a Project Type). "Add new" asks for the word in the quick sheet.
	function pickField(field: FieldType, value: string) {
		field.value = value;
		save();
	}

	function askField(field: FieldType) {
		ask({
			label: field.label,
			onadd: (name) => {
				field.options = [...(field.options ?? []), name];
				field.value = name;
			}
		});
	}

	function add() {
		if (!asking || !draft.trim()) return;
		asking.onadd(draft.trim());
		asking = undefined;
		save();
	}

	function setImage(field: FieldType, event: Event) {
		pick(event, (url, name) => (field.value = field.type === 'file' ? name : url));
	}

	function addDay() {
		const day = {
			id: crypto.randomUUID(),
			date: '',
			entries: [{ id: crypto.randomUUID(), time: '', activity: '' }]
		};
		panel.days.push(day);
		openDays = [...openDays, day.id];
		save();
	}

	// The photo whose description is open in the sheet. The sheet opens with the cursor at the end of the text, ready to
	// type: the browser's own autofocus skips a field that appears after a tap on a button.
	let editing = $state<PhotoType>();
	const focusEnd: Attachment<HTMLTextAreaElement> = (node) => {
		node.focus({ preventScroll: true });
		node.setSelectionRange(node.value.length, node.value.length);
	};

	function sortEntries(index: number) {
		panel.days[index].entries.sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
		save();
	}

	// Photo files dragged in from the desktop land in the group they are dropped on (photos.ts, run 27).
	let dropping = $state('');

	function overFiles(event: DragEvent, id: string) {
		if (!hasFiles(event)) return;
		event.preventDefault();
		event.stopPropagation();
		dropping = id;
	}

	function dropFiles(event: DragEvent, group: PanelType['groups'][number]) {
		if (!hasFiles(event)) return;
		event.preventDefault();
		event.stopPropagation();
		dropping = '';
		const count = addPhotos(panel, [...(event.dataTransfer?.files ?? [])], {
			group,
			projectId: look.projectId
		});
		if (!count) return;
		if (!openGroups.includes(group.id)) openGroups = [...openGroups, group.id];
		look.say(`${count} ${count === 1 ? 'photo' : 'photos'} added`);
		save();
	}

	// From the photo's own sheet: close it, then ask, as every delete does.
	function deletePhoto(photo: PhotoType) {
		const group = panel.groups.find((item) => item.photos.some((other) => other.id === photo.id));
		const found = group?.photos.find((other) => other.id === photo.id);
		editing = undefined;
		if (group && found)
			remove(group.photos, found, 'Delete photo?', 'It leaves the group and the report.');
	}

	function addGroup() {
		const group = addPhotoGroup(panel);
		openGroups = [...openGroups, group.id];
		save();
	}

	// Photos from the library or the camera: each goes to storage on its own (photos.ts, #189).
	function pickPhotos(event: Event, group: PanelType['groups'][number]) {
		const input = event.currentTarget as HTMLInputElement;
		const files = [...(input.files ?? [])];
		input.value = '';
		if (addPhotos(panel, files, { group, projectId: look.projectId })) save();
	}

	function move<T>(list: T[], from: number, to: number) {
		const [item] = list.splice(from, 1);
		list.splice(to, 0, item);
		save();
	}

	// Run 3: borderless. Inputs are soft filled shapes that light up when you type, nothing boxed in.
	const inputClass =
		'w-full rounded-xl border-0 bg-slate-900/[0.04] px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-300 focus:bg-white focus:ring-2 focus:ring-primary/40 disabled:bg-transparent disabled:px-0 disabled:text-slate-500';
	const labelClass = 'mb-1 flex items-center gap-1 text-xs font-medium text-slate-500';
	const ghostButton =
		'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition';
</script>

<!-- A row's handle (#188): hold it, then drag, to move the row. Only a list of two or more has one. -->
{#snippet handle(key: string, count: number)}
	<span
		class="mt-2 flex size-6 shrink-0 cursor-grab items-center justify-center text-slate-300 select-none [-webkit-touch-callout:none] hover:text-slate-500 {count >
		1
			? ''
			: 'invisible'}"
		data-grip={count > 1 ? key : undefined}
		title="Hold and drag to reorder"
		aria-hidden="true"><span class="icon-[mdi--drag-vertical] size-5"></span></span
	>
{/snippet}

{#snippet fieldBlock(field: FieldType)}
	{#if field.label === 'Location'}
		<!-- Where the project is: the shared location field, which suggests places and saves the one picked. -->
		<div class="sm:col-span-2">
			<p class={labelClass}>
				{field.label}
				{#if !field.value}<span
						class="size-1.5 rounded-full bg-warning"
						title="Not filled in yet"
					></span>{/if}
			</p>
			<PlaceField
				{look}
				value={field.value}
				oninput={(text) => {
					field.value = text;
					save();
				}}
				{inputClass}
			/>
		</div>
	{:else if field.type === 'select'}
		<Picker
			label={field.label}
			options={optionsOf(field).map((option) => ({ id: option, label: option }))}
			value={field.value}
			icon="icon-[mdi--format-list-bulleted]"
			isDisabled={field.isReadonly}
			onpick={(option) => pickField(field, option)}
			onadd={field.isAddable ? () => askField(field) : undefined}
		/>
	{:else}
		<label
			class="block {field.type === 'textarea' || field.type === 'image' ? 'sm:col-span-2' : ''}"
		>
			<span class={labelClass}>
				{field.label}
				{#if !field.value && !field.isReadonly}<span
						class="size-1.5 rounded-full bg-warning"
						title="Not filled in yet"
					></span>{/if}
			</span>
			{#if field.type === 'textarea'}
				<textarea
					class="{inputClass} min-h-20 resize-y"
					bind:value={field.value}
					disabled={field.isReadonly}
					placeholder="Type here"></textarea>
			{:else if field.type === 'image'}
				<span class="flex items-center gap-3">
					<span
						class="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-900/[0.04]"
					>
						{#if field.value}
							<img
								src={field.value}
								alt=""
								class="size-full object-cover"
							/>
						{:else}
							<span class="icon-[mdi--image-plus-outline] size-7 text-slate-300"></span>
						{/if}
					</span>
					{#if !field.isReadonly}
						<span
							class="{ghostButton} cursor-pointer bg-slate-100 text-slate-700 hover:bg-slate-200"
						>
							<span class="icon-[mdi--upload] size-4"></span>{field.value ? 'Replace' : 'Upload'}
							<input
								type="file"
								accept="image/*"
								class="sr-only"
								onchange={(event) => setImage(field, event)}
							/>
						</span>
					{/if}
				</span>
			{:else if field.type === 'file'}
				<span class="flex items-center gap-2">
					<span class="{inputClass} flex items-center gap-2 truncate">
						<span class="icon-[mdi--file-document-outline] size-4 shrink-0 text-slate-400"></span>
						<span class="truncate {field.value ? '' : 'text-slate-300'}"
							>{field.value || 'No file yet'}</span
						>
					</span>
					<span
						class="{ghostButton} shrink-0 cursor-pointer bg-slate-100 text-slate-700 hover:bg-slate-200"
					>
						<span class="icon-[mdi--paperclip] size-4"></span>Add
						<input
							type="file"
							class="sr-only"
							onchange={(event) => setImage(field, event)}
						/>
					</span>
				</span>
			{:else}
				<input
					class={inputClass}
					type={field.type}
					bind:value={field.value}
					disabled={field.isReadonly}
					placeholder="Type here"
				/>
			{/if}
		</label>
	{/if}
{/snippet}

<!-- The organization's own people on the project: who they work for, one team lead, and whoever else is assigned.
     Under it, a section for each other company with people on the job. -->
{#snippet teamBlock()}
	<Group
		title="Organization"
		note={[panel.owner, ...panel.assigned].filter(Boolean).join(', ') || 'Pick the team lead first'}
		icon={PAGE_ICONS.team}
		isOpen={openSections.includes('team')}
		ontoggle={() => (openSections = toggle(openSections, 'team'))}
	>
		<Picker
			label="Organization"
			icon="icon-[mdi--domain]"
			options={[
				{
					id: look.organization.name,
					label: look.organization.name,
					image: look.organization.logo
				}
			]}
			value={fieldOf('Organization')?.value ?? ''}
			onpick={(id) => setField('Organization', id)}
		/>
		<Picker
			label="Team Lead"
			kind="person"
			icon="icon-[mdi--account-tie]"
			options={members}
			value={panel.owner}
			onpick={setLead}
		/>
		<Picker
			label="Team Assigned"
			kind="person"
			icon={PAGE_ICONS.team}
			options={members.filter((member) => member.id !== panel.owner)}
			values={panel.assigned}
			onpick={assign}
		/>
	</Group>
	{#each personnel as company, companyIndex (company.id)}
		{@const named = company.people.filter((person) => person.name.trim())}
		<Group
			title={company.company || `Personnel ${companyIndex + 1}`}
			note={named.map((person) => person.name).join(', ') || 'No one added yet'}
			icon="icon-[mdi--account-multiple-outline]"
			tone="bg-slate-900/[0.06] text-slate-600"
			isOpen={openSections.includes(company.id)}
			ontoggle={() => (openSections = toggle(openSections, company.id))}
			ondelete={() =>
				remove(panel.personnel ?? [], company, 'Delete Personnel?', 'Its people leave the report.')}
		>
			<label class="block">
				<span class={labelClass}>Company {@render unpicked(!company.company)}</span>
				<!-- Typed freely, with the customers offered as it is typed: both a dropdown and an input. -->
				<input
					class={inputClass}
					bind:value={company.company}
					list="companies-{company.id}"
					placeholder="Type a company, or pick a customer"
				/>
				<datalist id="companies-{company.id}">
					{#each look.customers as name (name)}<option value={name}></option>{/each}
				</datalist>
			</label>
			{#each company.people as person, personIndex (person.id)}
				<div class="flex items-start gap-2">
					<div class="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
						<input
							class={inputClass}
							bind:value={person.name}
							placeholder="Name"
							aria-label="Name of person {personIndex + 1}"
						/>
						<input
							class={inputClass}
							bind:value={person.title}
							placeholder="Title"
							aria-label="Title of person {personIndex + 1}"
						/>
					</div>
					<button
						type="button"
						class="mt-2 flex size-7 shrink-0 items-center justify-center rounded-full text-slate-300 hover:bg-slate-100 hover:text-danger"
						aria-label="Delete person {personIndex + 1}"
						onclick={() =>
							remove(company.people, person, 'Delete person?', 'They leave the report.')}
						><span class="icon-[mdi--close] size-4"></span></button
					>
				</div>
			{/each}
			{#snippet actions()}
				<button
					type="button"
					class="{ghostButton} bg-primary/10 text-primary hover:bg-primary/15"
					onclick={() => {
						company.people.push(newPerson());
						save();
					}}><span class="icon-[mdi--plus] size-4"></span>Add person</button
				>
			{/snippet}
		</Group>
	{/each}
	<button
		type="button"
		class="{ghostButton} bg-slate-900 text-white hover:bg-slate-700"
		onclick={addPersonnel}
		><span class="icon-[mdi--account-multiple-plus-outline] size-4"></span>Add Personnel</button
	>
{/snippet}

{#snippet unpicked(isShown: boolean)}
	{#if isShown}<span
			class="size-1.5 rounded-full bg-warning"
			title="Not picked yet"
		></span>{/if}
{/snippet}

<fieldset
	disabled={!panel.isEnabled || (!isDraft && look.isFrozen)}
	class="min-w-0 space-y-3"
	oninput={() => save()}
>
	{#if panel.kind === 'project'}
		{@const title = fieldOf('Title')}
		{@const subtitle = fieldOf('Subtitle')}
		{@const contact = contacts.find((item) => item.id === panel.contact) ?? contacts[0]}
		<div class="space-y-3">
			<Group
				title="Project"
				note={[title?.value, fieldOf('Project Type')?.value].filter(Boolean).join(' · ') ||
					'Title, subtitle and type'}
				icon={PAGE_ICONS.projects}
				isOpen={openSections.includes('project')}
				ontoggle={() => (openSections = toggle(openSections, 'project'))}
			>
				{#if title}{@render fieldBlock(title)}{/if}
				{#if subtitle}{@render fieldBlock(subtitle)}{/if}
				<Picker
					label="Project Type"
					icon="icon-[mdi--package-variant-closed]"
					options={PROJECT_TYPES.map((type) => ({ id: type, label: type }))}
					value={fieldOf('Project Type')?.value ?? ''}
					onpick={(id) => setField('Project Type', id)}
				/>
			</Group>
			<Group
				title="Customer"
				note={[customerName, contact?.name].filter(Boolean).join(' · ') ||
					'Pick who the project is for'}
				icon={PAGE_ICONS.customers}
				isOpen={openSections.includes('customer')}
				ontoggle={() => (openSections = toggle(openSections, 'customer'))}
			>
				<Picker
					label="Customer"
					kind="customer"
					icon={PAGE_ICONS.customers}
					options={look.customers.map((name) => ({ id: name, label: name }))}
					value={customerName}
					onpick={setCustomer}
					onadd={() => look.addFor('customers', {}, setCustomer)}
					onedit={(name) => look.editRecord('customers', name)}
				/>
				<!-- Which of the customer's contacts the report is for; a customer with none has nothing to pick. -->
				<Picker
					label="Contact"
					icon="icon-[mdi--account]"
					options={contacts.map((item) => ({
						id: item.id,
						label: item.name,
						note: item.title,
						image: item.photo
					}))}
					value={contact?.id ?? ''}
					placeholder={customerName
						? 'No contacts on this customer yet'
						: 'Choose a customer first'}
					isDisabled={!contacts.length}
					isRequired={false}
					onpick={(id) => {
						panel.contact = id;
						save();
					}}
				/>
			</Group>
			{@render teamBlock()}
		</div>
	{:else if panel.kind === 'transport'}
		<TransportLegs
			{look}
			{panel}
			onsave={save}
		/>
	{:else if panel.kind === 'items'}
		<!-- Rows copied from a spreadsheet can be pasted into any of these fields: each line becomes an item. -->
		<div
			class="space-y-3"
			onpaste={pasteItems}
			{@attach sortable(`items-${panel.id}`, (from, to) => move(panel.items, from, to))}
		>
			{#if panel.items.length}
				<p class="flex gap-2 text-xs font-medium text-slate-500">
					<span class="w-6 shrink-0"></span><span class="w-20 shrink-0 pl-1">Quantity</span><span
						>Description</span
					>
				</p>
			{/if}
			{#each panel.items as item, itemIndex (item.id)}
				<div
					class="flex items-start gap-2"
					data-sort="items-{panel.id}"
					data-index={itemIndex}
					animate:flip={{ duration: 200 }}
				>
					{@render handle(`items-${panel.id}`, panel.items.length)}
					<input
						class="{inputClass} w-20! shrink-0 text-center tabular-nums"
						inputmode="numeric"
						bind:value={item.quantity}
						placeholder="Qty"
						aria-label="Quantity of item {itemIndex + 1}"
					/>
					<input
						class={inputClass}
						bind:value={item.description}
						placeholder="What it is, e.g. Accessory crates"
						aria-label="Description of item {itemIndex + 1}"
					/>
					<button
						type="button"
						class="mt-2 flex size-7 shrink-0 items-center justify-center rounded-full text-slate-300 hover:bg-slate-100 hover:text-danger"
						aria-label="Delete item {itemIndex + 1}"
						onclick={() =>
							remove(
								panel.items,
								item,
								'Delete item?',
								item.description
									? `"${item.description}" leaves the cargo description.`
									: 'It leaves the cargo description.'
							)}><span class="icon-[mdi--close] size-4"></span></button
					>
				</div>
			{:else}
				<p class="py-2 text-center text-sm text-slate-400">No items yet. Add the first one.</p>
			{/each}
			<button
				type="button"
				class="{ghostButton} bg-slate-900 text-white hover:bg-slate-700"
				onclick={() => {
					panel.items.push(itemOf());
					save();
				}}><span class="icon-[mdi--plus] size-4"></span>Add item</button
			>
		</div>
		<p class="flex items-start gap-1.5 text-xs text-slate-400">
			<span class="mt-px icon-[mdi--content-paste] size-4 shrink-0"></span>
			Copy rows in a spreadsheet and paste them into any field above. Or attach the list itself:
		</p>
		{#if panel.attachments?.length || sending.length}
			<div class="flex flex-wrap gap-2">
				{#each panel.attachments ?? [] as file (file.id)}
					<span
						class="relative flex items-center gap-2 overflow-hidden rounded-xl bg-slate-900/[0.04] text-xs text-slate-700 {file.kind ===
						'photo'
							? 'size-20'
							: 'py-2 pr-8 pl-3'}"
					>
						{#if file.kind === 'photo'}
							<img
								src={file.src}
								alt={file.name}
								class="size-full object-cover"
							/>
						{:else}
							<span class="icon-[mdi--file-table-outline] size-4 shrink-0 text-primary"></span>
							<a
								href={file.src || undefined}
								target="_blank"
								rel="noopener"
								class="max-w-40 truncate hover:underline">{file.name}</a
							>
						{/if}
						<button
							type="button"
							class="absolute top-0.5 right-0.5 flex size-6 items-center justify-center rounded-full {file.kind ===
							'photo'
								? 'bg-slate-950/50 text-white'
								: 'text-slate-400 hover:text-danger'}"
							aria-label="Remove {file.name}"
							onclick={() =>
								remove(
									panel.attachments ?? [],
									file,
									`Remove ${file.name}?`,
									'It leaves the cargo description.'
								)}><span class="icon-[mdi--close] size-4"></span></button
						>
					</span>
				{/each}
				<!-- On their way to storage: each shows in place with its mark; a failed one says so, with Retry. -->
				{#each sending as file (file.id)}
					<span
						class="relative flex items-center gap-2 overflow-hidden rounded-xl bg-slate-900/[0.04] text-xs text-slate-700 {file.kind ===
						'photo'
							? 'size-20'
							: 'py-2 pr-8 pl-3'}"
						aria-busy={file.upload.isUploading}
					>
						{#if file.kind === 'photo'}
							<img
								src={file.upload.preview}
								alt={file.name}
								class="size-full object-cover opacity-60"
							/>
						{:else}
							<span class="icon-[mdi--file-table-outline] size-4 shrink-0 text-primary"></span>
							<span class="max-w-40 truncate">{file.name}</span>
						{/if}
						{#if file.upload.isFailed}
							<button
								type="button"
								class="absolute inset-x-0 bottom-0 bg-danger px-1 py-0.5 text-[10px] font-semibold text-white"
								title={file.upload.reason}
								onclick={() => file.upload.retry()}>Not uploaded · Retry</button
							>
							<button
								type="button"
								class="absolute top-0.5 right-0.5 flex size-6 items-center justify-center rounded-full bg-slate-950/50 text-white"
								aria-label="Remove {file.name}"
								onclick={() => (sending = sending.filter((other) => other.id !== file.id))}
								><span class="icon-[mdi--close] size-4"></span></button
							>
						{:else}
							<span
								class="absolute top-1 right-1 icon-[mdi--loading] size-4 animate-spin text-primary"
								aria-label="Uploading"
							></span>
						{/if}
					</span>
				{/each}
			</div>
		{/if}
		<div class="flex flex-wrap gap-2">
			<label class="{ghostButton} cursor-pointer bg-primary/10 text-primary hover:bg-primary/15">
				<span class="icon-[mdi--camera-outline] size-4"></span>Attach a photo
				<input
					type="file"
					accept="image/*"
					multiple
					class="sr-only"
					onchange={(event) => attach(event, 'photo')}
				/>
			</label>
			<label class="{ghostButton} cursor-pointer bg-primary/10 text-primary hover:bg-primary/15">
				<span class="icon-[mdi--file-table-outline] size-4"></span>Attach a spreadsheet
				<input
					type="file"
					accept=".xlsx,.xls,.csv,.pdf"
					multiple
					class="sr-only"
					onchange={(event) => attach(event, 'file')}
				/>
			</label>
		</div>
	{:else if panel.kind === 'timelog'}
		<div
			class="space-y-3"
			{@attach sortable(`days-${panel.id}`, (from, to) => move(panel.days, from, to))}
		>
			{#each panel.days as day, dayIndex (day.id)}
				<div animate:flip={{ duration: 200 }}>
					<Group
						sortKey={panel.days.length > 1 ? `days-${panel.id}` : ''}
						index={dayIndex}
						title="Day {dayIndex + 1}"
						note="{day.entries.length} {day.entries.length === 1 ? 'entry' : 'entries'}"
						meta={day.date || 'No date'}
						icon="icon-[mdi--calendar-blank-outline]"
						isOpen={openDays.includes(day.id)}
						ontoggle={() => (openDays = toggle(openDays, day.id))}
						ondelete={() =>
							remove(
								panel.days,
								day,
								'Delete day?',
								`Its ${day.entries.length} time log entries go with it.`
							)}
					>
						<label class="block">
							<span class={labelClass}>Date</span>
							<input
								class={inputClass}
								type="date"
								bind:value={day.date}
							/>
						</label>
						<div
							class="space-y-3"
							{@attach sortable(`entries-${day.id}`, (from, to) => move(day.entries, from, to))}
						>
							{#each day.entries as entry, entryIndex (entry.id)}
								<div
									class="flex items-start gap-2"
									data-sort="entries-{day.id}"
									data-index={entryIndex}
									animate:flip={{ duration: 200 }}
								>
									{@render handle(`entries-${day.id}`, day.entries.length)}
									<input
										class="{inputClass} w-20! shrink-0 text-center tabular-nums"
										inputmode="numeric"
										maxlength="5"
										placeholder="07:30"
										value={entry.time}
										onchange={(event) => {
											entry.time = clockOf(event.currentTarget.value);
											event.currentTarget.value = entry.time;
											sortEntries(dayIndex);
										}}
										aria-label="Time, on the 24-hour clock"
									/>
									<input
										class={inputClass}
										bind:value={entry.activity}
										placeholder="What happened"
										aria-label="Activity"
									/>
									<button
										type="button"
										class="mt-2 flex size-7 shrink-0 items-center justify-center rounded-full text-slate-300 hover:bg-slate-100 hover:text-danger"
										aria-label="Delete entry"
										onclick={() =>
											remove(
												day.entries,
												entry,
												'Delete entry?',
												entry.activity
													? `"${entry.activity}" leaves the time log.`
													: 'It leaves the time log.'
											)}><span class="icon-[mdi--close] size-4"></span></button
									>
								</div>
							{/each}
						</div>
						{#snippet actions()}
							<button
								type="button"
								class="{ghostButton} bg-primary/10 text-primary hover:bg-primary/15"
								onclick={() => {
									day.entries.push({ id: crypto.randomUUID(), time: '', activity: '' });
									save();
								}}><span class="icon-[mdi--plus] size-4"></span>Add entry</button
							>
						{/snippet}
					</Group>
				</div>
			{:else}
				<p class="py-2 text-center text-sm text-slate-400">No days yet. Add the first one.</p>
			{/each}
		</div>
		<div class="flex flex-wrap gap-2">
			<button
				type="button"
				class="{ghostButton} bg-slate-900 text-white hover:bg-slate-700"
				onclick={addDay}><span class="icon-[mdi--calendar-plus] size-4"></span>Add day</button
			>
		</div>
	{:else}
		<div
			class="space-y-3"
			{@attach sortable(`groups-${panel.id}`, (from, to) => move(panel.groups, from, to))}
		>
			{#each panel.groups as group, groupIndex (group.id)}
				<div
					class="rounded-2xl transition {dropping === group.id ? 'ring-2 ring-primary' : ''}"
					role="group"
					aria-label={group.title || 'Photo group'}
					animate:flip={{ duration: 200 }}
					ondragover={(event) => overFiles(event, group.id)}
					ondragleave={() => (dropping = '')}
					ondrop={(event) => dropFiles(event, group)}
				>
					<Group
						title={group.title || 'Untitled group'}
						meta="{group.photos.length} photos"
						icon="icon-[mdi--image-multiple-outline]"
						isOpen={openGroups.includes(group.id)}
						ontoggle={() => (openGroups = toggle(openGroups, group.id))}
						ondelete={() =>
							remove(
								panel.groups,
								group,
								'Delete group?',
								`Its ${group.photos.length} photos leave the report.`
							)}
						sortKey="groups-{panel.id}"
						index={groupIndex}
					>
						<label class="block">
							<span class={labelClass}>Title</span>
							<input
								class={inputClass}
								bind:value={group.title}
								placeholder="e.g. Hatch 2 before discharge"
							/>
						</label>
						<label class="block">
							<span class={labelClass}>Description</span>
							<textarea
								class="{inputClass} min-h-16"
								bind:value={group.description}
								placeholder="Optional"></textarea>
						</label>
						<div>
							<p class={labelClass}>Photos per page</p>
							<div class="flex gap-1.5">
								{#each LAYOUTS as layout (layout)}
									<button
										type="button"
										class="flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold transition {group.layout ===
										layout
											? 'bg-primary text-white shadow-md shadow-primary/25'
											: 'bg-white text-slate-500 hover:text-primary'}"
										onclick={() => {
											group.layout = layout;
											save();
										}}
									>
										<!-- The page in miniature: one column for one or two, two columns from four up. -->
										<span
											class="grid h-4 w-3 gap-px {layout <= 2 ? 'grid-cols-1' : 'grid-cols-2'}"
											style="grid-template-rows: repeat({layout <= 2 ? layout : layout / 2}, 1fr)"
											aria-hidden="true"
										>
											{#each Array.from({ length: layout }, (_, at) => at) as cell (cell)}
												<span class="rounded-[1px] bg-current"></span>
											{/each}
										</span>{layout}
									</button>
								{/each}
							</div>
						</div>
						<div
							class="grid grid-cols-3 gap-2"
							{@attach sortable(`photos-${group.id}`, (from, to) => move(group.photos, from, to))}
						>
							{#each group.photos as photo, photoIndex (photo.id)}
								{@const upload = uploadOf(photo)}
								<div
									class="relative aspect-square rounded-xl transition {upload?.isFailed
										? 'ring-2 ring-danger'
										: ''}"
									data-sort="photos-{group.id}"
									data-index={photoIndex}
									animate:flip={{ duration: 200 }}
								>
									<button
										type="button"
										class="relative block size-full overflow-hidden rounded-xl bg-slate-100 select-none [-webkit-touch-callout:none]"
										aria-label="Describe photo {photoIndex + 1}"
										data-grip="photos-{group.id}"
										onclick={() => (editing = photo)}
									>
										<img
											src={photo.src}
											alt={photo.description}
											class="pointer-events-none size-full object-cover {upload
												? 'opacity-60'
												: ''}"
											draggable="false"
										/>
										<!-- A soft shade in the corner, so the white ⋮ reads on a pale photo too (run 19). -->
										<span
											class="pointer-events-none absolute top-0 right-0 size-12 bg-[radial-gradient(circle_at_top_right,rgb(0_0_0/0.45),transparent_70%)]"
										></span>
										{#if photo.description}
											<span
												class="absolute bottom-1 left-1 icon-[mdi--text-box] size-5 text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.7)]"
												title="Has a description"
											></span>
										{/if}
									</button>
									<!-- #189: on its way to storage, a small mark; a failed upload says so and retries in place. -->
									{#if upload?.isUploading}
										<span
											class="pointer-events-none absolute bottom-1 left-1 flex size-6 items-center justify-center rounded-full bg-white shadow"
											role="status"
											aria-label="Uploading photo {photoIndex + 1}"
											><span class="icon-[svg-spinners--ring-resize] size-4 text-primary"
											></span></span
										>
									{:else if upload?.isFailed}
										<button
											type="button"
											class="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 rounded-lg bg-danger px-1.5 py-1 text-[11px] font-semibold text-white shadow"
											aria-label="Not uploaded. Retry photo {photoIndex + 1}"
											title={upload.reason}
											data-no-drag
											onclick={() => upload.retry()}
											><span class="icon-[mdi--alert] size-3.5"></span>Retry</button
										>
									{/if}
									<div
										class="absolute top-1 right-1"
										data-no-drag
									>
										<Menu
											label="More for photo {photoIndex + 1}"
											value=""
											align={photoIndex % 3 === 0 ? 'left' : 'right'}
											options={[
												{
													id: 'describe',
													label: 'Edit description',
													icon: 'icon-[mdi--pencil-outline]'
												},
												{
													id: 'delete',
													label: 'Delete',
													icon: 'icon-[mdi--trash-can-outline]',
													isDanger: true
												}
											]}
											onpick={(id) =>
												id === 'describe'
													? (editing = photo)
													: remove(
															group.photos,
															photo,
															'Delete photo?',
															'It leaves the group and the report.'
														)}
										>
											{#snippet trigger()}
												<span class="flex size-7 items-center justify-center text-white"
													><span
														class="icon-[mdi--dots-vertical] size-6 drop-shadow-[0_1px_2px_rgb(0_0_0/0.7)]"
													></span></span
												>
											{/snippet}
										</Menu>
									</div>
								</div>
							{/each}
							<label
								class="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl bg-primary/[0.06] text-primary/70 transition hover:bg-primary/10 hover:text-primary"
							>
								<span class="icon-[mdi--image-plus-outline] size-6"></span>
								<span class="text-[11px] font-medium">Upload</span>
								<input
									type="file"
									accept="image/*"
									multiple
									class="sr-only"
									onchange={(event) => pickPhotos(event, group)}
								/>
							</label>
							<label
								class="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl bg-primary/[0.06] text-primary/70 transition hover:bg-primary/10 hover:text-primary"
							>
								<span class="icon-[mdi--camera-outline] size-6"></span>
								<span class="text-[11px] font-medium">Camera</span>
								<input
									type="file"
									accept="image/*"
									capture="environment"
									class="sr-only"
									onchange={(event) => pickPhotos(event, group)}
								/>
							</label>
						</div>
					</Group>
				</div>
			{:else}
				<div
					class="flex flex-col items-center gap-1 rounded-2xl bg-slate-900/[0.03] py-6 text-slate-400"
				>
					<span class="icon-[mdi--image-filter-hdr] size-8"></span>
					<p class="text-sm">No photo groups yet.</p>
				</div>
			{/each}
		</div>
		<button
			type="button"
			class="{ghostButton} bg-slate-900 text-white hover:bg-slate-700"
			onclick={addGroup}><span class="icon-[mdi--plus] size-4"></span>Add group</button
		>
	{/if}
</fieldset>

{#if asking}
	{@const noun = asking.label}
	<BottomSheet
		label="Add a new {noun}"
		onclose={() => (asking = undefined)}
	>
		<form
			onsubmit={(event) => {
				event.preventDefault();
				add();
			}}
		>
			<b class="block text-lg text-slate-900">New {noun}</b>
			<p class="text-sm text-slate-500">
				Added here and to the {asking.kinds ? 'Facilities' : noun} list, without leaving the project.
			</p>
			<label class="mt-4 block">
				<span class={labelClass}>Name</span>
				<!-- svelte-ignore a11y_autofocus -->
				<input
					class={inputClass}
					bind:value={draft}
					placeholder="{asking.label} name"
					autofocus
				/>
			</label>
			{#if asking.kinds}
				<p class="{labelClass} mt-3">Facility Kind</p>
				<div class="grid grid-cols-2 gap-1.5">
					{#each asking.kinds as kind (kind)}
						<button
							type="button"
							class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition {draftKind ===
							kind
								? 'bg-primary text-white shadow-md shadow-primary/25'
								: 'bg-slate-900/[0.04] text-slate-600 hover:bg-primary/10'}"
							aria-pressed={draftKind === kind}
							onclick={() => (draftKind = kind)}
							><span class="{FACILITY_ICONS[kind]} size-[18px]"></span>{kind}</button
						>
					{/each}
				</div>
			{/if}
			<button
				class="mt-5 w-full rounded-full bg-primary py-3 text-sm font-semibold text-white disabled:opacity-40"
				disabled={!draft.trim()}>Add {noun}</button
			>
		</form>
	</BottomSheet>
{/if}

{#if editing}
	{@const photo = editing}
	<BottomSheet
		label="Describe this photo"
		onclose={() => (editing = undefined)}
	>
		<form
			onsubmit={(event) => {
				event.preventDefault();
				editing = undefined;
			}}
		>
			<div class="flex items-center gap-3">
				<img
					src={photo.src}
					alt=""
					class="size-16 shrink-0 rounded-xl object-cover"
				/>
				<div>
					<b class="block text-lg text-slate-900">Photo description</b>
					<p class="text-sm text-slate-500">Shows on this photo in the report.</p>
				</div>
			</div>
			<label class="mt-4 block">
				<span class={labelClass}>Description</span>
				<textarea
					class="{inputClass} min-h-20"
					bind:value={photo.description}
					oninput={() => save()}
					placeholder="e.g. Lashing on the forward stack, seen from the quay"
					{@attach focusEnd}></textarea>
			</label>
			<button class="mt-5 w-full rounded-full bg-primary py-3 text-sm font-semibold text-white"
				>Done</button
			>
			<button
				type="button"
				class="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full py-3 text-sm font-semibold text-danger transition hover:bg-danger/10"
				onclick={() => deletePhoto(photo)}
				><span class="icon-[mdi--trash-can-outline] size-[18px]"></span>Delete</button
			>
		</form>
	</BottomSheet>
{/if}
