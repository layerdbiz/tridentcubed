<script lang="ts">
	// PROTOTYPE (#161): the inputs inside one panel, by kind: project, transport, items, time log or photo groups.
	// Everything is live: typing moves the panel's count, its bar, the project's bar and the preview. The Project panel is
	// its fields with the Team after Customer; its drop-downs offer "Add new" (note 26), the + sheet. The Transport panel
	// (Justin, 2026-10-25) is the trip, one stop per place in trip order: its point (Start, Stop, End, each with its
	// colour), Transport type, Transport mode, the transport from the organization's list, and the facility, whose list
	// puts the kind that suits the transport type first. Stops, photo groups and time log days are the same Group, with
	// Delete at the far right of its bottom row (run 8 note 10); every delete asks first. Each photo has its own
	// description: tap it, or Edit description in its ⋮ (notes 12 and 14). V1 (#180) took out the sample day and the
	// sample photo, the last buttons that wrote made-up data. #312: a tap opens the photo in its pop-up
	// (photo-popup.svelte) to swipe through its group, crop it and describe it; its ⋮ opens it cropping or typing, or
	// deletes it. A photo's tile shows its crop.
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
	// pick in them is the library's Select (#298, once picker.svelte), so a person is always the app's own Avatar and a
	// company its logo. Add Personnel adds a company's section: its name, then as many people from it as needed, each a
	// name and a title.
	// #217 (Justin, 2026-11-18): the Project section ends with the two parts of the project number a User may type,
	// side by side: Project Creation Date (today on a new project) and Job Sequence Number (the server's next for
	// that customer and day, until one is typed). The Customer section takes the customer's own number for the job,
	// the Customer Reference Number, labelled Reference Number (#225).
	// #57 (Justin, 2026-11-24): the Project panel is the first moved onto the library's inputs (Input, Textarea,
	// Select), in the look picked on the inputs prototype (#284): the label on the border, its ? once the label sits
	// there, the app's values (the Description's sentence, the next Job Number) a Generated value in bright blue with a
	// reset once typed over, a Select's pick as its picture. Under the Job Number, the whole project number the two
	// make, as a Generated value line (#300; hidden from 2026-11-18, #225). What it saves, and when, is unchanged.
	// #215 (Justin, 2026-11-18): a photo panel opens on its own title, filled in and editable, so Operations or an
	// added panel can be called what the job calls it; the report and its contents print that title. Its groups
	// (the Operations panel's stages) each have a switch that leaves them out of the report.
	// #229 (Justin, 2026-11-18): what a section counts is not written here beside its inputs any more. Every
	// section's line reads tally.ts (`counted`), the same list its panel's line and percent come from. An input
	// added to a section is added to that list.
	// #305: an entry of the list of what keeps a percent under 100% opens its input: its panel opens
	// (LookState.openInput), then its section here, and the focus goes to the input (focus.ts finds it by its section,
	// label and place among the inputs with that label, as tally.ts lists them).
	import { untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import {
		Avatar,
		Generated,
		Help,
		initialsOf,
		Input,
		Menu,
		Select,
		Textarea,
		toInitialsPicture
	} from '@layerd/ui';
	import Photo from '#lib/components/photo/photo.svelte';
	import Group from './group.svelte';
	import { faceOf, logoOf } from './marks';
	import TransportLegs from './variants/transport-legs.svelte';
	import {
		ATTACHMENT_ICONS,
		ATTACHMENT_NAMES,
		ATTACHMENT_NOUNS,
		toPictureType,
		toTypeLabel
	} from '#lib/files/files.schema.js';
	import { fileDetailsOf, startUpload, type Upload } from '#lib/files/files.state.svelte.js';
	import { DEFAULT_LAYOUT, LAYOUTS, type PageLayoutType } from '#lib/report/report.constants.js';
	import { GRID_LIMIT, INTRODUCTION_LIMIT } from '#lib/rows/rows.schema.js';
	import { pageCountOf } from '#lib/pdf/pdf.state.svelte.js';
	import ImageField from './image-field.svelte';
	import { generatedOf, INTRODUCTION_LABEL } from './introduction';
	import ItemBox from './item-box.svelte';
	import ItemTable from './item-table.svelte';
	import {
		attach,
		createdDayOf,
		createId,
		dropUntyped,
		groupWordOf,
		isPdfAttachment,
		itemOf,
		newPerson,
		newPersonnel,
		nextJobOf,
		PAGE_ICONS,
		panelNameOf,
		PROJECT_TYPES,
		projectNumberOf,
		todayIso,
		type AttachmentType,
		type PanelType,
		type PhotoType
	} from './look.data';
	import type { LookState } from './look.state.svelte';
	import PhotoPopup, { type PopupModeType } from './photo-popup.svelte';
	import { LINK_LABEL, linkNameOf, toLink } from './link';
	import {
		addGroup as addPhotoGroup,
		addPhotos,
		ATTACHMENT_ACCEPT,
		countLabelOf,
		filesLabelOf,
		hasFiles,
		movePhoto,
		uploadOf
	} from './photos';
	import { toLengthLabel } from '#lib/video/video.utils.js';
	import { createPhotoToast } from './toasts';
	import { contactsOf } from './records.data';
	import { stageNumbersOf } from './report-flow';
	import { SAMPLE_LIST, toSampleDay, toSamplePhotos } from './samples';
	import { sortable } from './sortable';
	import { readFile, readText, toGrid, toSaved, toTable, type SkippedType } from './spreadsheet';
	import { MARKED_LABELS, sectionsOf, valuesOf } from './tally';
	import { focusInput, inputIn } from './focus';

	// Words people type in sentences keep the phone's own help: a capital to start, autocorrect and spelling. The
	// library's inputs switch all three off, which suits codes and addresses but not names, titles and descriptions.
	const TYPING = { autocapitalize: 'sentences', autocorrect: 'on', spellcheck: true } as const;

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

	// The Operations panel's link to the project's files (#233), as an address to open; none until it is one. Its
	// label names its field by an id of this panel body's own: a panel is drawn twice, for the phone and the desk.
	const link = $derived(toLink(panel.link));
	const uid = $props.id();

	// The Project panel's sections, open or folded: Project, Customer, Team, and one per company of personnel.
	// Only the first section starts open (Justin, 2026-11-16: all three open at once was too much).
	let openSections = $state<string[]>(['project']);
	const personnel = $derived(panel.personnel ?? []);
	const members = $derived(
		look.members.map((member) => ({ value: member.name, label: member.name }))
	);

	function fieldOf(label: string) {
		return panel.fields.find((field) => field.label === label);
	}

	function setField(label: string, value: string) {
		const field = fieldOf(label);
		if (field) field.value = value;
		save();
	}

	// The report's opening sentence (#244). The field shows the sentence worked out from the project's records
	// (introduction.ts), a Generated value, until someone rewords it. Only a rewording is kept: the worked-out sentence
	// left as it is, or the field cleared, keeps nothing, so the sentence goes on following the records. A project
	// not made yet has only this panel to read.
	const generated = $derived(
		isDraft
			? generatedOf({
					organization: look.organization,
					project: { location: '', day: panel.day, created: todayIso() },
					panels: [panel]
				})
			: generatedOf(look)
	);
	// The Operations panel's stages wear their number in place of an icon (Justin, 2026-11-19), by the order they
	// are in, so dragging one to another place renumbers them. Any other photo panel's groups keep the icon.
	const stageNumbers = $derived(panel.key === 'operations' ? stageNumbersOf(panel.groups) : []);

	// Someone's own words stay as typed whatever the panels come to hold. The field keeps what is typed while it is
	// in use, so a cleared one stays clear until it is left, and its reset empties it (library Textarea).
	function setIntroduction(text: string) {
		const typed = text.trim();
		panel.introduction = typed === generated ? '' : typed && text;
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

	// The item list read from a spreadsheet (#242): its cells are kept as read (`panel.grid`), and this is the table
	// they print as, the same one the report draws.
	const table = $derived(panel.grid ? toTable(panel.grid) : undefined);
	// What the last list left out, said under it once: blank rows and blank columns are not kept.
	let skipped = $state<SkippedType>();

	// Rows of cells become the panel's item list, in place of the one before. A row to type into that was never
	// typed in goes, so the panel does not count an empty input beside a full list.
	function takeRows(name: string, rows: unknown[][]) {
		const kept = toGrid(name, rows);
		if (!kept) {
			look.say(name ? `No rows found in ${name}` : 'No rows found in what was pasted');
			return true;
		}
		if (toSaved(kept.grid).length > GRID_LIMIT) return false;
		panel.grid = kept.grid;
		skipped = kept.skipped.rows || kept.skipped.columns ? kept.skipped : undefined;
		dropUntyped(panel.items);
		save();
		const count = toTable(kept.grid).rows.length;
		look.say(`${count} ${count === 1 ? 'item' : 'items'} added as a table`);
		return true;
	}

	// Rows pasted from a spreadsheet, into the box or into any field of the panel.
	function takeText(text: string) {
		if (!text.trim()) return look.say('Nothing to paste. Copy the rows in the spreadsheet first.');
		const rows = readText(text);
		if (!rows) return look.say('That is a single cell. Copy the whole table, then paste.');
		if (!takeRows('', rows)) look.say('That list is too long to paste. Choose its file instead.');
	}

	// A single pasted word goes into the field as usual; rows become the table.
	function pasteRows(event: ClipboardEvent) {
		const text = event.clipboardData?.getData('text/plain') ?? '';
		if (!/[\t\n]/.test(text.trim())) return;
		event.preventDefault();
		takeText(text);
	}

	// Files dropped on the box or chosen with its button, one after the other: a photo is attached and prints
	// whole; a spreadsheet becomes the table; any other file, or a spreadsheet that cannot be read as a table, is
	// attached as the file it is, so nothing handed over is ever turned away.
	async function takeFiles(files: File[]) {
		for (const file of files) {
			// By its name too: a HEIC dropped on Windows can come with no type (#294).
			if (toPictureType(file).startsWith('image/')) {
				send(file, 'photo');
				continue;
			}
			let rows: string[][] | undefined;
			try {
				rows = await readFile(file);
			} catch {
				look.say(`${file.name} could not be read as a table, so it is attached as a file`);
			}
			if (!rows) send(file, 'file');
			else if (!takeRows(file.name, rows)) {
				send(file, 'file');
				look.say(`${file.name} is too long for a table, so it is attached as a file`);
			}
		}
	}

	function addSampleList() {
		takeRows('Sample data', SAMPLE_LIST);
	}

	function removeList() {
		look.confirm({
			title: 'Remove the list?',
			note: 'Its table leaves the cargo description.',
			onyes: () => {
				panel.grid = undefined;
				skipped = undefined;
				save();
			}
		});
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

	const customerName = $derived(
		panel.fields.find((field) => field.label === 'Customer')?.value ?? ''
	);
	const contacts = $derived(contactsOf(look, customerName));

	// What each section's line counts: the inputs tally.ts says it holds, by the section's id.
	const sections = $derived(sectionsOf(panel, contacts));
	function counted(id: string) {
		return valuesOf(sections, id);
	}

	// The two inputs of the project number (#217). A project not made yet has no J count of its own, so the one it
	// will get is worked out here the way the server will: the next of that customer and day. It is the Job Number's
	// Generated value, and the number they make shows under them (#300), as the report's footer prints it.
	const day = $derived(panel.day || (isDraft ? todayIso() : createdDayOf(look.project)));
	const nextJob = $derived(
		nextJobOf(look.projects, customerName, day, isDraft ? undefined : look.projectId)
	);
	const projectNumber = $derived(projectNumberOf(customerName, day, panel.job ?? nextJob));

	// A date field that is cleared keeps the date it had: a project always has a Project Creation Date. The field
	// shows it again at once (library Input).
	function setDay(text: string) {
		if (text) panel.day = text;
		save();
	}

	// Digits only, 1 to 999, shown at once. Cleared, or reset, the server gives the next one of that customer and day.
	function setJob(text: string) {
		const count = Number(text.replace(/\D/g, '').slice(0, 3));
		panel.job = count > 0 ? count : undefined;
		save();
	}

	let openDays = $state<string[]>([panel.days[0]?.id ?? '']);
	let openGroups = $state<string[]>([panel.groups[0]?.id ?? '']);

	function toggle(list: string[], id: string) {
		return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
	}

	// The section an entry of the empty-inputs list opens (#305). The Transport panel's legs open themselves
	// (transport-legs.svelte); the Items panel has no sections.
	function openSection(id: string) {
		if (panel.kind === 'project') {
			if (!openSections.includes(id)) openSections = [...openSections, id];
		} else if (panel.kind === 'timelog') {
			if (!openDays.includes(id)) openDays = [...openDays, id];
		} else if (panel.kind !== 'transport' && panel.kind !== 'items') {
			if (!openGroups.includes(id)) openGroups = [...openGroups, id];
		}
	}

	// The focus goes to the input once the panel and its section have slid open. A panel is drawn twice, for the
	// phone and the desk, and only the one on screen takes it.
	const SETTLE = 260;
	let root = $state<HTMLFieldSetElement>();
	$effect(() => {
		const wanted = look.reaching;
		const shown = root;
		if (!wanted || wanted.panelId !== panel.id || !shown) return;
		untrack(() => openSection(wanted.section));
		const timer = setTimeout(() => {
			if (!shown.getClientRects().length || look.reaching !== wanted) return;
			look.reaching = undefined;
			// An input the panel does not draw (none should be missing) leaves the panel itself brought into view.
			focusInput(inputIn(shown, wanted) ?? shown);
		}, SETTLE);
		return () => clearTimeout(timer);
	});

	// The item list attached as photos or as the file it came as, of any kind (#188, #233): each file goes to private
	// storage through the upload helper, showing in place while it goes, and joins the panel's attachments once it is
	// there.
	type SendingType = { id: string; name: string; kind: AttachmentType['kind']; upload: Upload };
	let sending = $state<SendingType[]>([]);

	function send(file: File, kind: AttachmentType['kind']) {
		const id = crypto.randomUUID();
		const upload = startUpload(file, {
			for: { table: 'item_attachment', column: 'file', id, projectId: look.projectId },
			kind: kind === 'photo' ? 'photo' : 'document',
			ondone: (src) => {
				sending = sending.filter((other) => other.id !== id);
				// #295: a PDF prints its pages four to a report page until another layout is picked, as a new photo
				// group's photos do.
				attach(panel, { id, name: file.name, src, kind, layout: DEFAULT_LAYOUT });
				save();
			}
		});
		sending.push({ id, name: file.name, kind, upload });
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

	// Sample fill, back from the prototype (samples.ts): a filled-in day after the last one, and stand-in photos.
	function addSampleDay() {
		const last = panel.days.findLast((each) => each.date)?.date;
		const day = toSampleDay(last, () => crypto.randomUUID());
		panel.days.push(day);
		openDays = [...openDays, day.id];
		save();
	}

	function addSamplePhotos(group: PanelType['groups'][number]) {
		group.photos.push(...toSamplePhotos(group.photos.length, 4, () => crypto.randomUUID()));
		save();
	}

	// The photo open in the pop-up (#312): its group, which photo, and whether it opens looking, cropping or typing.
	let opened = $state<{ group: PanelType['groups'][number]; id: string; mode: PopupModeType }>();

	function openPhoto(
		group: PanelType['groups'][number],
		photo: PhotoType,
		mode: PopupModeType = 'view'
	) {
		opened = { group, id: photo.id, mode };
	}

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
		const files = [...(event.dataTransfer?.files ?? [])];
		const count = addPhotos(panel, files, {
			group,
			projectId: look.projectId,
			toast: createPhotoToast
		});
		if (!count) return;
		if (!openGroups.includes(group.id)) openGroups = [...openGroups, group.id];
		look.say(`${filesLabelOf(files)} added`);
		save();
	}

	function addGroup() {
		const group = addPhotoGroup(panel);
		openGroups = [...openGroups, group.id];
		save();
	}

	// "stage" in the Operations panel, "group" in any other photo panel.
	const word = $derived(groupWordOf(panel));

	// A title cleared and left empty goes back to the panel's own name: a report section is never untitled. While it
	// is typed in, the emptied field shows that name as the app's value (#374).
	function keepName() {
		if (panel.name.trim()) return;
		panel.name = panelNameOf(panel);
		save();
	}

	function toggleGroup(group: PanelType['groups'][number]) {
		group.isEnabled = !group.isEnabled;
		save();
	}

	// Photos from the library or the camera: each goes to storage on its own (photos.ts, #189).
	function pickPhotos(event: Event, group: PanelType['groups'][number]) {
		const input = event.currentTarget as HTMLInputElement;
		const files = [...(input.files ?? [])];
		input.value = '';
		if (addPhotos(panel, files, { group, projectId: look.projectId, toast: createPhotoToast }))
			save();
	}

	function move<T>(list: T[], from: number, to: number) {
		const [item] = list.splice(from, 1);
		list.splice(to, 0, item);
		save();
	}

	// A photo dragged out of its group and let go on another one (Justin, 2026-11-21), in this panel or in another
	// photo panel that is open: it joins that group where it was dropped, or at its end, and is saved like any change.
	const PHOTO_ZONE = 'photos';
	function dropPhoto(group: PanelType['groups'][number], from: number, id: string, to?: number) {
		const kind = group.photos[from]?.kind ?? 'photo';
		if (!movePhoto(look.panels, group.id, from, id, to)) return;
		const target = look.panels.flatMap((item) => item.groups ?? []).find((item) => item.id === id);
		if (panel.groups.some((item) => item.id === id) && !openGroups.includes(id))
			openGroups = [...openGroups, id];
		look.say(`${ATTACHMENT_NAMES[kind]} moved to ${target?.title || 'the other group'}`);
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

<!-- A person in a Select is the app's own face, a customer its logo (Select's `mark`). -->
{#snippet face(name: string, size: number)}
	<Avatar
		{...faceOf(name)}
		{size}
		ring="ring-2 ring-white"
	/>
{/snippet}

{#snippet logo(name: string, size: number)}
	<Avatar
		{...logoOf(name, { shape: 'circle' })}
		{size}
	/>
{/snippet}

<!-- Title or Subtitle: the field the panel holds under that label, typed into as it is. -->
{#snippet textField(label: 'Title' | 'Subtitle', key: string)}
	{@const field = fieldOf(label)}
	{#if field}
		<Input
			{label}
			{...TYPING}
			bind:value={field.value}
			disabled={field.isReadonly}
			help={look.helpOf(key)}
		/>
	{/if}
{/snippet}

<!-- The organization's own people on the project: who they work for, one team lead, and whoever else is assigned.
     Under it, a section for each other company with people on the job. -->
{#snippet teamBlock()}
	<Group
		title="Organization"
		section="team"
		values={counted('team')}
		icon={PAGE_ICONS.team}
		isOpen={openSections.includes('team')}
		ontoggle={() => (openSections = toggle(openSections, 'team'))}
	>
		<Select
			label="Organization"
			icon="icon-[mdi--domain]"
			options={[
				{
					value: look.organization.name,
					label: look.organization.name,
					image: look.organization.logo,
					// The organization's own artwork, kept whole on white like a customer's logo.
					fit: 'contain'
				}
			]}
			value={fieldOf('Organization')?.value ?? ''}
			required
			help={look.helpOf('project.organization')}
			onpick={(id) => setField('Organization', id)}
		/>
		<Select
			label="Team Lead"
			mark={face}
			icon="icon-[mdi--account-tie]"
			options={members}
			value={panel.owner}
			required
			help={look.helpOf('project.teamLead')}
			onpick={setLead}
		/>
		<Select
			label="Team Assigned"
			mark={face}
			icon={PAGE_ICONS.team}
			options={members.filter((member) => member.value !== panel.owner)}
			multiple
			value={panel.assigned}
			many="people"
			required
			help={look.helpOf('project.teamAssigned')}
			onpick={assign}
		/>
	</Group>
	{#each personnel as company, companyIndex (company.id)}
		<Group
			title={company.company || `Personnel ${companyIndex + 1}`}
			section={company.id}
			values={counted(company.id)}
			icon="icon-[mdi--account-multiple-outline]"
			tone="bg-slate-900/[0.06] text-slate-600"
			isOpen={openSections.includes(company.id)}
			ontoggle={() => (openSections = toggle(openSections, company.id))}
			ondelete={() =>
				remove(panel.personnel ?? [], company, 'Delete Personnel?', 'Its people leave the report.')}
		>
			<!-- Typed freely, with the customers offered as it is typed: a typed Select. Typing saves through the
			     fieldset's input like every field here; a pick is no keystroke, so it saves itself. -->
			<Select
				isTyped
				label="Company"
				icon={PAGE_ICONS.customers}
				options={look.customers.map((name) => ({ value: name, label: name }))}
				bind:value={company.company}
				required
				help={look.helpOf('personnel.company')}
				placeholder="Type a company, or pick a customer"
				onpick={save}
			/>
			{#each company.people as person, personIndex (person.id)}
				{@const id = `${uid}-${person.id}`}
				<!-- A person: a name and a title, which count toward the percent, and a phone and an email to reach them
				     (#326), which are optional and count for nothing. Each input carries its label and its ? like every
				     other input (#299). A line keeps one person from the next. -->
				<div
					class="flex items-start gap-2 {personIndex
						? 'border-t border-slate-900/[0.06] pt-3'
						: ''}"
				>
					<div class="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
						<Input
							label="Name"
							{...TYPING}
							bind:value={person.name}
							help={look.helpOf('personnel.name')}
						/>
						<Input
							label="Title"
							{...TYPING}
							bind:value={person.title}
							help={look.helpOf('personnel.title')}
						/>
						<Input
							label="Phone"
							type="tel"
							inputmode="tel"
							autocomplete="off"
							bind:value={person.phone}
							maxlength={40}
							help={look.helpOf('personnel.phone')}
						/>
						<Input
							label="Email"
							type="email"
							inputmode="email"
							autocomplete="off"
							autocapitalize="off"
							spellcheck={false}
							bind:value={person.email}
							maxlength={200}
							help={look.helpOf('personnel.email')}
						/>
					</div>
					<button
						type="button"
						class="mt-3 flex size-7 shrink-0 items-center justify-center rounded-full text-slate-300 hover:bg-slate-100 hover:text-danger"
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

<!-- How many share a report page, 1, 2, 4, 6 or 8 (run 9 note 17: each button draws its own layout): a photo group's
     photos, and the pages of a PDF attached to the Items panel (#295). -->
{#snippet perPage(
	label: string,
	id: string,
	key: string,
	value: PageLayoutType,
	onpick: (layout: PageLayoutType) => void
)}
	<div
		class="has-help"
		role="group"
		aria-labelledby={id}
	>
		<p class={labelClass}>
			<span {id}>{label}</span>
			{#if look.helpOf(key)}<Help
					{label}
					text={look.helpOf(key)}
				/>{/if}
		</p>
		<div class="flex gap-1.5">
			{#each LAYOUTS as layout (layout)}
				<button
					type="button"
					class="flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold transition {value ===
					layout
						? 'bg-primary text-white shadow-md shadow-primary/25'
						: 'bg-white text-slate-500 hover:text-primary'}"
					onclick={() => onpick(layout)}
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
{/snippet}

<fieldset
	bind:this={root}
	disabled={!panel.isEnabled || (!isDraft && look.isFrozen)}
	class="min-w-0 space-y-3"
	oninput={() => save()}
>
	{#if panel.kind === 'project'}
		{@const contact = contacts.find((item) => item.id === panel.contact) ?? contacts[0]}
		<Group
			title="Project"
			section="project"
			values={counted('project')}
			icon={PAGE_ICONS.projects}
			isOpen={openSections.includes('project')}
			ontoggle={() => (openSections = toggle(openSections, 'project'))}
		>
			{@render textField('Title', 'project.title')}
			{@render textField('Subtitle', 'project.subtitle')}
			<!-- The report's opening sentence (#244), called Description here (Justin, 2026-11-19): the one worked out
			     from the project's panels, a Generated value, until someone rewords it. What is typed prints in its
			     place and stops following the panels, and its reset brings the worked-out sentence back (clearing it
			     does too). -->
			<Textarea
				label={INTRODUCTION_LABEL}
				autocapitalize={TYPING.autocapitalize}
				spellcheck={TYPING.spellcheck}
				bind:value={() => panel.introduction ?? '', setIntroduction}
				{generated}
				onreset={save}
				maxlength={INTRODUCTION_LIMIT}
				rows={3}
				help={look.helpOf('project.description')}
			/>
			<Select
				label="Project Type"
				icon="icon-[mdi--package-variant-closed]"
				options={PROJECT_TYPES.map((type) => ({ value: type, label: type }))}
				value={fieldOf('Project Type')?.value ?? ''}
				required
				help={look.helpOf('project.type')}
				onpick={(id) => setField('Project Type', id)}
			/>
			<!-- The two parts of the project number a User may type (#217), and under them the number they make
			     (#300). -->
			<div class="space-y-2">
				<div class="grid grid-cols-2 gap-3">
					<Input
						class="min-w-0"
						label="Created Date"
						type="date"
						bind:value={() => day, setDay}
						help={look.helpOf('project.createdDate')}
					/>
					<Input
						class="min-w-0 tabular-nums"
						label="Job Number"
						inputmode="numeric"
						maxlength={3}
						bind:value={() => (panel.job ? String(panel.job) : ''), setJob}
						generated={String(nextJob)}
						onreset={save}
						help={look.helpOf('project.jobNumber')}
					/>
				</div>
				<Generated
					label="Project Number"
					value={projectNumber}
					help={look.helpOf('project.number')}
				/>
			</div>
		</Group>
		<Group
			title="Customer"
			section="customer"
			values={counted('customer')}
			icon={PAGE_ICONS.customers}
			isOpen={openSections.includes('customer')}
			ontoggle={() => (openSections = toggle(openSections, 'customer'))}
		>
			<Select
				label="Customer"
				mark={logo}
				icon={PAGE_ICONS.customers}
				options={look.customers.map((name) => ({ value: name, label: name }))}
				value={customerName}
				required
				help={look.helpOf('project.customer')}
				onpick={setCustomer}
				onadd={() => look.addFor('customers', {}, setCustomer)}
				onedit={(name) => look.editRecord('customers', name)}
			/>
			<!-- Which of the customer's contacts the report is for; a customer with none has nothing to pick. -->
			<Select
				label="Contact"
				icon="icon-[mdi--account]"
				options={contacts.map((item) => ({
					value: item.id,
					label: item.name,
					note: item.title,
					// No photo: their initials on the customer's sky blue (#355).
					image: item.photo || toInitialsPicture(initialsOf(item.name), 'customer')
				}))}
				value={contact?.id ?? ''}
				placeholder={customerName ? 'No contacts on this customer yet' : 'Choose a customer first'}
				disabled={!contacts.length}
				help={look.helpOf('project.contact')}
				onpick={(id) => {
					panel.contact = id;
					save();
				}}
			/>
			<!-- The customer's own number for the job (#217): optional. -->
			<Input
				label="Reference Number"
				bind:value={panel.customerReference}
				maxlength={100}
				help={look.helpOf('project.referenceNumber')}
			/>
		</Group>
		{@render teamBlock()}
	{:else if panel.kind === 'transport'}
		<TransportLegs
			{look}
			{panel}
			onsave={save}
		/>
	{:else if panel.kind === 'items'}
		<!-- The item list (#242). A list read from a spreadsheet shows as the table the report prints; under it the
		     box takes another, or a photo. Items can still be typed a row at a time, and rows pasted into any of
		     those fields become the table too. -->
		{#if table && panel.grid}
			<div class="overflow-hidden rounded-2xl bg-slate-900/[0.02] ring-1 ring-slate-200">
				<div class="flex items-center gap-2 py-2.5 pr-1.5 pl-3">
					<div class="min-w-0 flex-1">
						<p class="truncate text-[13px] font-bold text-slate-900">
							{panel.grid.name || 'Pasted from a spreadsheet'}
						</p>
						<p class="truncate text-xs text-slate-500">
							{table.rows.length}
							{table.rows.length === 1 ? 'item' : 'items'} · {table.columns.length} columns
						</p>
					</div>
					<button
						type="button"
						class="flex size-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-danger"
						aria-label="Remove the list"
						onclick={removeList}><span class="icon-[mdi--close] size-4"></span></button
					>
				</div>
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<div
					class="max-h-72 overflow-auto border-t border-slate-200 bg-white px-3 py-1 text-xs"
					tabindex="0"
					role="region"
					aria-label="The items table"
				>
					<ItemTable {table} />
				</div>
			</div>
			{#if skipped}
				<p class="flex items-start gap-1.5 text-xs text-slate-400">
					<span class="mt-px icon-[mdi--table-large] size-4 shrink-0"></span>
					<span
						>Left out {[
							skipped.rows && `${skipped.rows} blank ${skipped.rows === 1 ? 'row' : 'rows'}`,
							skipped.columns &&
								`${skipped.columns} blank ${skipped.columns === 1 ? 'column' : 'columns'}`
						]
							.filter(Boolean)
							.join(' and ')}. Only cells with something in them are kept.</span
					>
				</p>
			{/if}
		{/if}
		<ItemBox
			isSlim={Boolean(panel.grid)}
			ontext={takeText}
			onfiles={takeFiles}
		/>
		{#if panel.attachments?.length || sending.length}
			<!-- A photo of the list shows whole (#233; Michael's packing list lost its edges): at its own shape, as wide
			     as the panel at most, with no rounded corner over it and its Remove beside it, not on it. Tapping it
			     opens it full size. -->
			<div class="flex flex-wrap items-start gap-2">
				{#each panel.attachments ?? [] as file (file.id)}
					{#if file.kind === 'photo'}
						<span class="flex max-w-full items-start gap-1">
							<a
								href={file.src || undefined}
								target="_blank"
								rel="noopener"
								class="block min-w-0 bg-slate-900/[0.04]"
								aria-label="Open {file.name}"
							>
								<img
									src={file.src}
									alt={file.name}
									class="block max-h-64 w-auto max-w-full"
								/>
							</a>
							<button
								type="button"
								class="flex size-6 shrink-0 items-center justify-center rounded-full text-slate-400 hover:text-danger"
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
					{:else if isPdfAttachment(file)}
						<!-- #295: a PDF prints its pages, as many to a report page as picked here, laid out like a photo
						     group's photos. One whose pages cannot be read prints its name. -->
						{@const count = pageCountOf(file.src)}
						<div
							class="w-full overflow-hidden rounded-2xl bg-slate-900/[0.02] ring-1 ring-slate-200"
						>
							<div class="flex items-center gap-2 py-2.5 pr-1.5 pl-3">
								<span class="{ATTACHMENT_ICONS.pdf} size-5 shrink-0 text-primary"></span>
								<div class="min-w-0 flex-1">
									<a
										href={file.src || undefined}
										target="_blank"
										rel="noopener"
										class="block truncate text-[13px] font-bold text-slate-900 hover:underline"
										>{file.name}</a
									>
									<p class="truncate text-xs text-slate-500">
										{count === undefined
											? ATTACHMENT_NAMES.pdf
											: count === 0
												? 'Its pages could not be read, so it prints its name'
												: `${count} ${count === 1 ? 'page' : 'pages'}`}
									</p>
								</div>
								<button
									type="button"
									class="flex size-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-danger"
									aria-label="Remove {file.name}"
									onclick={() =>
										remove(
											panel.attachments ?? [],
											file,
											`Remove ${file.name}?`,
											'It leaves the cargo description.'
										)}><span class="icon-[mdi--close] size-4"></span></button
								>
							</div>
							{#if count !== 0}
								<div class="border-t border-slate-200 px-3 pt-2 pb-3">
									{@render perPage(
										'Pages per Page',
										`${uid}-${file.id}-layout`,
										'itemAttachment.layout',
										file.layout,
										(layout) => {
											file.layout = layout;
											save();
										}
									)}
								</div>
							{/if}
						</div>
					{:else}
						<span
							class="relative flex items-center gap-2 overflow-hidden rounded-xl bg-slate-900/[0.04] py-2 pr-8 pl-3 text-xs text-slate-700"
						>
							<span class="icon-[mdi--file-table-outline] size-4 shrink-0 text-primary"></span>
							<a
								href={file.src || undefined}
								target="_blank"
								rel="noopener"
								class="max-w-40 truncate hover:underline">{file.name}</a
							>
							<button
								type="button"
								class="absolute top-0.5 right-0.5 flex size-6 items-center justify-center rounded-full text-slate-400 hover:text-danger"
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
					{/if}
				{/each}
				<!-- On their way to storage: each shows in place with its mark; a failed one says so, with Retry. -->
				{#each sending as file (file.id)}
					<span
						class="relative flex max-w-full items-center gap-2 overflow-hidden bg-slate-900/[0.04] text-xs text-slate-700 {file.kind ===
						'photo'
							? 'min-h-12 min-w-28'
							: 'rounded-xl py-2 pr-8 pl-3'}"
						aria-busy={file.upload.isUploading}
					>
						{#if file.kind === 'photo' && file.upload.hasPreview}
							<img
								src={file.upload.preview}
								alt={file.name}
								class="block max-h-64 w-auto max-w-full opacity-60"
								onerror={() => (file.upload.hasPreview = false)}
							/>
						{:else if file.kind === 'photo'}
							<!-- #294: a photo the device cannot draw shows its name while the server converts it. -->
							<span class="flex items-center gap-2 py-2 pr-8 pl-3">
								<span class="icon-[mdi--image-outline] size-4 shrink-0 text-primary"></span>
								<span class="max-w-40 truncate">{file.name}</span>
								{#if file.upload.isConverting}<span class="text-slate-500">Converting</span>{/if}
							</span>
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
		<div
			class="space-y-3"
			onpaste={pasteRows}
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
						data-input={MARKED_LABELS.quantity}
					/>
					<input
						class={inputClass}
						bind:value={item.description}
						placeholder="What it is, e.g. Accessory crates"
						aria-label="Description of item {itemIndex + 1}"
						data-input={MARKED_LABELS.description}
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
			{/each}
			<div class="flex flex-wrap gap-2">
				<button
					type="button"
					class="{ghostButton} bg-slate-900 text-white hover:bg-slate-700"
					data-input={MARKED_LABELS.item}
					onclick={() => {
						panel.items.push(itemOf());
						save();
					}}><span class="icon-[mdi--plus] size-4"></span>Add item</button
				>
				{#if !panel.grid}
					<button
						type="button"
						class="{ghostButton} bg-primary/10 text-primary hover:bg-primary/15"
						onclick={addSampleList}
						><span class="icon-[mdi--auto-fix] size-4"></span>Add Sample Data</button
					>
				{/if}
			</div>
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
						section={day.id}
						values={counted(day.id)}
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
						<Input
							label="Date"
							type="date"
							bind:value={day.date}
							help={look.helpOf('timeLog.date')}
						/>
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
										data-input={MARKED_LABELS.time}
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
				data-input={MARKED_LABELS.day}
				onclick={addDay}><span class="icon-[mdi--calendar-plus] size-4"></span>Add day</button
			>
			<button
				type="button"
				class="{ghostButton} bg-primary/10 text-primary hover:bg-primary/15"
				onclick={addSampleDay}
				><span class="icon-[mdi--auto-fix] size-4"></span>Add a sample day</button
			>
		</div>
	{:else}
		<!-- The panel's own name is the app's value (#374): a title cleared goes back to it once the field is left. -->
		<div onfocusout={keepName}>
			<Input
				label="Title"
				{...TYPING}
				bind:value={panel.name}
				generated={panelNameOf(panel)}
				onreset={keepName}
				maxlength={80}
				help={look.helpOf('panel.title')}
			/>
		</div>
		{#if panel.key === 'operations'}
			<!-- The link to the project's files (#233): its folder elsewhere, a OneDrive folder say, pasted once. The
			     report prints it on the Project Report page and on this panel's first page. Optional; what is typed
			     is kept. The field runs the panel's full width, and once what it holds is an address a browser can
			     open, an arrow shows inside it at the far right that opens it, to check it goes to the right place
			     (Justin, 2026-11-18). -->
			<Input
				label={LINK_LABEL}
				type="url"
				inputmode="url"
				autocomplete="off"
				bind:value={panel.link}
				maxlength={2048}
				action={link
					? {
							icon: 'icon-[mdi--open-in-new]',
							label: 'Open the URL',
							title: `Open in ${linkNameOf(link)}`,
							href: link
						}
					: undefined}
				error={panel.link?.trim() && !link
					? 'That does not look like a URL. Paste the folder’s full address.'
					: undefined}
				help={look.helpOf('panel.link')}
			/>
		{/if}
		<div
			class="space-y-3"
			{@attach sortable(`groups-${panel.id}`, (from, to) => move(panel.groups, from, to))}
		>
			{#each panel.groups as group, groupIndex (group.id)}
				<div
					class="rounded-2xl transition data-[drop]:ring-2 data-[drop]:ring-primary {dropping ===
					group.id
						? 'ring-2 ring-primary'
						: ''}"
					role="group"
					aria-label={group.title || `Photo ${word}`}
					data-zone={PHOTO_ZONE}
					data-zone-id={group.id}
					animate:flip={{ duration: 200 }}
					ondragover={(event) => overFiles(event, group.id)}
					ondragleave={() => (dropping = '')}
					ondrop={(event) => dropFiles(event, group)}
				>
					<Group
						title={group.title || `Untitled ${word}`}
						section={group.id}
						values={counted(group.id)}
						meta={countLabelOf(group.photos)}
						isEnabled={group.isEnabled}
						onenable={() => toggleGroup(group)}
						icon="icon-[mdi--image-multiple-outline]"
						number={stageNumbers[groupIndex]}
						isOpen={openGroups.includes(group.id)}
						ontoggle={() => (openGroups = toggle(openGroups, group.id))}
						ondelete={() =>
							remove(
								panel.groups,
								group,
								`Delete ${word}?`,
								`Its ${countLabelOf(group.photos)} leave the report.`
							)}
						sortKey="groups-{panel.id}"
						index={groupIndex}
					>
						<Input
							label="Title"
							{...TYPING}
							bind:value={group.title}
							help={look.helpOf('group.title')}
						/>
						<Textarea
							label="Description"
							autocapitalize={TYPING.autocapitalize}
							spellcheck={TYPING.spellcheck}
							bind:value={group.description}
							rows={2}
							help={look.helpOf('group.description')}
						/>
						{@render perPage(
							'Photos per Page',
							`${uid}-${group.id}-layout`,
							'group.layout',
							group.layout,
							(layout) => {
								group.layout = layout;
								save();
							}
						)}
						<div
							class="grid grid-cols-3 gap-2"
							{@attach sortable(`photos-${group.id}`, (from, to) => move(group.photos, from, to), {
								name: PHOTO_ZONE,
								items: 'photos-',
								ondrop: (from, id, to) => dropPhoto(group, from, id, to)
							})}
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
										aria-label="Open photo {photoIndex + 1}"
										data-grip="photos-{group.id}"
										onclick={() => {
											// Nothing to show in the pop-up until the server has converted it (#294).
											if (!upload || upload.hasPreview) openPhoto(group, photo);
										}}
									>
										<!-- #294: a photo the device cannot draw (a HEIC in Chrome) shows its name, never a broken picture.
										     #327: so does a PDF or a video until its picture is made. -->
										{#if upload && (!upload.hasPreview || !photo.src)}
											<span
												class="pointer-events-none flex size-full flex-col items-center justify-center gap-1 p-2 pb-8 text-center"
											>
												<span
													class="{ATTACHMENT_ICONS[
														photo.kind ?? 'photo'
													]} size-6 shrink-0 text-slate-400"
												></span>
												<span class="line-clamp-2 text-[11px] font-medium break-all text-slate-600"
													>{upload.name}</span
												>
											</span>
										{:else}
											<Photo
												src={photo.src}
												alt={photo.description}
												crop={photo.crop}
												class="pointer-events-none size-full {upload ? 'opacity-60' : ''}"
												onerror={() => {
													if (upload) upload.hasPreview = false;
												}}
											/>
										{/if}
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
										<!-- #327: what kind of attachment it is, on every tile (Justin, 2026-11-25): a photo by its icon, a PDF
										     with its pages, a video with its length. #349: a photo by the type it arrived as (HEIC, JPEG,
										     PNG), read from its name while it is on its way. -->
										{#if photo.src}
											{@const kind = photo.kind ?? 'photo'}
											{@const arrived =
												kind === 'photo'
													? toTypeLabel(
															fileDetailsOf(photo.src)?.original.type ??
																(upload ? toPictureType({ name: upload.name, type: '' }) : '')
														)
													: ''}
											{@const label = arrived ? `${arrived} photo` : ATTACHMENT_NAMES[kind]}
											<span
												class="pointer-events-none absolute right-1 bottom-1 flex items-center gap-0.5 rounded-md bg-black/65 py-0.5 text-[10px] leading-none font-semibold text-white tabular-nums {kind ===
													'photo' && !arrived
													? 'px-0.5'
													: 'pr-1.5 pl-1'}"
												title={label}
												aria-label={label}
												><span
													class="{ATTACHMENT_ICONS[kind]} size-3.5 {kind === 'pdf'
														? 'text-red-400'
														: ''}"
												></span>{kind === 'pdf'
													? `${photo.pageCount ?? 1} ${photo.pageCount === 1 ? 'page' : 'pages'}`
													: kind === 'video'
														? toLengthLabel(photo.duration) || 'Video'
														: arrived}</span
											>
										{/if}
									</button>
									<!-- #189: on its way to storage, a small mark; a failed upload says so and retries in place. #294: while
									     the server converts it, the mark says so. -->
									{#if upload?.isConverting}
										<span
											class="pointer-events-none absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 rounded-lg bg-white px-1.5 py-1 text-[11px] font-semibold text-slate-700 shadow"
											role="status"
											aria-label="Converting photo {photoIndex + 1}"
											><span class="icon-[svg-spinners--ring-resize] size-3.5 shrink-0 text-primary"
											></span>Converting</span
										>
									{:else if upload?.isUploading}
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
												// #327: a PDF's pages always print whole; a video is not cropped yet either.
												...(photo.kind
													? []
													: [
															{
																id: 'crop',
																label: 'Crop',
																icon: 'icon-[mdi--crop]'
															}
														]),
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
												id === 'delete'
													? remove(
															group.photos,
															photo,
															`Delete ${ATTACHMENT_NOUNS[photo.kind ?? 'photo']}?`,
															`It leaves the ${word} and the report.`
														)
													: openPhoto(group, photo, id === 'crop' ? 'crop' : 'text')}
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
							<!-- Lit while its file input has the focus: where an entry of the empty-inputs list for Photos lands. -->
							<label
								class="relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl bg-primary/[0.06] text-primary/70 transition focus-within:ring-2 focus-within:ring-primary/40 hover:bg-primary/10 hover:text-primary"
							>
								<span class="icon-[mdi--image-plus-outline] size-6"></span>
								<span class="text-[11px] font-medium">Upload</span>
								<input
									type="file"
									accept={ATTACHMENT_ACCEPT}
									multiple
									data-input={MARKED_LABELS.photos}
									class="sr-only"
									onchange={(event) => pickPhotos(event, group)}
								/>
							</label>
							<label
								class="relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl bg-primary/[0.06] text-primary/70 transition hover:bg-primary/10 hover:text-primary"
							>
								<span class="icon-[mdi--camera-outline] size-6"></span>
								<span class="text-[11px] font-medium">Camera</span>
								<input
									type="file"
									accept="image/*,video/*"
									capture="environment"
									class="sr-only"
									onchange={(event) => pickPhotos(event, group)}
								/>
							</label>
						</div>
						{#snippet actions()}
							<button
								type="button"
								class="{ghostButton} bg-primary/10 text-primary hover:bg-primary/15"
								onclick={() => addSamplePhotos(group)}
								><span class="icon-[mdi--auto-fix] size-4"></span>Add sample photos</button
							>
						{/snippet}
					</Group>
				</div>
			{:else}
				<div
					class="flex flex-col items-center gap-1 rounded-2xl bg-slate-900/[0.03] py-6 text-slate-400"
				>
					<span class="icon-[mdi--image-filter-hdr] size-8"></span>
					<p class="text-sm">{word === 'stage' ? 'No stages yet.' : 'No photo groups yet.'}</p>
				</div>
			{/each}
		</div>
		<button
			type="button"
			class="{ghostButton} bg-slate-900 text-white hover:bg-slate-700"
			data-input={MARKED_LABELS.photos}
			onclick={addGroup}><span class="icon-[mdi--plus] size-4"></span>Add {word}</button
		>
	{/if}
</fieldset>

{#if opened}
	<PhotoPopup
		{look}
		group={opened.group}
		id={opened.id}
		mode={opened.mode}
		{word}
		onsave={save}
		onclose={() => (opened = undefined)}
	/>
{/if}
