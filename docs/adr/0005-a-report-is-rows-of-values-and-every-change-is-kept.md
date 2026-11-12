---
status: accepted
---

# A report is rows of values, and every change is kept

Report Generator V1 stores a report as rows, not as one document: one row per Value, labelled with the id of its input from the definitions, and one row per thing that repeats (Panels, Panel sections, Photo groups, Photos, Time log days and Entries, the Team), each with its position. Clients, Facilities and Carriers are organization-wide lists a project picks from, so a name typed once is used everywhere, project numbers and file names included. Every change to a row is recorded (who, when, before, after), and when two people change the same Value the last change to reach the server wins. Justin wants every input to save itself like a Google Doc with no Save button, two people on one report at once, surveyors working offline, and a history he can go back through later; the prototype's one blob per report makes two saves overwrite each other and a phone back online resend the whole report. Decided on 2026-10-07 ([#120](https://github.com/layerdbiz/tridentcubed/issues/120)).

## Considered options

- One document per report (the prototype's shape): the fewest tables, but two people saving at once overwrite each other unless the app merges documents, every keystroke resends the whole report, and history is a diff of blobs.
- A database column for every input: typed and easy to chart, but every new or retired input needs a database migration, and the definitions already say what each input is (they live in code, decided on #48).
- Keeping both values when two people change the same Value and asking someone to choose: safer, but more to build and to explain; Justin chose the simplest rule and to fine-tune it after testing. The change record means a lost value can still be found.

## Consequences

- Ids are made on the device when a row is created, so a report built offline keeps its ids on the server and a retried save can never make a duplicate.
- Adding an input is a change to the definitions only. An input's id is never reused; a retired input is hidden on new reports and its old Values are kept.
- Moving a project to Sent freezes a Sent copy: the PDF and every Value as it was. A Sent report always prints from its Sent copy; changing it moves the project to Revision, and the next send freezes a new copy with the next revision number.
- One generic `command` remote function receives batches of Value changes, so an input saves itself with no remote function of its own (the `persist` idea); actions that are not typing (create a project, change its status, move it to Trash) get their own commands. How the batches queue on the phone is decided on "Offline editing and the sync engine" (#122).
- The change record grows with every keystroke batch; it is small text, and the history screen that reads it comes after V1.
- Picking a Client, Facility or Carrier links it: fixing a typo in the list updates every Draft that uses it, while Sent copies keep what they printed. A person's job title, phone and email are copied onto a report from their profile and edited there.

## Amendment, 2026-11-12

Decided on "Sign in and save to the real database" ([#179](https://github.com/layerdbiz/tridentcubed/issues/179)), on autopilot and for Justin's review.

- **One save command for every table.** The generic command takes batches of row changes (put or delete, each naming its table, its row id, the changed columns and a change id made on the device) for every table that syncs, not only Values. Each such table is declared once in the row registry (its columns, its parent, its validation, its rules), which the save command, the queries and the mapper all read, so a new table is one entry and no new endpoint. This is also the shape PowerSync uploads in (ADR 0006).
- **Named commands only for what is not a row.** Creating a project, changing its status, a role change and moving to the Trash are row changes too, and the server derives the rule from the change itself (the table, the columns, the row as it stands). This replaces "actions that are not typing get their own commands" above. Named commands remain for asking for an upload address, looking a place up and exporting a PDF.
- **No one-row-per-Value table yet.** Every value the look prototype has is a column of its record or a row of something that repeats. The Value table arrives with definition-driven inputs.
- The organization-wide lists a project picks from are Customers, Team, Transports, Facilities and Places; Carriers are not in V1.
