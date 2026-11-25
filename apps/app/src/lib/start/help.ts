// The first draft of every input's Help text (#299), as the seed writes it into the `help_text` table. Only a new
// database takes these rows: once a row is there, the database's copy is the one the app shows and changing a line
// here changes nothing. Justin asks for a change, an agent edits the row, and everyone sees it on their next page.
// Keys name the input as `<where>.<input>`; a key in this list is one the screens ask for (look.state.svelte.ts
// `helpOf`).
export type HelpType = { key: string; label: string; text: string };

export const HELP: readonly HelpType[] = [
	// The Project panel.
	{
		key: 'project.title',
		label: 'Title',
		text: 'The project’s name in a few words, such as the cargo and the place. It prints large on the cover and heads the Project Report page.'
	},
	{
		key: 'project.subtitle',
		label: 'Subtitle',
		text: 'A second line under the title, such as the vessel or the stage of the job. It prints under the title on the cover.'
	},
	{
		key: 'project.description',
		label: 'Description',
		text: 'The report’s opening sentence: who was where, when and for what. The app writes it from the panels until you reword it; what you type prints in its place, and the reset brings the app’s sentence back.'
	},
	{
		key: 'project.type',
		label: 'Project Type',
		text: 'What kind of job this is: Cargo, Vessel Condition, Warehousing, Draft Survey or Bunker. It prints on the cover.'
	},
	{
		key: 'project.createdDate',
		label: 'Created Date',
		text: 'The day the job began. It is the date inside the project number, after the customer’s Short Code.'
	},
	{
		key: 'project.jobNumber',
		label: 'Job Number',
		text: 'Which job this is for the customer on that date, counted from 1. The app fills in the next free one; type a number to use your own. It ends the project number.'
	},
	{
		key: 'project.number',
		label: 'Project Number',
		text: 'The project’s reference, made by the app from the customer’s Short Code, the Created Date and the Job Number; nobody types it. It prints in every page’s footer and starts the report’s file name.'
	},
	{
		key: 'project.customer',
		label: 'Customer',
		text: 'Who the report is for. Their logo prints on every page, and their Short Code starts the project number.'
	},
	{
		key: 'project.contact',
		label: 'Contact',
		text: 'The person at the customer the report is for. Their name, title and email print under the customer. Add contacts on the customer’s page.'
	},
	{
		key: 'project.referenceNumber',
		label: 'Reference Number',
		text: 'The customer’s own number for this job, if they gave one, such as their order number. It prints after the customer’s name. Optional.'
	},
	{
		key: 'project.organization',
		label: 'Organization',
		text: 'The company doing the job. Its logo, letterhead, disclaimer and sign-off print on the report.'
	},
	{
		key: 'project.teamLead',
		label: 'Team Lead',
		text: 'Who leads the job and signs the report. Their photo and contact details print with the sign-off.'
	},
	{
		key: 'project.teamAssigned',
		label: 'Team Assigned',
		text: 'Everyone else from the team who works on this job. They print on the Project Report page.'
	},
	{
		key: 'personnel.company',
		label: 'Company',
		text: 'Another company with people on the job, such as the stevedores or the agent. Type its name or pick a customer.'
	},
	{
		key: 'personnel.name',
		label: 'Name',
		text: 'One person from that company, first and last name.'
	},
	{
		key: 'personnel.title',
		label: 'Title',
		text: 'What that person does on the job, such as Foreman or Agent.'
	},
	{
		key: 'personnel.phone',
		label: 'Phone',
		text: 'A number to reach that person on. It prints on their card on the Project Report page, as a link to tap. Leave it empty if you don’t have one.'
	},
	{
		key: 'personnel.email',
		label: 'Email',
		text: 'An email address to reach that person at. It prints under the phone on their card, as a link to tap. Leave it empty if you don’t have one.'
	},

	// The Transport Mode panel.
	{
		key: 'leg.mode',
		label: 'Transport Mode',
		text: 'How the cargo travels on this leg: by vessel, barge, plane, train, railcar, truck or trailer.'
	},
	{
		key: 'leg.transport',
		label: 'Vessel, truck or other carrier',
		text: 'The one that carries the cargo on this leg. Pick it from the Transport Mode page or add a new one; its particulars print on the report.'
	},
	{
		key: 'stop.facility',
		label: 'Facility',
		text: 'Where each stop of the leg is: a port, airport, rail yard or depot. Hold a stop and drag it to change the order.'
	},
	{
		key: 'stop.point',
		label: 'Point',
		text: 'What the stop is on the trip: the Start, a Stop along the way, or the End.'
	},

	// The Items panel.
	{
		key: 'item.quantity',
		label: 'Quantity',
		text: 'How many of the item there are.'
	},
	{
		key: 'item.description',
		label: 'Description',
		text: 'What the item is, such as Accessory crates. Rows pasted from a spreadsheet become the items table.'
	},

	// The Time Log panel.
	{
		key: 'timeLog.date',
		label: 'Date',
		text: 'The day these entries happened.'
	},
	{
		key: 'timeLog.time',
		label: 'Time',
		text: 'When it happened, on the 24-hour clock, such as 07:30.'
	},
	{
		key: 'timeLog.activity',
		label: 'Activity',
		text: 'What happened at that time, in a few words.'
	},

	// The photo panels (Operations, Damages and the ones added).
	{
		key: 'panel.title',
		label: 'Title',
		text: 'The panel’s name. It heads the panel’s pages in the report; left empty, the panel keeps its own name.'
	},
	{
		key: 'panel.link',
		label: 'URL',
		text: 'The address of the project’s folder elsewhere, such as OneDrive. It prints on the Project Report page and on this panel’s first page. Optional.'
	},
	{
		key: 'group.title',
		label: 'Title',
		text: 'The name of this stage or group of photos. It heads its photos in the report.'
	},
	{
		key: 'group.description',
		label: 'Description',
		text: 'A few words about these photos. It prints with them in the report. Optional.'
	},
	{
		key: 'group.layout',
		label: 'Photos per Page',
		text: 'How many of these photos print on one report page: fewer means bigger photos.'
	},

	// A customer's page.
	{
		key: 'customer.logo',
		label: 'Logo',
		text: 'The customer’s logo. It shows on their rows and cards, and in the footer of every report page.'
	},
	{
		key: 'customer.name',
		label: 'Name',
		text: 'The customer’s company name, as it prints on the report.'
	},
	{
		key: 'customer.code',
		label: 'Short Code',
		text: 'Up to five letters or digits that start the customer’s project numbers and document IDs. Left empty, it is made from the name.'
	},
	{
		key: 'customer.types',
		label: 'Type',
		text: 'What kind of company the customer is, such as Carrier or Freight Forwarder. Pick as many as fit.'
	},
	{
		key: 'customer.city',
		label: 'Location',
		text: 'Where the customer’s office is. Start typing its address and pick it. Lists and reports show only its city and state.'
	},
	{
		key: 'customer.email',
		label: 'Email',
		text: 'The customer’s main email address.'
	},
	{
		key: 'customer.phone',
		label: 'Phone',
		text: 'The customer’s main phone number.'
	},
	{
		key: 'customer.website',
		label: 'Website',
		text: 'The customer’s website address.'
	},
	{
		key: 'customer.picture',
		label: 'Background Picture',
		text: 'The picture behind the customer’s page. Without one, their type’s stock picture shows.'
	},
	{
		key: 'contact.photo',
		label: 'Photo',
		text: 'The contact’s photo, shown beside their name.'
	},
	{
		key: 'contact.name',
		label: 'Name',
		text: 'The contact’s first and last name. It prints under the customer on a report for them.'
	},
	{
		key: 'contact.title',
		label: 'Title',
		text: 'The contact’s job title. It prints after their name.'
	},
	{
		key: 'contact.email',
		label: 'Email',
		text: 'The contact’s email address. It prints under the customer on a report for them.'
	},
	{
		key: 'contact.phone',
		label: 'Phone',
		text: 'The contact’s phone number.'
	},

	// A Team record's page.
	{
		key: 'team.photo',
		label: 'Photo',
		text: 'Their photo. It shows wherever they do, and beside their sign-off on a report they lead.'
	},
	{
		key: 'team.name',
		label: 'Name',
		text: 'Their first and last name.'
	},
	{
		key: 'team.role',
		label: 'Role',
		text: 'What they may do in the app: an Admin may do everything, a Manager also changes the organization, and Team does the jobs. Only an Admin changes it.'
	},
	{
		key: 'team.title',
		label: 'Title',
		text: 'Their job title. It prints under their name on the report.'
	},
	{
		key: 'team.labels',
		label: 'Labels',
		text: 'What they do, such as Surveyor. Pick as many as fit.'
	},
	{
		key: 'team.phone',
		label: 'Phone',
		text: 'Their phone number. It prints with their sign-off.'
	},
	{
		key: 'team.email',
		label: 'Email',
		text: 'The email they sign in with. It prints with their sign-off.'
	},
	{
		key: 'team.location',
		label: 'Location',
		text: 'Where they are based. Start typing their address and pick it, so their pin sits in the right place. Only their city and state ever show.'
	},

	// A Transport Mode's page.
	{
		key: 'transport.name',
		label: 'Name',
		text: 'The vessel’s, truck’s or other carrier’s name, as it prints on the report.'
	},
	{
		key: 'transport.mode',
		label: 'Transport Mode',
		text: 'What it is: a vessel, barge, plane, train, railcar, truck or trailer. It decides which particulars it has.'
	},
	{
		key: 'transport.picture',
		label: 'Picture',
		text: 'The picture behind its page and on the report. Without one, its transport mode’s stock picture shows.'
	},
	{
		key: 'particular.imoNumber',
		label: 'IMO number',
		text: 'The vessel’s seven-digit IMO number. It prints on the report page of every stop the vessel is on.'
	},
	{
		key: 'particular.flag',
		label: 'Flag',
		text: 'The country it is registered in.'
	},
	{
		key: 'particular.yearBuilt',
		label: 'Year built',
		text: 'The year it was built.'
	},
	{
		key: 'particular.grossTonnage',
		label: 'Gross tonnage',
		text: 'The vessel’s gross tonnage.'
	},
	{
		key: 'particular.lengthOverall',
		label: 'Length overall',
		text: 'The vessel’s length from end to end, with its unit, such as 180 m.'
	},
	{
		key: 'particular.registration',
		label: 'Registration',
		text: 'Its registration number or mark.'
	},
	{
		key: 'particular.deckSize',
		label: 'Deck size',
		text: 'The size of the barge’s deck, with its unit.'
	},
	{
		key: 'particular.deadweight',
		label: 'Deadweight',
		text: 'How much the barge can carry, with its unit.'
	},
	{
		key: 'particular.flightNumber',
		label: 'Flight number',
		text: 'The flight’s number, such as AB1234.'
	},
	{
		key: 'particular.aircraftType',
		label: 'Aircraft type',
		text: 'The aircraft’s make and model.'
	},
	{
		key: 'particular.airline',
		label: 'Airline',
		text: 'The airline that flies it.'
	},
	{
		key: 'particular.trainNumber',
		label: 'Train number',
		text: 'The train’s number.'
	},
	{
		key: 'particular.railroad',
		label: 'Railroad',
		text: 'The railroad that runs it.'
	},
	{
		key: 'particular.cars',
		label: 'Cars',
		text: 'How many cars the train has.'
	},
	{
		key: 'particular.carNumber',
		label: 'Car number',
		text: 'The railcar’s number, as marked on its side.'
	},
	{
		key: 'particular.carType',
		label: 'Car type',
		text: 'What kind of railcar it is, such as flatcar or boxcar.'
	},
	{
		key: 'particular.plateNumber',
		label: 'Plate number',
		text: 'Its licence plate.'
	},
	{
		key: 'particular.haulier',
		label: 'Haulier',
		text: 'The company that runs it.'
	},
	{
		key: 'particular.axles',
		label: 'Axles',
		text: 'How many axles the truck has.'
	},
	{
		key: 'particular.trailerType',
		label: 'Trailer type',
		text: 'What kind of trailer it is, such as flatbed or lowboy.'
	},
	{
		key: 'particular.deckLength',
		label: 'Deck length',
		text: 'The length of the trailer’s deck, with its unit.'
	},

	// A Facility's page.
	{
		key: 'facility.name',
		label: 'Name',
		text: 'The facility’s name, such as the port or the berth, as it prints on the report.'
	},
	{
		key: 'facility.kind',
		label: 'Kind',
		text: 'What it is: a port, airport, rail yard or depot.'
	},
	{
		key: 'facility.city',
		label: 'Location',
		text: 'Where it is. Start typing its address and pick it. The report page of every stop there prints the whole address; everywhere else shows its city and state.'
	},
	{
		key: 'facility.picture',
		label: 'Picture',
		text: 'The picture behind its page. Without one, its kind’s stock picture shows.'
	},
	{
		key: 'facility.contactName',
		label: 'Name',
		text: 'Who to call there. It prints on the report page of every stop there.'
	},
	{
		key: 'facility.phone',
		label: 'Phone',
		text: 'The number to call there. It prints with the contact’s name.'
	},
	{
		key: 'facility.email',
		label: 'Email',
		text: 'The email address to reach them there.'
	},

	// Settings: the organization.
	{
		key: 'organization.logo',
		label: 'Logo',
		text: 'The organization’s logo. It prints at the top of every report page and on the cover.'
	},
	{
		key: 'organization.name',
		label: 'Name',
		text: 'The organization’s name, as it prints on the report.'
	},
	{
		key: 'organization.address',
		label: 'Location',
		text: 'Where the organization is. Start typing its address and pick it.'
	},
	{
		key: 'organization.phone',
		label: 'Phone',
		text: 'The organization’s phone number. It prints at the top of every report page.'
	},
	{
		key: 'organization.email',
		label: 'Email',
		text: 'The organization’s email address. It prints at the top of every report page.'
	},
	{
		key: 'organization.groupEmail',
		label: 'Group Email',
		text: 'The shared inbox. It prints last in the sign-off, under the team lead’s phone and email.'
	},
	{
		key: 'organization.website',
		label: 'Website',
		text: 'The organization’s website address.'
	},
	{
		key: 'disclaimer.opening',
		label: 'Opening',
		text: 'The disclaimer’s first lines, before its points.'
	},
	{
		key: 'disclaimer.pointTitle',
		label: 'Title',
		text: 'A disclaimer point’s heading, in a few words.'
	},
	{
		key: 'disclaimer.pointText',
		label: 'Text',
		text: 'What the disclaimer point says.'
	},
	{
		key: 'disclaimer.note',
		label: 'Closing Note',
		text: 'The disclaimer’s last lines, after its points.'
	},
	{
		key: 'organization.closing',
		label: 'Thank-you Line',
		text: 'The line on the disclaimer page before the sign-off.'
	},
	{
		key: 'organization.signoff',
		label: 'Sign-off',
		text: 'The words before the team lead’s name at the end of the report, such as Kind regards.'
	}
];
