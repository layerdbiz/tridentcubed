import { describe, expect, it } from 'vite-plus/test';
import { linkNameOf, toLink } from './link';

describe('the address a typed link opens', () => {
	it('is the link as pasted', () => {
		expect(toLink('https://1drv.ms/f/s!AkR3xyz')).toBe('https://1drv.ms/f/s!AkR3xyz');
		expect(toLink('  https://nmt.sharepoint.com/:f:/s/Projects/Susana?e=4%3aAbC  ')).toBe(
			'https://nmt.sharepoint.com/:f:/s/Projects/Susana?e=4%3aAbC'
		);
	});

	it('gets https:// when it was typed without', () => {
		expect(toLink('1drv.ms/f/abc')).toBe('https://1drv.ms/f/abc');
		expect(toLink('onedrive.live.com:443/folder')).toBe('https://onedrive.live.com/folder');
	});

	it('is nothing for what is not a web address', () => {
		for (const typed of [
			undefined,
			'',
			'   ',
			'ask Michael for the folder',
			'onedrive',
			'javascript:alert(1)',
			'JavaScript://x.y/%0aalert(1)',
			'data:text/html,hello',
			'file:///C:/Users/michael/OneDrive',
			'mailto:michael@nmt.example',
			'https://michael:secret@1drv.ms/f/abc'
		])
			expect(toLink(typed)).toBe('');
	});
});

describe('what the report calls where a link goes', () => {
	it('says OneDrive for a OneDrive or SharePoint folder', () => {
		for (const link of [
			'https://1drv.ms/f/s!AkR3xyz',
			'https://onedrive.live.com/?id=root',
			'https://nmt-my.sharepoint.com/:f:/g/personal/michael/abc'
		])
			expect(linkNameOf(link)).toBe('OneDrive');
	});

	it('names the other common places, and any other site by its address', () => {
		expect(linkNameOf('https://drive.google.com/drive/folders/abc')).toBe('Google Drive');
		expect(linkNameOf('https://www.dropbox.com/scl/fo/abc')).toBe('Dropbox');
		expect(linkNameOf('https://www.files.example.com/susana')).toBe('files.example.com');
		expect(linkNameOf('https://notonedrive.live.com.example/x')).toBe(
			'notonedrive.live.com.example'
		);
		expect(linkNameOf('not a link')).toBe('');
	});
});
