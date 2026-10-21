// PROTOTYPE (#161) look G: the real Trident Cubed team, from the 'person' tab of the team sheet in Justin's Drive
// (keys he asked to keep: rank, name, title, label, role, phone, email, location, href, profileURL, slug). He chose
// to show phones and emails in this public prototype (2026-10-21). Photos are his Drive copies, shrunk to 192px.

export type TeamMemberType = {
	rank: number;
	name: string;
	title: string;
	label: string;
	role: 'admin' | 'manager' | 'team';
	phone: string;
	email: string;
	location: string;
	href: string;
	profileURL: string;
	slug: string;
};

export const TEAM: TeamMemberType[] = [
	{
		rank: 1,
		name: 'Capt. Cezary Poninski',
		title: 'Partner / Head of Finance',
		label: 'Partner, Finance',
		role: 'admin',
		phone: '+1 (570) 575-1179',
		email: 'C.Poninski@TridentCubed.com',
		location: 'Houston, TX',
		href: 'https://www.linkedin.com/in/cezary-poninski-455b8665',
		profileURL: 'cezary-poninski-profile.png',
		slug: 'capt-cezary-poninski'
	},
	{
		rank: 1,
		name: 'Duncan Cooke',
		title: 'Partner / Head of Engineering',
		label: 'Partner, Engineering',
		role: 'admin',
		phone: '+1 (609) 947-5219',
		email: 'D.Cooke@TridentCubed.com',
		location: 'Fort Myers, FL',
		href: 'https://www.linkedin.com/in/duncan-cooke-780a09113',
		profileURL: 'duncan-cooke-profile.png',
		slug: 'duncan-cooke'
	},
	{
		rank: 1,
		name: 'Michael Boone',
		title: 'Partner / Business Development',
		label: 'Partner, Business',
		role: 'admin',
		phone: '+1 (409) 543-2725',
		email: 'M.Boone@TridentCubed.com',
		location: 'Houston, TX',
		href: 'https://www.linkedin.com/in/michael-boone-79350757',
		profileURL: 'michael-boone-profile.png',
		slug: 'michael-boone'
	},
	{
		rank: 1,
		name: 'Capt. Hector Ramirez',
		title: 'Partner / Head of Projects',
		label: 'Partner, Projects',
		role: 'admin',
		phone: '+1 (832) 477-6974',
		email: 'H.Ramirez@TridentCubed.com',
		location: 'Houston, TX',
		href: 'https://www.linkedin.com/in/hector-ramirez-15860543',
		profileURL: 'hector-ramirez-profile.png',
		slug: 'capt-hector-ramirez'
	},
	{
		rank: 1,
		name: 'Justin ONeill',
		title: 'Frontend Developer',
		label: 'Developer',
		role: 'admin',
		phone: '+1 (512) 663-5940',
		email: 'J.ONeill@TridentCubed.com',
		location: 'Beaumont, TX',
		href: 'https://www.linkedin.com/in/oneezy',
		profileURL: 'justin-oneill-profile.png',
		slug: 'justin-oneill'
	},
	{
		rank: 2,
		name: 'Oziel Lara',
		title: 'Operations Manager',
		label: 'Operations, Manager',
		role: 'manager',
		phone: '+1 (832) 296-4324',
		email: 'O.Lara@TridentCubed.com',
		location: 'Houston, TX',
		href: 'https://www.linkedin.com/in/oziel-l-a31651222',
		profileURL: '',
		slug: 'oziel-lara'
	},
	{
		rank: 2,
		name: 'Collin Tippit',
		title: 'Port Captain / Marine Surveyor',
		label: 'Port Captain, Marine Surveyor',
		role: 'manager',
		phone: '+1 (832) 684-7955',
		email: 'C.Tippit@TridentCubed.com',
		location: 'Houston, TX',
		href: 'https://www.linkedin.com/in/collin-tippit-26aa5798',
		profileURL: 'collin-tippit-linkedin-updated.png',
		slug: 'collin-tippit'
	},
	{
		rank: 2,
		name: 'Gustavo Ruiz',
		title: 'Field Specialist',
		label: 'Field Specialist',
		role: 'manager',
		phone: '+52 833-1065391',
		email: 'G.Ruiz@TridentCubed.com',
		location: 'Tampico, TAM',
		href: 'https://www.linkedin.com/in/gustavo-ruiz-842578328',
		profileURL: 'gustavo-ruiz-linkedin-updated.png',
		slug: 'gustavo-ruiz'
	},
	{
		rank: 2,
		name: 'Alfredo Llanes',
		title: 'Port Captain / Marine Surveyor',
		label: 'Port Captain, Marine Surveyor',
		role: 'manager',
		phone: '+1 (832) 349-0099',
		email: 'A.Llanes@TridentCubed.com',
		location: 'Houston, TX',
		href: 'https://www.linkedin.com/in/alfredo-llanes-34902159',
		profileURL: 'alfredo-llanes-linkedin-updated.png',
		slug: 'alfredo-llanes'
	},
	{
		rank: 3,
		name: 'Tynequa Shaw',
		title: 'Field Specialist / Junior Surveyor',
		label: 'Field Specialist, Junior Surveyor',
		role: 'team',
		phone: '+1 (832) 493-1406',
		email: 'T.Shaw@TridentCubed.com',
		location: 'Houston, TX',
		href: 'https://www.linkedin.com/in/tynequa-shaw-3a893b385',
		profileURL: 'tynequa-shaw-linkedin-updated.png',
		slug: 'tynequa-shaw'
	},
	{
		rank: 3,
		name: 'Juan David Arias',
		title: 'Junior Project Engineer',
		label: 'Engineering, Project Engineer',
		role: 'team',
		phone: '+57 316-049-7396',
		email: 'J.Arias@TridentCubed.com',
		location: 'Cartagena De Indias',
		href: 'https://www.linkedin.com/in/ariasjd',
		profileURL: 'juan-david-arias-linkedin-updated.png',
		slug: 'juan-david-arias'
	},
	{
		rank: 3,
		name: 'Aaron Davis',
		title: 'Field Specialist / Marine Surveyor',
		label: 'Field Specialist, Marine Surveyor',
		role: 'team',
		phone: '+1 (832) 683-3321',
		email: 'A.Davis@TridentCubed.com',
		location: 'Houston, TX',
		href: 'https://www.linkedin.com/in/pc-aarondavis/',
		profileURL: 'aaron-davis-linkedin-updated.png',
		slug: 'aaron-davis'
	},
	{
		rank: 3,
		name: 'Orlando Alexander',
		title: 'Field Engineer / Marine Surveyor',
		label: 'Field Engineer, Marine Surveyor',
		role: 'team',
		phone: '+592-684-3209',
		email: 'O.Alexander@TridentCubed.com',
		location: 'Georgetown, GY',
		href: 'https://www.linkedin.com/in/orlando-alexander-247987268/',
		profileURL: 'orlando-alexander-linkedin-updated.png',
		slug: 'orlando-alexander'
	},
	{
		rank: 3,
		name: 'Chris Fox',
		title: 'Field Specialist / Surveyor',
		label: 'Field Specialist, Surveyor',
		role: 'team',
		phone: '+1 (832) 392-4145',
		email: 'C.Fox@TridentCubed.com',
		location: 'Houston, TX',
		href: 'https://www.linkedin.com/in/chris-fox-857015115/',
		profileURL: '',
		slug: 'chris-fox'
	},
	{
		rank: 3,
		name: 'Ian Derda',
		title: 'Field Specialist / Junior Surveyor',
		label: 'Field Specialist, Junior Surveyor',
		role: 'team',
		phone: '+1 (281) 770-0191',
		email: 'I.Derda@TridentCubed.com',
		location: 'Houston, TX',
		href: 'https://www.linkedin.com/in/ian-derda-99b24226b/',
		profileURL: 'ian-derda-linkedin-updated.png',
		slug: 'ian-derda-'
	},
	{
		rank: 2,
		name: 'Capt. Jim DeStefano',
		title: 'Senior Port Captain',
		label: 'Port Captain',
		role: 'manager',
		phone: '+1 (832) 392-6554',
		email: 'J.DeStefano@TridentCubed.com',
		location: 'Houston, TX',
		href: 'https://www.linkedin.com/in/jim-destefano-67b868297/',
		profileURL: 'jim-destefano-linkedin-updated.png',
		slug: 'capt-jim-destefano'
	},
	{
		rank: 3,
		name: 'Natzul Reyes Flores',
		title: 'Junior Planner / Surveyor',
		label: 'Planner, Surveyor',
		role: 'team',
		phone: '+1 (832) 523-7047',
		email: 'N.Reyes@TridentCubed.com',
		location: 'Houston, TX',
		href: 'https://www.linkedin.com/in/natzul-reyes-206a2b80/',
		profileURL: 'natzul-reyes-flores-linkedin-updated.png',
		slug: 'natzul-reyes-flores'
	}
];

// The Drive photos, shrunk to 192px WebP beside this file, looked up by profileURL.
const PHOTOS = import.meta.glob<string>('./team/*.webp', {
	eager: true,
	query: '?url',
	import: 'default'
});

// Initials on a soft circle for the two people with no photo yet.
function initialsOf(name: string) {
	const letters = name
		.replace(/^Capt\. /, '')
		.split(' ')
		.map((part) => part[0])
		.slice(0, 2)
		.join('');
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#dbe4f0"/><text x="32" y="40" font-family="system-ui,sans-serif" font-size="24" font-weight="600" fill="#475569" text-anchor="middle">${letters}</text></svg>`;
	return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function photoOfMember(member: TeamMemberType) {
	const file = member.profileURL.replace(/\.png$/, '.webp');
	return (file && PHOTOS[`./team/${file}`]) || initialsOf(member.name);
}

export const ROLE_LABELS: Record<TeamMemberType['role'], string> = {
	admin: 'Admin',
	manager: 'Manager',
	team: 'Member'
};
