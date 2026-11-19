import { describe, expect, it } from 'vite-plus/test';
import { utils, write } from 'xlsx';
import {
	fromSaved,
	readFile,
	readText,
	toGrid,
	toSaved,
	toTable,
	type LineType
} from './spreadsheet';

describe('rows pasted from a spreadsheet', () => {
	it('reads tab-separated rows as cells', () => {
		expect(readText('Qty\tDescription\r\n2\tPower transformer\r\n27\tAccessory crate\r\n')).toEqual(
			[
				['Qty', 'Description'],
				['2', 'Power transformer'],
				['27', 'Accessory crate']
			]
		);
	});

	it('keeps a quoted cell whole: its line break, its tab and its doubled quote', () => {
		expect(readText('Item\tNote\n1\t"Crate, 40"" wide\nkeep dry\tthis side up"')).toEqual([
			['Item', 'Note'],
			['1', 'Crate, 40" wide\nkeep dry\tthis side up']
		]);
	});

	it('reads comma-separated and semicolon-separated rows by what the first line uses', () => {
		expect(readText('Qty,Description\n2,"Drill rig, main unit"')).toEqual([
			['Qty', 'Description'],
			['2', 'Drill rig, main unit']
		]);
		expect(readText('Qty;Description\n2;Drill rig')).toEqual([
			['Qty', 'Description'],
			['2', 'Drill rig']
		]);
	});

	it('reads the separator from the whole sheet, not from a title on its first line', () => {
		expect(readText('PACKING LIST\nQty,Description,Weight\n2,Pump skid,"4,100"')).toEqual([
			['PACKING LIST'],
			['Qty', 'Description', 'Weight'],
			['2', 'Pump skid', '4,100']
		]);
	});

	it('reads JSON: a list of records, a list of rows, or an object that holds one', () => {
		expect(
			readText('[{"qty":2,"item":"Drill rig"},{"qty":1,"item":"Mast","note":"long"}]')
		).toEqual([
			['qty', 'item', 'note'],
			['2', 'Drill rig', ''],
			['1', 'Mast', 'long']
		]);
		expect(readText('[["Qty","Item"],[2,"Drill rig"]]')).toEqual([
			['Qty', 'Item'],
			['2', 'Drill rig']
		]);
		expect(readText('{"items":[{"qty":2,"item":"Drill rig"}]}')).toEqual([
			['qty', 'item'],
			['2', 'Drill rig']
		]);
	});

	it('is not a table when it is one cell or nothing', () => {
		expect(readText('Accessory crates')).toBeUndefined();
		expect(readText('  \n')).toBeUndefined();
	});
});

describe('the cells that are kept', () => {
	it('leaves out blank rows and blank columns and says how many', () => {
		const kept = toGrid('list.csv', [
			['Qty', '', 'Description', ''],
			['', '', '', ''],
			['2', '', '  Drill   rig ', ''],
			[null, undefined, '', ''],
			['1', '', 'Mast']
		]);
		expect(kept?.grid).toEqual({
			name: 'list.csv',
			cells: [
				['Qty', 'Description'],
				['2', 'Drill rig'],
				['1', 'Mast']
			]
		});
		expect(kept?.skipped).toEqual({ rows: 2, columns: 2 });
	});

	it('is nothing when no cell holds anything', () => {
		expect(toGrid('empty.csv', [['', ' '], []])).toBeUndefined();
	});
});

// A made-up packing list in the shape customers send: a numbered Item column, headings merged over L, W and H,
// each measure once in inches and pounds and once in meters and kilos, and a totals row.
const PACKING = {
	name: 'packing-list.xlsx',
	cells: [
		[
			'Item',
			'DESCRIPTION',
			'QTY',
			'Dimensions (IN)',
			'',
			'',
			'U/Weight (LBS)',
			'Total Weight (LBS)',
			'Dimensions (M)',
			'',
			'',
			'Total Weight (Kgs)',
			'TTL CBM'
		],
		['', '', '', 'L', 'W', 'H', '', '', 'L', 'W', 'H', '', ''],
		[
			'1',
			'ROTARY DRILL RIG, MAIN UNIT (STATIC)',
			'1',
			'472',
			'204',
			'151',
			'138,600',
			'138,600',
			'11.99',
			'5.18',
			'3.84',
			'62,868',
			'238.26'
		],
		[
			'2',
			'DRILL PIPE RACK',
			'2',
			'366',
			'48',
			'40',
			'9,200',
			'18,400',
			'9.30',
			'1.22',
			'1.02',
			'8,346',
			'23.03'
		],
		['', 'TOTALS', '3', '', '', '', '', '157,000', '', '', '', '71,214', '261.29']
	]
};

// A row as it prints, one string to a column: stacked lines joined by " / ", each with its unit.
function printed(row: LineType[][] | undefined) {
	return (row ?? []).map((cell) =>
		cell.map((line) => [line.text, line.unit].filter(Boolean).join(' ')).join(' / ')
	);
}

describe('the table a packing list prints as', () => {
	it('puts the quantity before the item, after the row numbers', () => {
		const table = toTable(PACKING);
		expect(table.columns.slice(0, 3).map((column) => [column.kind, column.head])).toEqual([
			['index', '#'],
			['quantity', 'QTY'],
			['item', 'DESCRIPTION']
		]);
		expect(printed(table.rows[1]).slice(0, 3)).toEqual(['2', '2', 'DRILL PIPE RACK']);
	});

	it('makes one column of the lengths under a merged heading', () => {
		const table = toTable({ name: '', cells: PACKING.cells.map((row) => row.slice(0, 7)) });
		expect(table.columns.map((column) => [column.head, column.sub])).toEqual([
			['#', ''],
			['QTY', ''],
			['DESCRIPTION', ''],
			['Dimensions (IN)', 'L × W × H'],
			['U/Weight (LBS)', '']
		]);
		expect(printed(table.rows[0])).toEqual([
			'1',
			'1',
			'ROTARY DRILL RIG, MAIN UNIT (STATIC)',
			'472 × 204 × 151',
			'138,600'
		]);
	});

	it('stacks a measure given in two units in one column, each line with its unit', () => {
		const table = toTable(PACKING);
		expect(table.columns.map((column) => column.head)).toEqual([
			'#',
			'QTY',
			'DESCRIPTION',
			'Dimensions',
			'U/Weight (LBS)',
			'Total Weight',
			'TTL CBM'
		]);
		expect(printed(table.rows[0])).toEqual([
			'1',
			'1',
			'ROTARY DRILL RIG, MAIN UNIT (STATIC)',
			'472 × 204 × 151 in / 11.99 × 5.18 × 3.84 m',
			'138,600',
			'138,600 lbs / 62,868 kgs',
			'238.26'
		]);
	});

	it('keeps the totals row apart from the items', () => {
		const table = toTable(PACKING);
		expect(table.rows).toHaveLength(2);
		expect(printed(table.totals)).toEqual([
			'',
			'3',
			'TOTALS',
			'',
			'',
			'157,000 lbs / 71,214 kgs',
			'261.29'
		]);
	});
});

describe('a sheet the guesses do not fit', () => {
	it('prints every cell in the order it came when there are no headings', () => {
		const table = toTable({
			name: '',
			cells: [
				['4', 'Counterweight', '72 in'],
				['3', 'Spare parts crate', '96 in']
			]
		});
		expect(table.columns.map((column) => column.head)).toEqual(['', '', '']);
		expect(table.rows.map(printed)).toEqual([
			['4', 'Counterweight', '72 in'],
			['3', 'Spare parts crate', '96 in']
		]);
	});

	it('leaves the columns where they are when no heading names a quantity', () => {
		const table = toTable({
			name: '',
			cells: [
				['Marks', 'Contents', 'Gross'],
				['GP-1', 'Pump skid', '4,100'],
				['GP-2', 'Valve crate', '650']
			]
		});
		expect(table.columns.map((column) => column.head)).toEqual(['Marks', 'Contents', 'Gross']);
		expect(printed(table.rows[0])).toEqual(['GP-1', 'Pump skid', '4,100']);
	});

	it('keeps the lines above the headings as notes, not as rows', () => {
		const table = toTable({
			name: '',
			cells: [
				['PACKING LIST', '', ''],
				['Shipper:', 'Gulfline Projects', ''],
				['Qty', 'Description', 'Weight'],
				['2', 'Pump skid', '4,100']
			]
		});
		expect(table.notes).toEqual(['PACKING LIST', 'Shipper: Gulfline Projects']);
		expect(table.columns.map((column) => column.head)).toEqual(['Qty', 'Description', 'Weight']);
		expect(table.rows.map(printed)).toEqual([['2', 'Pump skid', '4,100']]);
	});

	it('keeps columns under a merged heading apart when they are not lengths', () => {
		const table = toTable({
			name: '',
			cells: [
				['Qty', 'Description', 'Weight', ''],
				['', '', 'Net', 'Gross'],
				['2', 'Pump skid', '3,900', '4,100']
			]
		});
		expect(table.columns.map((column) => [column.head, column.sub])).toEqual([
			['Qty', ''],
			['Description', ''],
			['Weight', 'Net'],
			['Weight', 'Gross']
		]);
		expect(printed(table.rows[0])).toEqual(['2', 'Pump skid', '3,900', '4,100']);
	});

	it('keeps an Item column that names the item, and its heading', () => {
		const table = toTable({
			name: '',
			cells: [
				['Item', 'Qty', 'Remarks'],
				['Pump skid', '2', 'Keep dry'],
				['Valve crate', '1', '']
			]
		});
		expect(table.columns.map((column) => [column.kind, column.head])).toEqual([
			['quantity', 'Qty'],
			['item', 'Item'],
			['value', 'Remarks']
		]);
	});

	it('does not take a row of words under the headings for a second heading row', () => {
		const table = toTable({
			name: '',
			cells: [
				['Description', '', 'Remarks'],
				['Pump skid', 'steel', 'Keep dry'],
				['Valve crate', 'wood', 'Fragile']
			]
		});
		expect(table.rows).toHaveLength(2);
	});
});

describe('a spreadsheet file', () => {
	it('reads the first sheet with anything on it from an Excel file, numbers as the sheet shows them', async () => {
		const book = utils.book_new();
		utils.book_append_sheet(book, utils.aoa_to_sheet([[]]), 'Cover');
		const sheet = utils.aoa_to_sheet([
			['Qty', 'Description', 'Weight'],
			[2, 'Pump skid', 4100]
		]);
		sheet.C2.z = '#,##0';
		utils.book_append_sheet(book, sheet, 'List');
		const file = new File([write(book, { type: 'array', bookType: 'xlsx' })], 'list.xlsx');
		expect(await readFile(file)).toEqual([
			['Qty', 'Description', 'Weight'],
			['2', 'Pump skid', '4,100']
		]);
	});

	it('reads a CSV file saved by Excel on Windows, accents and all', async () => {
		const bytes = new TextEncoder().encode('Qty,Description\r\n2,Caf');
		const file = new File([bytes, Uint8Array.from([0xe9])], 'list.csv');
		expect(await readFile(file)).toEqual([
			['Qty', 'Description'],
			['2', 'Café']
		]);
	});

	it('reads a JSON file of records', async () => {
		const file = new File(['[{"qty":2,"item":"Pump skid"}]'], 'list.json');
		expect(await readFile(file)).toEqual([
			['qty', 'item'],
			['2', 'Pump skid']
		]);
	});

	it('is not a table when the file is another kind', async () => {
		expect(await readFile(new File(['%PDF-1.7'], 'list.pdf'))).toBeUndefined();
		expect(await readFile(new File(['Some notes about the job'], 'notes.txt'))).toBeUndefined();
	});
});

describe('the grid a project saves', () => {
	it('comes back as it was saved', () => {
		const grid = {
			name: 'list.csv',
			cells: [
				['Qty', 'Description'],
				['2', 'Café "A"']
			]
		};
		expect(fromSaved(toSaved(grid))).toEqual(grid);
	});

	it('is nothing when nothing was saved, or what was saved is not a grid', () => {
		expect(toSaved(undefined)).toBe('');
		expect(fromSaved('')).toBeUndefined();
		expect(fromSaved('{"name":"x"}')).toBeUndefined();
		expect(fromSaved('not json')).toBeUndefined();
		expect(fromSaved('{"name":"x","cells":[]}')).toBeUndefined();
	});
});
