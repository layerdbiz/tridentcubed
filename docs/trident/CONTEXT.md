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
A group of Users who share access to its projects. Trident Cubed is the first; client organizations come later.
_Avoid_: team, company, workspace

**Membership**:
A User's place in an organization, with one role: Admin or Member.
_Avoid_: seat, staff record

**Admin**:
The role that runs an organization: its people, its settings and all its projects.
_Avoid_: owner, superuser

**Super admin**:
The one User above every organization, who can see and fix any of them and can never be demoted or deactivated.
_Avoid_: root, platform owner

**Deactivated**:
A User who can no longer sign in, kept with their history and shown greyed out. Reactivating undoes it.
_Avoid_: banned, suspended, removed, deleted

**Member**:
The role of an organization's staff: opens and edits any of its projects and deletes the Drafts they created, but does not manage its people.
_Avoid_: staff, editor, surveyor, team member

### Projects and reports

**Client**:
The company a project is done for. A client has many projects.
_Avoid_: customer, account

**Project**:
One job for a client. A project owns exactly one report; a job that would need several reports is not modelled yet.
_Avoid_: job, survey (alone)

**Project type**:
One of Cargo, Warehousing, Warranty, Vessel Condition, Draft Survey, Bunker, IHM, Terminal.
_Avoid_: report type, Draft (for the type; Draft is a status)

**Project status**:
One of Draft, In Progress, Review, Sent, Revision, Complete, Archived, in that order. Review is Trident's own check before sending. After Sent a project goes to Revision (the client asked for changes; work resumes and it is sent again) or to Complete. Complete is the client's acceptance.
_Avoid_: ready, approved, Ready for Review, in-progress, completed

**Report**:
The document a project produces: its panels rendered as report pages.
_Avoid_: survey report, document

**Facility**:
The port or port terminal where the project takes place.

**Carrier**:
What carries the items: a vessel, an airplane, a train or a truck.

**Items**:
The cargo the project concerns.

**Team**:
The owner and the assigned members of a project. On the report they appear as Personnel in Attendance.
_Avoid_: personnel (as the panel name)

**Owner**:
The User who created a project, or the one it was handed to. Being owner gives no extra rights.
_Avoid_: creator, author

**Trash**:
Where a deleted project goes: hidden, restorable by an admin, emptied only by an admin.
_Avoid_: archive (that is a project status), bin

### Panels and inputs

**Panel**:
One unit of the editor, defined by a row of the definitions, holding inputs: Organization, Client, Team, Project, Items, Facility, Carrier, Time Log, Inspection, Damages, Discharge, Custom.
_Avoid_: section, report section

**Panel status**:
One of To do, In progress, Complete, from how many of the panel's required inputs have values.

**Input**:
One question defined in the definitions: its panel, label, path, source, type and the report pages it feeds.
_Avoid_: field

**Value**:
What the surveyor enters for an input.

**Source**:
Where an input's value comes from: user, system, prefilled, derived, template or external.

**Group repeater**:
A panel whose content is groups of items the surveyor adds, reorders and removes. The time log and the photo panels are its two kinds.
_Avoid_: repeater panel, grouped repeater

**Time log**:
The group repeater of a project's days; each day holds entries.

**Entry**:
One line of a time log day: a time and an activity.
_Avoid_: description, text (for the activity)

**Photo panel**:
A group repeater whose groups hold photos: Inspection, Damages, Discharge and Custom.

**Photo group**:
A titled set of photos inside a photo panel, with a variant that says how many photos share a page.
_Avoid_: section (as a group's name)

**Photo**:
An image the surveyor adds to a photo group, with a caption. One kind of attachment.

**Attachment**:
A file a User adds to a project: a photo, a video or a document. It keeps the time and place it was taken, and follows its report's rules for deleting and restoring.
_Avoid_: asset (in surveying that is the vessel or cargo surveyed), media, upload, uploaded file

### Report pages

**Report page**:
One page of the report as the definitions list it: Cover, Table of Contents, Introduction, Project Report, Personnel in Attendance, Time Log, Disclaimer and the cargo, ship, barge and lifting pages. The surface it renders on belongs to the UI vocabulary.
_Avoid_: page (bare, where the UI's Page could be meant), sheet

**Page variant**:
How a report page renders: full, toc, list, template, team, table or photo.

**Region**:
The header, main or footer of a report page, where an input's value lands.
_Avoid_: page section, output section

### The workspace

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
An input the surveyor can add more than once in a report: the groups of a photo panel, the photos in a photo group, the files on a group. A property of the input, not of the panel; a panel that holds repeatable inputs is a group repeater.
_Avoid_: multiple, repeater (for the input)

**Definition sheet**:
The Google Sheet where the definitions were first authored: a specification, no longer the runtime source once the definitions live in the code.

**Sheetari**:
The service that serves a Google Sheet tab as JSON. The website keeps reading through it, since the team's content workflow lives in those sheets. The Report Generator stops reading through it once the definitions live in the code; the sheet and the service stay as they are.
_Avoid_: local mirror (a copy nothing reads)
