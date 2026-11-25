// Every prototype on play.tridentcubed.com is one standalone HTML file, `src/prototypes/<topic>/<option>.html`
// (#342). Vite copies each file into the build untouched and hands back its address; these pages only list the
// files and show one in a frame, so adding a prototype is adding a file.

export type PrototypeType = {
	topic: string;
	option: string;
	label: string;
	url: string;
};

export type TopicType = {
	topic: string;
	label: string;
	options: PrototypeType[];
};

const FILE_PATH = /^\/src\/prototypes\/([^/]+)\/([^/]+)\.html$/;

const files = import.meta.glob('/src/prototypes/*/*.html', {
	query: '?url',
	import: 'default',
	eager: true
}) as Record<string, string>;

export const prototypes = toPrototypes(files);
export const topics = toTopics(prototypes);

export function toPrototypes(found: Record<string, string>): PrototypeType[] {
	const list: PrototypeType[] = [];

	for (const [path, url] of Object.entries(found)) {
		const match = FILE_PATH.exec(path);
		if (!match) continue;

		const [, topic, option] = match;
		list.push({ topic, option, label: toLabel(option), url });
	}

	return list.toSorted(
		(a, b) => a.topic.localeCompare(b.topic) || a.option.localeCompare(b.option)
	);
}

export function toTopics(list: PrototypeType[]): TopicType[] {
	const byTopic = new Map<string, TopicType>();

	for (const prototype of list) {
		const topic = byTopic.get(prototype.topic) ?? {
			topic: prototype.topic,
			label: toLabel(prototype.topic),
			options: []
		};
		topic.options.push(prototype);
		byTopic.set(prototype.topic, topic);
	}

	return [...byTopic.values()];
}

export function findPrototype(topic: string, option: string): PrototypeType | undefined {
	return prototypes.find((prototype) => prototype.topic === topic && prototype.option === option);
}

/** `menus` reads Menus, `a` reads A, `side-menu` reads Side Menu. */
export function toLabel(slug: string): string {
	return slug.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
