# Trident business

The vocabulary of Trident Cubed's marine survey business and the apps that serve it. The Report Generator's words live here; the reusable UI's words live in `packages/ui/GLOSSARY.md` and never depend on these.

## Language

### The company and its apps

**Trident Cubed**:
The organization: a marine survey company. The Organization panel is prefilled with it.
_Avoid_: Trident (alone, in code), tridentcubed (that is the domain and the repo)

**Report Generator**:
The product in `apps/app`: it turns a project's inputs into a report.
_Avoid_: the app, survey app

**Website**:
tridentcubed.com, the marketing site in `apps/site`.

**Playground**:
`apps/play`, where UI ideas are tried with no rules.

**Company overview**:
`apps/overview`, an overview of the company itself: employees, competitors, market research. Nothing to do with reports.
_Avoid_: dashboard, report app, slideshow

**Prototype**:
The Report Generator as built before V1: the `apps/app` that saves to the browser only. Kept under `.archive/apps/app` as reference once the V1 app exists, deleted when V1 ships; concepts are taken from it, code is not.
_Avoid_: the old app, legacy app, V0

### Signing in and access

**User**:
Anyone who can sign in to the Report Generator, identified by a verified email address, whichever way they signed in: an Admin, a Member or a Guest.
_Avoid_: account, login, member

**Guest**:
A User with no membership in any organization. A Guest sees only their own account page.
_Avoid_: visitor, pending, unassigned

**Organization**:
A group of Users who share access to its projects. Trident Cubed is the first; customer organizations come later. Its details (name, logo, address, phone, email, group email, website, disclaimer and sign-off wording) are kept once, edited by its admins, and printed on every report: the logo, name, phone and email in each page's header, the disclaimer and sign-off on the last page. The design prototype edits them on its Settings screen (run 15).
_Avoid_: team, company, workspace

**Membership**:
A User's place in an organization, with one role: Admin or Member.
_Avoid_: seat, staff record

**Admin**:
The role that runs an organization: its users, its settings and all its projects.
_Avoid_: owner, superuser

**Super admin**:
The one User above every organization, who can see and fix any of them and can never be demoted or deactivated.
_Avoid_: root, platform owner

**Deactivated**:
A User who can no longer sign in, kept with their history and shown greyed out. Reactivating undoes it.
_Avoid_: banned, suspended, removed, deleted

**Member**:
The role of an organization's staff: opens and edits any of its projects and deletes the Drafts they created, but does not manage its users.
_Avoid_: staff, editor, surveyor, team member

### Projects and reports

**Customer**:
The company a project is done for, kept once in the organization's list with its full name and a short code (SGL) that project numbers and file names use. A customer has many projects. Its record also holds its logo (printed in every page's footer), types, city, address, email, phone, website, a background picture and any number of contacts. Picking a customer's name in a project fills all of it in. Called Client until 2026-10-26.
_Avoid_: client, account

**Project**:
One job for a customer. A project owns exactly one report; a job that needs a second report, such as a cargo report split by booking, is not modelled yet.
_Avoid_: job, survey (alone)

**Project number**:
A project's reference: the customer's short code, the day the project was created and J with which of that customer's jobs that day it is, SGL-2026-02-03-J01 for the first and -J02 for the second. A customer sometimes assigns two or three in a day. It can be edited.
_Avoid_: job number, reference, queue number

**Document ID**:
The report's identifier and the name of its exported file: the project number, FR with the report number and R with the revision number, SGL-2026-02-03-J01-FR01-R01 (Trident Cubed's pick, 2026-10-09). The file name may end with the transport's name after a triple dash, SGL-2026-02-03-J01-FR01-R01---BBC-Kimberly.pdf.Every report page prints it in the footer, under the customer's name.
_Avoid_: file name, job number

**Report number**:
Which of a project's reports this is: 01 for the first, 02 when the same job gets a second report. Always 01 while a project owns exactly one report.
_Avoid_: sequence number

**Revision number**:
How many times a report has been sent: 01 for the first send, one more for each send after a Revision. It is the last part of the document ID.

**Project type**:
One of Cargo, Warehousing, Warranty, Vessel Condition, Draft Survey, Bunker, IHM, Terminal.
_Avoid_: report type, Draft (for the type; Draft is a status)

**Project status**:
One of Draft, In Progress, Review, Ready, Sent, Revision, Complete, Archived, in that order. Review is Trident's own check; Ready means finished, for the team to export and send. Sent is marked by hand once the report has gone to the customer, and freezes a Sent copy. Unsend takes back a Sent mark made by mistake: the project returns to the status it had before. A Sent or Complete project is read only. After Sent a project goes to Revision (the customer asked for changes; work resumes and it is sent again) or to Complete, marked by hand when the customer accepts. Only an admin archives a project. Changes before Sent apply in any status and never move a project to another status, with one exception (Justin, 2026-11-10): a Draft becomes In Progress by itself once its Project panel is complete. Any status can also be set by hand from Change Status.
_Avoid_: approved, Ready for Review, in-progress, completed

**Sent copy**:
The report and every value as they were when the project was marked Sent. It never changes, and a Sent report prints from it. Changes that reach the server after the project was marked Sent are kept in the history, not applied.
_Avoid_: snapshot, frozen copy

**History**:
The record of every change to a project: who changed what, when, and what it was before.
_Avoid_: log (that is the time log), audit trail

**Report**:
The document a project produces: its panels rendered as report pages.
_Avoid_: survey report, document

**Contact**:
A person at a customer: name, title, email, phone and photo, kept on the customer's record. A customer has any number; a project picks the one its report is for, and the report prints their name, title and email under the customer. A facility has a simpler one: a name, phone and email.
_Avoid_: client contact, recipient, attendee

**Facility**:
Where a stop takes place: a port, airport, rail yard or depot, picked from the organization's list or added on the spot. Its record holds its kind, city, address, a picture and a contact; the stop's report page prints the address and contact. The drop-down lists every facility, the kind that suits the stop's transport type first (ports for Sea).

**Transport**:
The ship, barge, plane, train or truck that moves the items, like MV Coral Dawn, picked from the organization's Transport list or added on the spot. A project can use several, one per stop. In V1 every transport is typed in by hand, with a picture and its particulars, which each of its stops' report pages print; later a tracking service adds ships and planes to the same list and fills in their particulars.
_Avoid_: carrier (that is the owner), vehicle, conveyance

**Transport type**:
Sea, Air, Rail or Road. Picking one offers its transport modes.
_Avoid_: transport mode (that is Vessel, Barge and the rest)

**Transport mode**:
What a transport is within its type: Vessel or Barge for Sea, Plane for Air, Train or Railcar for Rail, Truck or Trailer for Road. Each mode has its own icon.
_Avoid_: kind, transport type (that is Sea, Air, Rail or Road)
_Open_: the Trident team asked (2026-11-07) for the Transport list page to read Transport Mode, which the design prototype does from run 12 (with a capital M everywhere from run 13); that clashes with this term, and Justin wants one word for the page later. From run 16 (Justin, 2026-11-10) one record of that page is also called a Transport Mode, and one person of the Team page a Team, always with both words capitalised, so the record and this term now share a name. The data audit (`docs/research/2026-11-10-prototype-data-audit.md`) lists it as open before the schema is written.

**Stop**:
One place on a project's trip: its point, its transport and its facility. The Transport panel lists a project's stops in trip order, so one report can cover the start, the stops on the way and the end; each stop prints its own page with the transport's particulars.
_Avoid_: leg, row, transport block

**Point**:
Where a stop sits on the trip: Start, Stop (on the way) or End, words everyone reads the same way. Each has its colour wherever it shows: Start blue, Stop amber, End green.
_Avoid_: operation, Loading, Transfer, Discharge (those say what happens there), stage (that is the project's)

**Carrier**:
The company that owns a transport, like a shipping line; never the ship itself. Not in V1.

**Items**:
The cargo the project concerns, as rows of a quantity and a description (2, Power transformers on steel cradles), printed as the report's Cargo Description. A manifest's further columns may come later.

**Team**:
The team lead and the team assigned to a project, all from the organization. On the report they appear as Personnel in Attendance, as cards like the Team page's, the team lead first and marked by a blue ring but not labelled; the team lead also signs off the report. Each person's job title, phone and email on a report are that report's own, filled in from their profile. People on the job who are not on the team are Personnel.
_Avoid_: personnel (as the panel name)

**Team Lead**:
The team member who runs a project: picked in the Project panel's Team section, first among Personnel in Attendance, and the one who signs off the report. Called Owner until 2026-11-10 and Lead for a day after. Being team lead gives no extra rights. The others picked there are the Team Assigned.
_Avoid_: owner, project owner, lead, creator, author

**Personnel**:
People on the job who are not on the organization's team, such as a customer's surveyor. They are added by company in the Project panel's Team section with Add Personnel: a company (typed, or picked from the customers), then each of its people as a name and a title. They print under the team in Personnel in Attendance, each company under its own name.
_Avoid_: attendees, guests, contacts (those are a customer's)

**Trash**:
Where a deleted project goes: hidden, restorable by an admin, emptied only by an admin.
_Avoid_: archive (that is a project status), bin

### Panels and inputs

**Panel**:
A box in the editor. The project details panel holds the job's facts; every other panel prints as one numbered section of the report (1, 2 …). A panel is fixed, optional or custom.
_Avoid_: section, report section, page

**Project details panel**:
The panel of the job's facts: organization, customer and team picked from lists, plus title, dates and cargo summary. Its values fill the cover, the page headers and the introduction. The trip has its own Transport panel right after it.
_Avoid_: project panel, info panel

**Fixed panel**:
A panel every report has, always in the same place: Cover, Table of Contents, Introduction, Time Log, Closing.

**Optional panel**:
A ready-made panel the definitions offer, switched on or off per report: Cargo Damages, Ships Particulars, Lifting Gear, Post-Discharge Inspection and the like.

**Custom panel**:
A panel the surveyor makes and titles, as many as a report needs. Optional and custom panels are dragged into any order between the fixed ones.

**Panel section**:
A titled part inside a panel, listed in the contents as a subsection (1.1).
_Avoid_: subsection (alone), block

**Panel subsection**:
The content of a panel section: text, a photo group, documents, or a time log day.
_Avoid_: block, part, widget

**Panel status**:
One of To do, In progress, Complete, from how many of the panel's required inputs have values.

**Input**:
One question defined in the definitions: its panel, label, path, source, type and the report pages it feeds.
_Avoid_: field

**Value**:
What the surveyor enters for an input. Every value saves by itself as it is typed; there is no Save button. When two people change the same value, the last change to reach the server stays and the other is kept in the history.

**Save state**:
Where a value is: Saved on this device (only the phone has it), Syncing (on its way), Saved (the server has it, safe if the phone is lost) or Not synced (the server could not take it yet; it stays on the phone and is tried again).
_Avoid_: pending, offline, uploaded

**Live editing**:
Other people's saved values appearing on your screen without reloading, a second or two behind.
_Avoid_: real-time, sync (for this)

**Presence**:
Who else has a project open right now, shown as their faces, with the panel each is in. A live hint only: never saved to the report and never in the history.
_Avoid_: viewers, online users, collaborators

**Source**:
Where an input's value comes from: user, system, prefilled, derived, template or external.

**Group repeater**:
Content made of groups the surveyor adds, reorders, collapses and removes: the time log's days, the photo groups and the transport stops. A group's Delete sits at the far right of its bottom row, and removing anything asks first. Groups, photos and panels move by holding and dragging; nothing has a drag handle.
_Avoid_: repeater panel, grouped repeater

**Time log**:
The group repeater of a project's days; each day holds entries.

**Entry**:
One line of a time log day: a time and an activity.
_Avoid_: description, text (for the activity)

**Photo group**:
A set of photos in a panel section, with a layout that says how many share a page: 1 or 2 across the page, or 4, 6 or 8 in two columns.
_Avoid_: section (as a group's name)

**Photo**:
An image the surveyor adds to a photo group, with its own description, written by tapping the photo; the description prints on the photo, and in the panel an icon on the photo shows it has one. One kind of attachment.
_Avoid_: caption

**Attachment**:
A file a User adds to a project: a photo, a video or a document. It keeps the time and place it was taken, and follows its report's rules for deleting and restoring.
_Avoid_: asset (in surveying that is the vessel or cargo surveyed), media, upload, uploaded file

### Report pages

**Report page**:
One page of the report: the Cover, Table of Contents, Introduction with Personnel in Attendance, the pages of the optional and custom panels, the Time Log and the Closing. Every page but the cover carries the header and a page number. The surface it renders on belongs to the UI vocabulary.
_Avoid_: page (bare, where the UI's Page could be meant), sheet

**Closing**:
The last report page: the standard disclaimer and the team lead's sign-off, like an email signature. It prints under the title Disclaimer.
_Avoid_: disclaimer page, sign-off page

**Page variant**:
How a report page renders: full, toc, list, template, team, table or photo.

**Region**:
The header, main or footer of a report page, where an input's value lands.
_Avoid_: page section, output section

### The workspace

**Dashboard**:
The page every Member and Admin lands on after signing in, with a little of everything; in V1 it lists the projects, like the Projects page.
_Avoid_: home, overview (the Company overview is another app)

**Workspace**:
A project's screen in the Report Generator, with three tabs: Page, Edit and Preview (Page from design prototype run 13).
_Avoid_: details, project details workspace

**Tab**:
One of the workspace's views, Page, Edit or Preview, or one of a record page's two, Page and Edit.
_Avoid_: pane, mode

**Page tab**:
The first tab of a project or a record: how it reads. Built like the Dashboard, a big photo or a map of where it is on top, with its name and main facts over it, and a sheet below that is dragged up and down.
_Avoid_: overview, profile, view

**Edit tab**:
The workspace tab that shows the panels, and a record page's tab that changes the record.
_Avoid_: editor, create tab, panels tab

**Preview tab**:
The workspace tab that shows the report pages as they will export.
_Avoid_: live preview, print preview

**Record**:
A customer, team member, transport or facility: anything with its own list page that is not a project. Its row opens its record page.
_Avoid_: entity, item, resource

**Record page**:
One record's screen, shared by all four kinds, with two tabs: Page, how it reads with its projects, first, and Edit.
_Avoid_: detail page, profile (that is the User's own)

**Label**:
What a list page sorts by: a project's status, a customer's types, a team member's labels, a transport's transport type and a facility's kind. A page's labels are its board columns, its filter options and its chart's slices, in the same colours and order; a record with none sits under Other.
_Avoid_: tag, category, group

**Export**:
Producing a file of the report. PDF today; other formats are listed but not built.
_Avoid_: download

### Definitions and data

**Definitions**:
The inputs, panels and report pages that say what a report contains, whatever they are stored in.
_Avoid_: schema (for this), mirror, snapshot, local data

**Repeatable**:
An input the surveyor can add more than once in a report: the photo groups of a panel section, the photos in a photo group, the files on a group. A property of the input, not of the panel.
_Avoid_: multiple, repeater (for the input)

**Definition sheet**:
The Google Sheet where the definitions were first authored: a specification, no longer the runtime source once the definitions live in the code.

**Sheetari**:
The service that serves a Google Sheet tab as JSON. The website keeps reading through it, since the team's content workflow lives in those sheets. The Report Generator stops reading through it once the definitions live in the code; the sheet and the service stay as they are.
_Avoid_: local mirror (a copy nothing reads)
