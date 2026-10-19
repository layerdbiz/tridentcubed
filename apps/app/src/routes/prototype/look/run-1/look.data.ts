// PROTOTYPE (#161): made-up data only. The repo is public, so no real clients, people or reports.

export type StatusType = 'Draft' | 'In Progress' | 'Review' | 'Sent' | 'Revision' | 'Complete';

export type ProjectType = {
	id: string;
	number: string;
	title: string;
	type: string;
	client: string;
	carrier: string;
	facility: string;
	status: StatusType;
	team: string[];
	updated: string;
	progress: number;
};

export type PanelStatusType = 'To do' | 'In progress' | 'Complete';

export type PanelType = {
	id: string;
	name: string;
	icon: string;
	status: PanelStatusType;
	inputs: { label: string; value: string }[];
};

// Full class strings so Tailwind's scanner finds every icon.
export const STATUS: Record<StatusType, { icon: string; tone: string; dot: string }> = {
	Draft: { icon: 'icon-[mdi--file-outline]', tone: 'text-slate-400', dot: 'bg-slate-300' },
	'In Progress': { icon: 'icon-[mdi--progress-pencil]', tone: 'text-primary', dot: 'bg-primary' },
	Review: { icon: 'icon-[mdi--eye-check-outline]', tone: 'text-amber-500', dot: 'bg-amber-400' },
	Sent: { icon: 'icon-[mdi--send-check-outline]', tone: 'text-emerald-500', dot: 'bg-emerald-500' },
	Revision: { icon: 'icon-[mdi--undo-variant]', tone: 'text-rose-500', dot: 'bg-rose-500' },
	Complete: {
		icon: 'icon-[mdi--check-decagram-outline]',
		tone: 'text-slate-500',
		dot: 'bg-slate-500'
	}
};

export const BOARD_COLUMNS: StatusType[] = ['Draft', 'In Progress', 'Review', 'Sent', 'Revision'];

export const PROJECTS: ProjectType[] = [
	{
		id: 'p1',
		number: 'TC-24031',
		title: 'Steel coil discharge',
		type: 'Cargo',
		client: 'Northwind Shipping',
		carrier: 'MV Coral Dawn',
		facility: 'Port of Halverton',
		status: 'In Progress',
		team: ['AR', 'JM'],
		updated: '12 min ago',
		progress: 62
	},
	{
		id: 'p2',
		number: 'TC-24030',
		title: 'Pre-shipment condition',
		type: 'Vessel Condition',
		client: 'Bluewater Logistics',
		carrier: 'MV Silver Tern',
		facility: 'Eastgate Terminal 4',
		status: 'Review',
		team: ['KS'],
		updated: '1 h ago',
		progress: 100
	},
	{
		id: 'p3',
		number: 'TC-24029',
		title: 'Bagged rice loading',
		type: 'Cargo',
		client: 'Meridian Foods',
		carrier: 'MV Lantern Bay',
		facility: 'Port of Halverton',
		status: 'Sent',
		team: ['AR'],
		updated: 'Yesterday',
		progress: 100
	},
	{
		id: 'p4',
		number: 'TC-24028',
		title: 'Warehouse stock count',
		type: 'Warehousing',
		client: 'Crestline Metals',
		carrier: 'Truck fleet 12',
		facility: 'Northside Depot',
		status: 'Draft',
		team: ['JM', 'LT', 'KS'],
		updated: 'Yesterday',
		progress: 8
	},
	{
		id: 'p5',
		number: 'TC-24027',
		title: 'Draft survey, arrival',
		type: 'Draft Survey',
		client: 'Northwind Shipping',
		carrier: 'MV Coral Dawn',
		facility: 'Port of Halverton',
		status: 'Revision',
		team: ['LT'],
		updated: '2 days ago',
		progress: 90
	},
	{
		id: 'p6',
		number: 'TC-24026',
		title: 'Transformer lift',
		type: 'Cargo',
		client: 'Apex Power Systems',
		carrier: 'MV Harbor Finch',
		facility: 'Southpoint Terminal',
		status: 'In Progress',
		team: ['AR', 'KS'],
		updated: '3 days ago',
		progress: 35
	},
	{
		id: 'p7',
		number: 'TC-24025',
		title: 'Bunker quantity',
		type: 'Bunker',
		client: 'Bluewater Logistics',
		carrier: 'MV Silver Tern',
		facility: 'Eastgate Terminal 4',
		status: 'Complete',
		team: ['JM'],
		updated: 'Last week',
		progress: 100
	},
	{
		id: 'p8',
		number: 'TC-24024',
		title: 'Damaged pipe bundles',
		type: 'Cargo',
		client: 'Crestline Metals',
		carrier: 'Rail car 88',
		facility: 'Northside Depot',
		status: 'In Progress',
		team: ['LT', 'AR'],
		updated: 'Last week',
		progress: 48
	}
];

export const PANELS: PanelType[] = [
	{
		id: 'organization',
		name: 'Organization',
		icon: 'icon-[mdi--domain]',
		status: 'Complete',
		inputs: [
			{ label: 'Company', value: 'Trident Cubed' },
			{ label: 'Office', value: 'Houston, TX' }
		]
	},
	{
		id: 'client',
		name: 'Client',
		icon: 'icon-[mdi--briefcase-outline]',
		status: 'Complete',
		inputs: [
			{ label: 'Client', value: 'Northwind Shipping' },
			{ label: 'Reference', value: 'NW-7781' }
		]
	},
	{
		id: 'team',
		name: 'Team',
		icon: 'icon-[mdi--account-group-outline]',
		status: 'Complete',
		inputs: [
			{ label: 'Owner', value: 'A. Rivera' },
			{ label: 'Members', value: 'J. Marsh' }
		]
	},
	{
		id: 'project',
		name: 'Project',
		icon: 'icon-[mdi--clipboard-text-outline]',
		status: 'In progress',
		inputs: [
			{ label: 'Project type', value: 'Cargo' },
			{ label: 'Date of attendance', value: '' }
		]
	},
	{
		id: 'items',
		name: 'Items',
		icon: 'icon-[mdi--package-variant-closed]',
		status: 'In progress',
		inputs: [
			{ label: 'Description', value: 'Hot-rolled steel coils' },
			{ label: 'Quantity', value: '' }
		]
	},
	{
		id: 'facility',
		name: 'Facility',
		icon: 'icon-[mdi--anchor]',
		status: 'Complete',
		inputs: [
			{ label: 'Facility', value: 'Port of Halverton' },
			{ label: 'Berth', value: '7' }
		]
	},
	{
		id: 'carrier',
		name: 'Carrier',
		icon: 'icon-[mdi--ferry]',
		status: 'Complete',
		inputs: [
			{ label: 'Vessel', value: 'MV Coral Dawn' },
			{ label: 'Flag', value: 'Panama' }
		]
	},
	{
		id: 'timelog',
		name: 'Time Log',
		icon: 'icon-[mdi--clock-outline]',
		status: 'In progress',
		inputs: [
			{ label: '08:00', value: 'Arrived on site, safety briefing' },
			{ label: '09:15', value: 'Hatch 2 opened, discharge started' }
		]
	},
	{
		id: 'inspection',
		name: 'Inspection',
		icon: 'icon-[mdi--camera-outline]',
		status: 'In progress',
		inputs: [{ label: 'Photo group', value: 'Hatch 2 before discharge (6 photos)' }]
	},
	{
		id: 'damages',
		name: 'Damages',
		icon: 'icon-[mdi--alert-outline]',
		status: 'To do',
		inputs: [{ label: 'Photo group', value: '' }]
	},
	{
		id: 'discharge',
		name: 'Discharge',
		icon: 'icon-[mdi--crane]',
		status: 'To do',
		inputs: [{ label: 'Photo group', value: '' }]
	}
];

export const PANEL_STATUS: Record<PanelStatusType, { icon: string; tone: string }> = {
	'To do': { icon: 'icon-[mdi--circle-outline]', tone: 'text-slate-300' },
	'In progress': { icon: 'icon-[mdi--circle-slice-4]', tone: 'text-primary' },
	Complete: { icon: 'icon-[mdi--check-circle]', tone: 'text-emerald-500' }
};

export const NAV = [
	{
		id: 'dashboard',
		label: 'Dashboard',
		icon: 'icon-[mdi--view-dashboard-outline]',
		active: 'icon-[mdi--view-dashboard]'
	},
	{
		id: 'projects',
		label: 'Projects',
		icon: 'icon-[mdi--folder-outline]',
		active: 'icon-[mdi--folder]'
	},
	{
		id: 'lists',
		label: 'Lists',
		icon: 'icon-[mdi--format-list-bulleted-square]',
		active: 'icon-[mdi--format-list-bulleted-square]',
		children: ['Clients', 'Carriers', 'Facilities']
	},
	{
		id: 'admin',
		label: 'Admin',
		icon: 'icon-[mdi--shield-account-outline]',
		active: 'icon-[mdi--shield-account]',
		children: ['Users', 'Organization', 'Trash']
	}
];
