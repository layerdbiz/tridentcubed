# Prototype data audit: what the look prototype stores, derives and still fakes

Written 2026-11-10 after run 16 of the design prototype (`apps/app/src/routes/prototype/look`, issue #161), for the database step that follows. Justin's rule for run 16: nothing on screen may be made up by code, because the next step connects a real database. This lists every value the prototype shows, where it comes from now, and what is still not real.

Read with "Data model and save contract" (#120), which decided the storage shape. Where this audit and #120 differ, #120 is the decision and the difference is listed under Open questions.

## What is stored

Each heading is a list the prototype keeps in the browser (`LookState`, `look.state.svelte.ts`) and edits through one form. These are the candidate tables. Every one carries `created` and `updated` as ISO date-times, set by the app, never typed.

### Organization (one row, edited in Settings)

| Field | Printed or used |
| --- | --- |
| name | Report header, introduction's first words, sidebar, Project panel's Organization |
| logo | Report cover and every page header, sidebar |
| phone, email | Every report page header |
| groupEmail | Last line of the owner's sign-off |
| address, website | Kept; not printed yet |
| disclaimer.opening, disclaimer.points[] (title, text), disclaimer.note | Report's last page |
| closing, signoff | Above the owner's signature |

### Customer

| Field | Printed or used |
| --- | --- |
| name | Everywhere the customer shows; unique |
| code (short code) | Starts the project number and document ID |
| kind (types, several) | Labels, board columns, filter, pie |
| icon, logo | Rows, cards, report footer |
| photo | Picture behind its Page |
| city | Rows, cards, Page, dashboard map pin |
| address, email, phone, website | Its Page |
| contacts[] (id, name, title, email, phone, photo) | Its Page; the one a project picks prints under Customer on the report |

### Team (one person; the page and the record are both called Team)

| Field | Printed or used |
| --- | --- |
| name | Everywhere; unique |
| photo | Every face, the report's personnel list and sign-off |
| title | Its Page, the report's personnel list |
| label (labels, several) | Labels, board columns, filter, pie, sign-off |
| role (admin, manager, team) | Ring colour, sidebar |
| phone, email | Its Page, the report's sign-off |
| location | Rows, Page, map pin |
| seen | The online dot: green within 5 minutes, amber within the hour |
| rank, href, slug, profileURL | From the team sheet; `profileURL` names the photo they came with. Not shown |

### Transport Mode (one ship, barge, plane, train or truck)

| Field | Printed or used |
| --- | --- |
| name | Everywhere; unique |
| type (Sea, Air, Rail, Road) | Label, board, filter, pie |
| mode (Vessel, Barge, Plane...) | Icon, sub-label, which particulars apply |
| photo | Picture behind its Page |
| details{} (particulars by mode) | Its Page; each of its stops' report pages |
| source (manual, api) | Not shown; where a tracking service's rows will merge |

### Facility

| Field | Printed or used |
| --- | --- |
| name | Everywhere; unique |
| kind (Port, Airport, Rail yard, Depot) | Label, board, filter, pie, icon |
| city | Rows, Page, map pin, a project's route |
| address | Its Page; the stop's report page |
| photo | Picture behind its Page |
| contact, phone, email (one person) | Its Page; the stop's report page |

### Project

| Field | Printed or used |
| --- | --- |
| id | Links |
| title, subtitle | Rows, cards, Page, report cover and report page |
| type (Project Type) | Page, report |
| client (customer's name) | Rows, cards, Page, report footer, project number |
| contact (id of one of the customer's contacts) | Report, under Customer |
| location | Page, map pin, report |
| team[] (owner first) | Faces, report personnel, sign-off |
| status, before | Colours, board, filter, pie; Unsend |
| stops[] (point, transport, facility) | Route on rows and cards, Page |
| progress | Bars and percents (kept; recomputed from the panels) |
| created, updated | Project number, "Created", "Updated", charts, Recent |

A project also has its panels: Project (the fields above), Transport (stops: point, type, mode, name, facility), Items (quantity, description), Time Log (days: date, entries: time, activity), and photo panels (groups: title, description, layout, photos: src, description). #120 already decided how these are stored.

## What is derived, never stored

| Shown | Derived from |
| --- | --- |
| Project number (`CVA-2026-05-12-J01`) | Customer's code, the project's `created` day, its place among that customer's projects that day |
| Document ID | Project number plus `-FR01-R01` (report and revision numbers are fixed at 01 until revisions exist) |
| Report dates | The Time Log's dated days, first to last; before any, the project's `created` day |
| "Updated 5 min ago", "Created Tue, 12 May 2026" | `updated`, `created` |
| Dashboard charts (area, bars) and "▲ 3 this week" | Count of rows whose `created` is on or before each point |
| Count cards, pie slices, filters, board columns | Live counts of the lists |
| Recent, and the bell's list | The eight rows changed last, by `updated`; "Added" when never changed since it was made |
| Online dot | `seen` |
| A record's Projects, Open, Customers, Team numbers | The projects that use it |
| A transport's "Last seen in" | The city of its last stop's facility on the newest project |
| Report contents, page numbers, QR code, barcode line | The pages and the document ID |

## What changed in run 16

- A project's Edit panel is the project. Before, the panel kept its own copy of title, subtitle, type, customer, location and team, and the project's Page, rows and cards kept showing the old values. An effect now copies the panel onto the project row as it changes.
- The Customer drop-down reads the Customers list live, and "Add new" makes a real customer. Before, it only added a word to that one drop-down.
- One form per record (`record-fields.svelte`) serves the + sheet and the Edit tab. One Project panel (`panel-body.svelte`) serves a project's Edit and the + sheet's New Project.
- Removed: the made-up chart history, the written list of Recent items, the made-up `TC-24031` project numbers, the typed "12 min ago" and "Tue, 12 May 2026" strings, the made-up online dots, and the Time Log's "Add a sample day" button.

## What is still not real

These need a decision or a service before the database is the only source.

1. **Sample rows.** The eight projects, ten transports and nine facilities are invented; the ten customers are real names with real logos and nothing else; the team is the real team. Every sample project's Time Log, items and photos come from one template. They become seed rows or are dropped.
2. **Who is signed in.** Fixed to one person (`ME` in `look.data.ts`) until sign-in exists. Only that person's `seen` is ever set, so everyone else shows offline.
3. **Map pins.** A city is placed by a lookup table of about thirty cities (`map.data.ts`). A city not in it gets no pin. The database needs latitude and longitude on customers, team, facilities and projects, filled by a geocoder.
4. **Stock pictures.** A record with no picture of its own shows a stock picture chosen by its type. A display fallback, not data.
5. **Sent copy, revisions, Trash.** Mark Sent changes the status only. Deleting removes the row; nothing is kept in Trash. The report and revision numbers never go past 01.
6. **Saving.** "Saved" is shown on a timer. Everything is kept in the browser's `localStorage` under one key.
7. **Stubs.** Send, Download, and the invitation email to a new Team.
8. **Uploaded images.** Kept as data URLs inside the row. They belong in file storage, with the row holding the path.

## Open questions

1. **Customers are kept in two places** in the prototype: a list of names, and a list of edited or added rows over a fixed pack. The database has one customers table; the prototype's split should not be copied.
2. **Records are known by name.** A rename is copied into every project and panel that uses it. With ids this copying goes away: projects, stops and panels should hold the id.
3. **Project and Project panel.** #120 stores one row per value, labelled by its input id. The prototype now treats the Project panel's values as the project's own columns. Decide which of those values are columns of the project (title, subtitle, type, customer, contact, location, owner) and which stay per-value rows.
4. **Names.** Justin, 2026-11-10: one of the Team is a "Team", and one of Transport Mode is a "Transport Mode", both words capitalised. The glossary still uses Transport mode for Vessel, Barge and the rest, so the record and one of its own fields now share a name. Pick the table and column names before the schema is written.
5. **Facility contact** is one person; a customer has several. Decide whether facilities get the same contacts list.
6. **Roles.** The prototype has admin, manager and team; #118 decided Admin and Member.
