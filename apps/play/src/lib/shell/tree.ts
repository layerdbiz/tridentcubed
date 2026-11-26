// The shell's menu (#342) as a tree of the folders and files on play, built from what was found, so a new folder or
// file shows in the menu with nothing else to change. A folder that is a topic opens its page; a topic with more
// than one file lists each file, which opens the topic on that file alone.
import { toLabel, type EntryType } from './catalog';

export type TreeFileType = { key: string; label: string; href: string };

export type TreeType = {
	key: string;
	label: string;
	/** The page this folder opens, when it is a topic. */
	href?: string;
	/** A topic's files, when it has more than one. */
	files: TreeFileType[];
	children: TreeType[];
};

export function toTree(entries: EntryType[]): TreeType[] {
	const root: TreeType = { key: '', label: '', files: [], children: [] };

	for (const entry of entries) {
		let node = root;
		for (const [index, part] of entry.path.entries()) {
			const key = entry.path.slice(0, index + 1).join('/');
			let child = node.children.find((each) => each.key === key);
			if (!child) {
				child = { key, label: toLabel(part), files: [], children: [] };
				node.children.push(child);
			}
			node = child;
		}
		node.href = entry.href;
		if (entry.options.length > 1) {
			node.files = entry.options.map((option) => ({
				key: `${entry.href}#${option.slug}`,
				label: option.label,
				href: `${entry.href}#v=${option.slug}`
			}));
		}
	}

	sort(root);
	return root.children;
}

/** The tree with only what `query` names: a folder that matches keeps everything in it. */
export function toFound(tree: TreeType[], query: string): TreeType[] {
	const words = query.trim().toLowerCase();
	if (!words) return tree;

	const found: TreeType[] = [];
	for (const node of tree) {
		if (node.label.toLowerCase().includes(words)) {
			found.push(node);
			continue;
		}
		const files = node.files.filter((file) => file.label.toLowerCase().includes(words));
		const children = toFound(node.children, words);
		if (files.length || children.length) found.push({ ...node, files, children });
	}
	return found;
}

function sort(node: TreeType) {
	node.children.sort((a, b) => a.label.localeCompare(b.label));
	for (const child of node.children) sort(child);
}
