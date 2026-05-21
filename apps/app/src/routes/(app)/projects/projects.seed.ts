export type DemoFieldValueType = string | string[];

export interface DemoPhotoSeedType {
	name: string;
	caption: string;
	src: string;
	width: number;
	height: number;
}

export interface DemoPhotoGroupSeedType {
	title: string;
	description: string;
	variant: string;
	files?: string[];
	photos: DemoPhotoSeedType[];
}

export interface DemoTimeLogEntrySeedType {
	time: string;
	text: string;
}

export interface DemoTimeLogDaySeedType {
	dateISO: string;
	entries: DemoTimeLogEntrySeedType[];
}

export type DemoProjectStatusType =
	| "Draft"
	| "In Progress"
	| "Review"
	| "Sent"
	| "Complete"
	| "Archived";

export interface DemoProjectSeedType {
	key: string;
	status: DemoProjectStatusType;
	progressPercent: number;
	fields: Record<string, DemoFieldValueType>;
	timeLogDays: DemoTimeLogDaySeedType[];
	photoSections: Record<string, DemoPhotoGroupSeedType[]>;
	openSections?: string[];
}

export const legacyAutoSeedTitles = new Set([
	"Untitled Project",
	"Draft Cargo Survey",
	"MV Ocean Survey",
]);

function media(seed: string, width = 1600, height = 1000): string {
	return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

function photo(seed: string, name: string, caption: string): DemoPhotoSeedType {
	return {
		name,
		caption,
		src: media(seed),
		width: 1600,
		height: 1000,
	};
}

const commonOrgFields: Record<string, DemoFieldValueType> = {
	"org.name": "Trident Cubed",
	"org.url": "https://tridentcubed.com",
	"org.logo": media("trident-logo-01", 960, 540),
	"org.address.line1": "800 Town and Country",
	"org.address.line2": "Suite 500",
	"org.address.city": "Houston",
	"org.address.state": "TX",
	"org.address.zip": "77024",
	"org.phone": "+1 409 543 2725",
	"org.email": "preview@tridentcubed.com",
};

export const demoProjectSeeds: DemoProjectSeedType[] = [
	{
		key: "seed-preview-001",
		status: "Draft",
		progressPercent: 18,
		fields: {
			...commonOrgFields,
			"project.type": "Cargo",
			"project.title": "Open Starter Project",
			"project.subtitle": "Starter draft for beta testing",
			"client.company": "Atlas Freight",
			"client.shortname": "Atlas",
			"client.logo": media("trident-client-01", 960, 540),
			"client.website": "https://example.com/atlas-freight",
			"client.contact": "Morgan Rivera",
			"client.email": "atlas@example.com",
			"facility.name": "Pier 48 Terminal",
			"facility.city": "Houston",
			"facility.state": "TX",
			"carrier.type": "Sea",
			"carrier.name": "MV Horizon Gate",
			"carrier.photo": media("trident-photo-01"),
			"carrier.documents": ["carrier-intake-packet.pdf"],
			"items.title": "Cargo Intake",
			"items.description":
				"A light starter project with enough seeded content to show the live editor, photo flow, and preview output without overwhelming the first tester.",
			"team.owner": "Jordan Blake",
			"team.assigned": ["Mila Carter"],
		},
		timeLogDays: [
			{
				dateISO: "2026-05-18",
				entries: [
					{
						time: "08:00",
						text:
							"Opened the preview build and confirmed the initial report structure.",
					},
					{
						time: "09:10",
						text:
							"Captured the first walkthrough images for intake and staging.",
					},
				],
			},
		],
		photoSections: {
			Inspection: [
				{
					title: "Initial Walkthrough",
					description:
						"Baseline coverage for the cargo intake zone and terminal approach.",
					variant: "photos-2",
					photos: [
						photo(
							"trident-photo-01",
							"Terminal Approach",
							"Terminal approach and truck staging on arrival.",
						),
						photo(
							"trident-photo-02",
							"Receiving Zone",
							"Receiving zone overview at the start of intake.",
						),
					],
				},
			],
			Custom: [
				{
					title: "Quick Reference",
					description:
						"A small extra section to demonstrate the custom photo workflow.",
					variant: "photos-1",
					files: ["preview-checklist.pdf"],
					photos: [
						photo(
							"trident-photo-03",
							"Reference Frame",
							"Reference image attached through the custom section.",
						),
					],
				},
			],
		},
		openSections: ["Project", "Inspection"],
	},
	{
		key: "seed-preview-002",
		status: "In Progress",
		progressPercent: 52,
		fields: {
			...commonOrgFields,
			"project.type": "Warehousing",
			"project.title": "Terminal Intake Review",
			"project.subtitle": "Receiving inspection underway",
			"client.company": "Northwind Logistics",
			"client.shortname": "Northwind",
			"client.logo": media("trident-client-02", 960, 540),
			"client.website": "https://example.com/northwind-logistics",
			"client.contact": "Avery Brooks",
			"client.email": "northwind@example.com",
			"facility.name": "East Harbor Berth",
			"facility.city": "Galveston",
			"facility.state": "TX",
			"carrier.type": "Road",
			"carrier.name": "Inbound Unit Group",
			"carrier.photo": media("trident-photo-04"),
			"carrier.documents": ["receiving-manifest.pdf", "dock-layout.pdf"],
			"items.title": "Containerized Machinery",
			"items.description":
				"Inbound units staged for intake review and visual verification across the receiving zone and warehouse apron.",
			"team.owner": "Riley Ford",
			"team.assigned": ["Mila Carter", "Noah Ellis"],
		},
		timeLogDays: [
			{
				dateISO: "2026-05-12",
				entries: [
					{
						time: "07:30",
						text: "Arrived on site and reviewed intake paperwork.",
					},
					{
						time: "08:15",
						text: "Completed the initial cargo count at the receiving zone.",
					},
					{
						time: "10:45",
						text: "Documented packaging condition and dock layout.",
					},
				],
			},
		],
		photoSections: {
			Inspection: [
				{
					title: "Warehouse Intake",
					description:
						"Receiving area and intake flow after the first paperwork review.",
					variant: "photos-4",
					files: ["warehouse-intake-notes.pdf"],
					photos: [
						photo(
							"trident-photo-05",
							"Dock Layout",
							"Dock layout recorded during initial walkthrough.",
						),
						photo(
							"trident-photo-06",
							"Packaging Detail",
							"Packaging condition detail from intake review.",
						),
						photo(
							"trident-photo-07",
							"Warehouse Bay",
							"Warehouse bay staging and access path.",
						),
						photo(
							"trident-photo-08",
							"Receiving Team",
							"Receiving team staging area and support traffic.",
						),
					],
				},
			],
			Discharge: [
				{
					title: "Follow-Up Handling",
					description:
						"A small discharge-style section to exercise optional photo pages.",
					variant: "photos-2",
					photos: [
						photo(
							"trident-photo-09",
							"Material Transfer",
							"Material transfer and staging follow-up.",
						),
						photo(
							"trident-photo-10",
							"Yard Exit",
							"Outbound yard routing after intake.",
						),
					],
				},
			],
		},
		openSections: ["Inspection"],
	},
	{
		key: "seed-preview-003",
		status: "Review",
		progressPercent: 88,
		fields: {
			...commonOrgFields,
			"project.type": "Vessel Condition",
			"project.title": "Harbor Readiness Survey",
			"project.subtitle": "Awaiting internal review",
			"client.company": "Meridian Marine",
			"client.shortname": "Meridian",
			"client.logo": media("trident-client-03", 960, 540),
			"client.website": "https://example.com/meridian-marine",
			"client.contact": "Leah Kim",
			"client.email": "meridian@example.com",
			"facility.name": "North Harbor Gate",
			"facility.city": "New Orleans",
			"facility.state": "LA",
			"carrier.type": "Sea",
			"carrier.name": "MV Harbor Crest",
			"carrier.photo": media("trident-photo-11"),
			"carrier.documents": ["ships-particulars.pdf", "certifications.pdf"],
			"items.title": "Bulk cargo shipment",
			"items.description":
				"Readiness survey package assembled for internal approval before sailing, with vessel particulars and deck-condition coverage.",
			"team.owner": "Jordan Blake",
			"team.assigned": ["Leah Kim", "Noah Ellis"],
		},
		timeLogDays: [
			{
				dateISO: "2026-05-08",
				entries: [
					{
						time: "06:45",
						text:
							"Met the vessel representative and confirmed the access sequence.",
					},
					{
						time: "08:20",
						text: "Surveyed deck areas and recorded readiness observations.",
					},
				],
			},
			{
				dateISO: "2026-05-09",
				entries: [{
					time: "09:10",
					text: "Compiled summary findings for internal approval.",
				}],
			},
		],
		photoSections: {
			Inspection: [
				{
					title: "Deck Readiness",
					description:
						"Condition coverage for deck access, safety readiness, and visibility.",
					variant: "photos-4",
					photos: [
						photo(
							"trident-photo-12",
							"Deck Access",
							"Deck access and readiness condition on arrival.",
						),
						photo(
							"trident-photo-13",
							"Harbor Approach",
							"Harbor approach with vessel silhouette.",
						),
						photo(
							"trident-photo-14",
							"Gate Approach",
							"Facility gate and support routing near the berth.",
						),
						photo(
							"trident-photo-15",
							"Carrier Reference",
							"Carrier reference frame used in the intro summary.",
						),
					],
				},
			],
			Custom: [
				{
					title: "Bridge Notes",
					description:
						"Extra reference coverage for the readiness conversation and internal review.",
					variant: "photos-2",
					files: ["bridge-notes.pdf"],
					photos: [
						photo(
							"trident-photo-16",
							"Bridge Walkthrough",
							"Bridge-side reference frame captured during the review.",
						),
						photo(
							"trident-photo-17",
							"Readiness Detail",
							"Additional readiness detail included in the custom section.",
						),
					],
				},
			],
		},
		openSections: ["Carrier", "Inspection"],
	},
	{
		key: "seed-preview-004",
		status: "Sent",
		progressPercent: 96,
		fields: {
			...commonOrgFields,
			"project.type": "Cargo",
			"project.title": "Outbound Cargo Condition Report",
			"project.subtitle": "Sent to client for confirmation",
			"client.company": "Harborline Shipping",
			"client.shortname": "Harborline",
			"client.logo": media("trident-client-04", 960, 540),
			"client.website": "https://example.com/harborline-shipping",
			"client.contact": "Cameron Vale",
			"client.email": "harborline@example.com",
			"facility.name": "Channel Yard 6",
			"facility.city": "Mobile",
			"facility.state": "AL",
			"carrier.type": "Sea",
			"carrier.name": "MV Steel Current",
			"carrier.photo": media("trident-photo-18"),
			"carrier.documents": ["condition-summary.pdf", "client-cover-letter.pdf"],
			"items.title": "Steel coil consignment",
			"items.description":
				"Condition findings were sent to the client with supporting imagery and a clear chronology of outbound handling.",
			"team.owner": "Avery Brooks",
			"team.assigned": ["Jordan Blake", "Riley Ford"],
		},
		timeLogDays: [
			{
				dateISO: "2026-05-04",
				entries: [
					{
						time: "07:10",
						text: "Reviewed outbound cargo layout before the loading sequence.",
					},
					{
						time: "09:00",
						text: "Captured representative condition photographs and notes.",
					},
				],
			},
			{
				dateISO: "2026-05-05",
				entries: [{
					time: "11:30",
					text:
						"Delivered the draft report package to the client for confirmation.",
				}],
			},
		],
		photoSections: {
			Inspection: [
				{
					title: "Outbound Cargo Coverage",
					description:
						"Primary outbound cargo coverage prepared for the client-facing draft report.",
					variant: "photos-4",
					photos: [
						photo(
							"trident-photo-19",
							"Cargo Overview",
							"General cargo overview before loading.",
						),
						photo(
							"trident-photo-20",
							"Stack Alignment",
							"Stack alignment and separation before release.",
						),
						photo(
							"trident-photo-21",
							"Packaging Condition",
							"Packaging condition and edge protection.",
						),
						photo(
							"trident-photo-22",
							"Load Preparation",
							"Load preparation sequence captured for the report.",
						),
					],
				},
			],
			Damages: [
				{
					title: "Exception Notes",
					description:
						"Minor exceptions documented for the client review pass.",
					variant: "photos-2",
					photos: [
						photo(
							"trident-photo-23",
							"Surface Marking",
							"Representative surface marking documented for review.",
						),
						photo(
							"trident-photo-24",
							"Edge Wear",
							"Edge wear captured in follow-up detail.",
						),
					],
				},
			],
			Custom: [
				{
					title: "Client Packet",
					description:
						"Extra files and summary frames used for the draft package.",
					variant: "photos-1",
					files: ["client-draft-package.pdf", "export-notes.pdf"],
					photos: [
						photo(
							"trident-photo-25",
							"Client Summary Frame",
							"Summary frame attached to the client packet.",
						),
					],
				},
			],
		},
		openSections: ["Inspection", "Damages"],
	},
	{
		key: "seed-preview-005",
		status: "Complete",
		progressPercent: 100,
		fields: {
			...commonOrgFields,
			"project.type": "Terminal",
			"project.title": "Post-Discharge Review",
			"project.subtitle": "Completed after client revisions",
			"client.company": "Portside Renewables",
			"client.shortname": "Portside",
			"client.logo": media("trident-client-05", 960, 540),
			"client.website": "https://example.com/portside-renewables",
			"client.contact": "Devon Mills",
			"client.email": "portside@example.com",
			"facility.name": "Renewables Terminal West",
			"facility.city": "Corpus Christi",
			"facility.state": "TX",
			"carrier.type": "Road",
			"carrier.name": "Heavy Lift Transfer Fleet",
			"carrier.photo": media("trident-photo-26"),
			"carrier.documents": ["follow-up-request.pdf"],
			"items.title": "Project cargo lot",
			"items.description":
				"Client requested follow-up clarification on discharge observations and revised handling notes.",
			"team.owner": "Mila Carter",
			"team.assigned": ["Devon Mills", "Noah Ellis"],
		},
		timeLogDays: [
			{
				dateISO: "2026-05-02",
				entries: [
					{
						time: "08:05",
						text:
							"Returned to the terminal for the client follow-up walkthrough.",
					},
					{
						time: "09:40",
						text:
							"Verified revised discharge area observations with terminal staff.",
					},
				],
			},
			{
				dateISO: "2026-05-03",
				entries: [{
					time: "13:15",
					text: "Prepared response notes for the requested revisions.",
				}],
			},
		],
		photoSections: {
			Inspection: [
				{
					title: "Revision Walkthrough",
					description:
						"Follow-up walkthrough images for the revised inspection narrative.",
					variant: "photos-2",
					photos: [
						photo(
							"trident-photo-27",
							"Terminal Return",
							"Terminal return walkthrough on the follow-up visit.",
						),
						photo(
							"trident-photo-28",
							"Operations Detail",
							"Operations detail collected for the revision request.",
						),
					],
				},
			],
			Discharge: [
				{
					title: "Discharge Recheck",
					description:
						"Re-checked discharge observations used in the client revision package.",
					variant: "photos-4",
					photos: [
						photo(
							"trident-photo-29",
							"Discharge Lane",
							"Discharge lane observed during follow-up.",
						),
						photo(
							"trident-photo-30",
							"Storage Edge",
							"Storage edge and follow-up access detail.",
						),
						photo(
							"trident-photo-31",
							"Routing Check",
							"Routing check and repositioning detail.",
						),
						photo(
							"trident-photo-32",
							"Close-Out Frame",
							"Close-out frame for the revision packet.",
						),
					],
				},
			],
			Custom: [
				{
					title: "Client Revision Notes",
					description:
						"Files and screenshots gathered for the follow-up response.",
					variant: "photos-1",
					files: ["revision-response.pdf", "client-comments.pdf"],
					photos: [
						photo(
							"trident-photo-33",
							"Revision Packet Cover",
							"A cover frame for the revision-response bundle.",
						),
					],
				},
			],
		},
		openSections: ["Discharge", "Custom"],
	},
	{
		key: "seed-preview-006",
		status: "Archived",
		progressPercent: 100,
		fields: {
			...commonOrgFields,
			"project.type": "Cargo",
			"project.title": "Final Cargo Survey Record",
			"project.subtitle": "Closed survey archive",
			"client.company": "Summit Heavy Lift",
			"client.shortname": "Summit",
			"client.logo": media("trident-client-06", 960, 540),
			"client.website": "https://example.com/summit-heavy-lift",
			"client.contact": "Emerson Vale",
			"client.email": "summit@example.com",
			"facility.name": "Heavy Lift Archive Yard",
			"facility.city": "Savannah",
			"facility.state": "GA",
			"carrier.type": "Road",
			"carrier.name": "Heavy Lift Convoy",
			"carrier.photo": media("trident-photo-34"),
			"carrier.documents": ["final-approval.pdf", "archive-index.pdf"],
			"items.title": "Wind turbine components",
			"items.description":
				"Final approved survey with complete chronology, supporting imagery, and an archive-ready PDF workflow.",
			"team.owner": "Jordan Blake",
			"team.assigned": ["Mila Carter", "Riley Ford", "Noah Ellis"],
		},
		timeLogDays: [
			{
				dateISO: "2026-04-28",
				entries: [
					{
						time: "06:30",
						text:
							"Confirmed the final cargo inventory and documentation package.",
					},
					{
						time: "08:50",
						text:
							"Completed the final condition survey and supporting photography.",
					},
				],
			},
			{
				dateISO: "2026-04-29",
				entries: [
					{
						time: "10:20",
						text:
							"Issued the approved report and archived supporting materials.",
					},
					{
						time: "14:00",
						text:
							"Closed the project after client acknowledgement was received.",
					},
				],
			},
		],
		photoSections: {
			Inspection: [
				{
					title: "Final Inspection Summary",
					description:
						"Complete inspection record prepared for the archive-ready survey output.",
					variant: "photos-4",
					files: ["inspection-summary.pdf"],
					photos: [
						photo(
							"trident-photo-35",
							"Archive Overview",
							"Archive overview frame for the final report.",
						),
						photo(
							"trident-photo-36",
							"Lift Preparation",
							"Lift preparation captured before close-out.",
						),
						photo(
							"trident-photo-37",
							"Cargo Securement",
							"Cargo securement and final restraint detail.",
						),
						photo(
							"trident-photo-38",
							"Yard Position",
							"Final yard position used in the archive package.",
						),
					],
				},
				{
					title: "Supporting Close-Out Frames",
					description:
						"Additional multi-photo coverage for the completed archive workflow.",
					variant: "photos-4",
					photos: [
						photo(
							"trident-photo-39",
							"Close-Out Detail A",
							"Detail frame captured during final review.",
						),
						photo(
							"trident-photo-40",
							"Close-Out Detail B",
							"Secondary close-out detail for the archive.",
						),
						photo(
							"trident-photo-41",
							"Close-Out Detail C",
							"Supporting archive frame from the final pass.",
						),
						photo(
							"trident-photo-42",
							"Close-Out Detail D",
							"Final support frame attached to the report.",
						),
					],
				},
			],
			Damages: [
				{
					title: "Resolved Exceptions",
					description:
						"Prior exceptions retained in the archive for historical reference.",
					variant: "photos-2",
					photos: [
						photo(
							"trident-photo-43",
							"Historical Note",
							"Historical exception frame kept in the archive.",
						),
						photo(
							"trident-photo-44",
							"Resolution Detail",
							"Resolution detail confirming close-out.",
						),
					],
				},
			],
			Discharge: [
				{
					title: "Final Discharge Coverage",
					description:
						"Discharge summary included in the final survey archive.",
					variant: "photos-2",
					photos: [
						photo(
							"trident-photo-45",
							"Discharge Overview",
							"Discharge overview captured for the archive.",
						),
						photo(
							"trident-photo-46",
							"Final Yard Exit",
							"Final exit and close-out traffic movement.",
						),
					],
				},
			],
			Custom: [
				{
					title: "Archive Attachments",
					description:
						"Final extra files and archive imagery used to demonstrate the custom section at full strength.",
					variant: "photos-1",
					files: [
						"archive-summary.pdf",
						"client-acknowledgement.pdf",
						"final-export-proof.pdf",
					],
					photos: [
						photo(
							"trident-photo-47",
							"Archive Cover",
							"Archive cover frame attached to the custom section.",
						),
					],
				},
			],
		},
		openSections: ["Project", "Inspection", "Custom"],
	},
];

const demoProjectSeedByTitle = new Map(
	demoProjectSeeds
		.map((seed) =>
			[
				typeof seed.fields["project.title"] === "string"
					? seed.fields["project.title"].trim()
					: "",
				seed,
			] as const
		)
		.filter(([title]) => Boolean(title)),
);

export function getDemoProjectSeedByTitle(
	title: string,
): DemoProjectSeedType | undefined {
	return demoProjectSeedByTitle.get(title.trim());
}
