# Trident business

The vocabulary of Trident Cubed's marine survey business and the apps that serve it. The Report Generator's words live here; the reusable UI's words live in `packages/ui/CONTEXT.md` and never depend on these.

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
A group of Users who share access to its projects. Trident Cubed is the first; client organizations come later. Its details (name, logo, address, email, disclaimer and sign-off wording) are kept once, edited by its admins, and printed on every report.
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

**Client**:
The company a project is done for, kept once in the organization's list with its full name and a short code (SGL) that project numbers and file names use. A client has many projects.
_Avoid_: customer, account

**Project**:
One job for a client. A project owns exactly one report; a job that needs a second report, such as a cargo report split by booking, is not modelled yet.
_Avoid_: job, survey (alone)

**Project number**:
A project's reference: the client's short code, the day the project was created and which of that client's projects that day it is, SGL-2026-02-03-01 for the first and -02 for the second. A client sometimes assigns two or three in a day. It can be edited.
_Avoid_: job number, reference, queue number

**Document ID**:
The report's identifier and the name of its exported file: the project number, FR for final report, the report number and the revision number, SGL-2026-02-03-01-FR-01-01. The file name may end with the carrier's name after a triple dash, SGL-2026-02-03-01-FR-01-01---BBC-Kimberly.pdf.
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
One of Draft, In Progress, Review, Ready, Sent, Revision, Complete, Archived, in that order. Review is Trident's own check; Ready means finished, for the team to export and send. Sent is marked by hand once the report has gone to the client, and freezes a Sent copy. After Sent a project goes to Revision (the client asked for changes; work resumes and it is sent again) or to Complete, marked by hand when the client accepts. Only an admin archives a project. Changes before Sent apply in any status and never move a project to another status.
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

**Facility**:
The port or port terminal where the project takes place, picked from the organization's list.

**Carrier**:
What carries the items: a vessel, an airplane, a train or a truck, picked from the organization's list.

**Items**:
The cargo the project concerns.

**Team**:
The owner and the assigned members of a project. On the report they appear as Personnel in Attendance, the owner first with a badge; the owner also signs off the report. Each person's job title, phone and email on a report are that report's own, filled in from their profile.
_Avoid_: personnel (as the panel name)

**Owner**:
The User who created a project, or the one it was handed to. Being owner gives no extra rights.
_Avoid_: creator, author

**Trash**:
Where a deleted project goes: hidden, restorable by an admin, emptied only by an admin.
_Avoid_: archive (that is a project status), bin

### Panels and inputs

**Panel**:
A box in the editor. The project details panel holds the job's facts; every other panel prints as one numbered section of the report (1, 2 …). A panel is fixed, optional or custom.
_Avoid_: section, report section, page

**Project details panel**:
The panel of the job's facts: client, facility, carrier and team picked from lists, plus title, dates and cargo summary. Its values fill the cover, the page headers and the introduction.
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
Content made of groups the surveyor adds, reorders and removes: the time log's days and the photo groups.
_Avoid_: repeater panel, grouped repeater

**Time log**:
The group repeater of a project's days; each day holds entries.

**Entry**:
One line of a time log day: a time and an activity.
_Avoid_: description, text (for the activity)

**Photo group**:
A set of photos in a panel section, with a layout that says how many share a page: 1, 2, 4, 6, 8 or a grid.
_Avoid_: section (as a group's name)

**Photo**:
An image the surveyor adds to a photo group, with a caption. One kind of attachment.

**Attachment**:
A file a User adds to a project: a photo, a video or a document. It keeps the time and place it was taken, and follows its report's rules for deleting and restoring.
_Avoid_: asset (in surveying that is the vessel or cargo surveyed), media, upload, uploaded file

### Report pages

**Report page**:
One page of the report: the Cover, Table of Contents, Introduction with Personnel in Attendance, the pages of the optional and custom panels, the Time Log and the Closing. Every page but the cover carries the header and a page number. The surface it renders on belongs to the UI vocabulary.
_Avoid_: page (bare, where the UI's Page could be meant), sheet

**Closing**:
The last report page: the standard disclaimer and the owner's sign-off, like an email signature.
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
A project's screen in the Report Generator, with two tabs.
_Avoid_: details, project details workspace

**Tab**:
One of the workspace's two views, Edit or Preview.
_Avoid_: pane, mode

**Edit tab**:
The workspace tab that shows the panels.
_Avoid_: editor, create tab

**Preview tab**:
The workspace tab that shows the report pages as they will export.
_Avoid_: live preview, print preview

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
