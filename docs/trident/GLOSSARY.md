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

**Next app**:
next.app.tridentcubed.com: the Report Generator with the work that has not reached the dev address yet, where Justin checks it first. It shares the dev address's data (#341).
_Avoid_: staging, beta, preview

**Playground**:
play.tridentcubed.com, built from `apps/play`: where the team's prototypes are shown, with made-up data only (#342).
_Avoid_: play app, sandbox

**Company overview**:
`apps/overview`, an overview of the company itself: employees, competitors, market research. Nothing to do with reports.
_Avoid_: dashboard, report app, slideshow

**Prototype**:
A standalone page that tries one design idea with made-up data, flipped through and tuned before the real thing is built, and shown on the Playground. The look prototype (#161) was one; its screens became V1's (2026-11-12, #179).
_Avoid_: mockup, demo

**Pre-V1 app**:
The Report Generator as built before V1: the `apps/app` that saves to the browser only. Kept under `.archive/apps/app` as reference once the V1 app exists, deleted when V1 ships; concepts are taken from it, code is not. Called the Prototype until 2026-11-25, when that word came to mean a design page.
_Avoid_: Prototype, the old app, legacy app, V0

### Signing in and access

**User**:
Anyone who can sign in to the Report Generator, identified by a verified email address, whichever way they signed in: an Admin, a Manager, a Team user or a Guest.
_Avoid_: account, login, member

**Guest**:
A User with no membership in any organization. A Guest sees only Waiting for access: their email and Log Out.
_Avoid_: visitor, pending, unassigned

**Organization**:
A group of Users who share access to its projects. Trident Cubed is the first; customer organizations come later. Its details (name, legal name, logo, address, phone, email, group email, website, disclaimer and sign-off wording) are kept once, edited by its Admins and Managers, and printed on every report: the logo, name, phone and email in each page's header, the disclaimer and sign-off on the last page. The design prototype edits them on its Settings screen (run 15). Its details also hold its email domain.
_Avoid_: team, company, workspace

**Membership**:
A User's place in an organization, with one role: Admin, Manager or Team. A User with a membership is staff of that organization.
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

**Manager**:
The role between Admin and Team. It may do what the Team role may, and also change the organization's details, such as the disclaimer and the sign-off (Justin, 2026-11-24); its other rights are still to come.
_Avoid_: supervisor, lead (that is the Team Lead)

**Team role**:
The role of an organization's staff: opens and edits any of its projects and records and deletes the Drafts they created, but does not change the organization's details, anyone's role or the Archived status. Said "Team" where the role is meant, as the role picker shows it. Called Member until 2026-11-12 (#179).
_Avoid_: Member, staff (that is anyone with a membership), editor, surveyor

**Access grant**:
A private entry that gives one email address its role at sign-in, whether it is the Super admin, and optionally the Team record that User signs in as. Grants make the first admins; they are kept out of this repository.
_Avoid_: invite, allow list, bootstrap list

**Email domain**:
An organization's own email domain, tridentcubed.com for Trident Cubed. A User who signs in with a verified address at it joins the organization with the Team role, unless an access grant says otherwise; anyone else is a Guest.
_Avoid_: company domain, staff domain

### Projects and reports

**Customer**:
The company a project is done for, kept once in the organization's list with its name and a code (SGL) that project numbers and file names use. A customer has many projects. Its record also holds its legal name, type, labels, logo (printed in every page's footer), location, main email and phone, website, a cover and any number of contacts. Picking a customer's name in a project fills all of it in. The Project Report prints the customer's own location beside its name, never the project's. Called Client until 2026-10-26.
_Avoid_: client, account

**Project**:
One job for a customer. A project owns exactly one report; a job that needs a second report, such as a cargo report split by booking, is not modelled yet.
_Avoid_: job, survey (alone)

**Project number**:
A project's reference: the customer's short code, the Project Creation Date and J with the Job Sequence Number, which of that customer's jobs that day it is, SGL-2026-02-03-J01 for the first and -J02 for the second. A customer sometimes assigns two or three in a day. The date and the sequence are its two parts a User may type, side by side in the Project panel: the date starts as the day the project was made and is changed to the day Trident Cubed accepted the job when the project is made later; the sequence is the next one for that customer and date, given by the app, until one is typed. Nothing else changes it, the Time Log included. The whole number shows under the Job Number as a value the app made (Justin, 2026-11-24; it was hidden from the panel from 2026-11-18), and prints in the report's footer; the cover does not print it.
_Avoid_: job number, reference, queue number

**Customer reference number**:
The customer's own number for the job, such as SO025484: optional, typed under Customer in the Project panel, where its input is labelled Reference Number. When it is filled in, the cover prints it as Reference, and every page's footer prints it under the document ID, by an ID card icon. It is not part of the project number.
_Avoid_: reference (alone), PO number

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
One of Draft, In Progress, Review, Ready, Sent, Revision, Complete, Archived, in that order. Review is Trident's own check; Ready means finished, for the team to export and send. Sent is marked by hand once the report has gone to the customer, and freezes a Sent copy. Unsend takes back a Sent mark made by mistake: the project returns to the status it had before. A Sent or Complete project is read only. After Sent a project goes to Revision (the customer asked for changes; work resumes and it is sent again) or to Complete, marked by hand when the customer accepts. Only an admin archives a project. Changes before Sent apply in any status and never move a project back, with two exceptions that move it forward by themselves: a Draft becomes In Progress once its Project panel is complete (Justin, 2026-11-10), and a Draft or In Progress project becomes Ready once every input of its switched-on panels is filled in, its 100% (Justin, 2026-11-25). A Team Lead alone is team enough for both. A status picked by hand stays until the work moves on, and Review, Revision and the states after Sent are only picked by hand. Any status can also be set by hand from Change Status.
_Avoid_: approved, Ready for Review, in-progress, completed

**Sent copy**:
The report and every value as they were when the project was marked Sent. It never changes, and a Sent report prints from it. Changes that reach the server after the project was marked Sent are kept in the history, not applied.
_Avoid_: snapshot, frozen copy

**History**:
The record of every change to a project: who changed what, when, and what it was before.

**Activity**:
The organization's running list of what happens in the app, newest first: sign-ins, projects created and every change in the history. Admins open it from the profile menu (Justin, 2026-11-24).
_Avoid_: log (that is the time log), audit trail, feed
_Avoid_: log (that is the time log), audit trail

**Report**:
The document a project produces: its panels rendered as report pages.
_Avoid_: survey report, document

**Contact**:
A person at a company: name, title, email, phone and photo, kept on the company's record. A customer has any number; a project picks the one its report is for, and the report prints their name, title and email under the customer. A company's other email addresses and phone numbers belong to its contacts, not to the company. A facility has one for now, as a name, phone and email; it takes the same contacts as a customer when it needs more (Justin, 2026-11-17).
_Avoid_: client contact, recipient, attendee

**Location**:
Where a record is, typed once and picked from the place lookup's suggestions: a customer's, facility's, Team member's, project's or the organization's. It keeps the whole place, street and all, so the record's pin sits on the real spot, and its street, city, state, zip and country are read from it once (#320). Every view shows only its city and state ("Houston, TX"; abroad, "London, United Kingdom"). The whole address shows only for a company or facility, on its own record and a facility's stop page; a person's address shows nowhere.
_Avoid_: city, address (for the field)

**Facility**:
Where a stop takes place: a port, airport, rail yard or depot, picked from the organization's list or added on the spot. Its record holds its type (Port, Airport, Rail yard or Depot), location, a cover and a contact; the stop's report page prints its whole address and contact. A facility is a company too, so its record takes any other company field (legal, code, logo, website) when it needs one. The drop-down lists every facility, the type that suits the stop's transport type first (ports for Sea).
_Avoid_: kind (for its type)

**Transport**:
The ship, barge, plane, train or truck that moves the items, like MV Coral Dawn, picked from the organization's Transport list or added on the spot. A project can use several, one per stop. In V1 every transport is typed in by hand, with a cover and its particulars, which each of its stops' report pages print; later a tracking service adds ships and planes to the same list and fills in their particulars.
_Avoid_: carrier (that is the owner), vehicle, conveyance

**Transport type**:
Sea, Air, Rail or Road: a transport's type, read from its transport mode. Picking one offers its transport modes.
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
The cargo the project concerns, as rows of a quantity and a description (2, Power transformers on steel cradles), printed as the report's Cargo Description. A customer's own list comes in as an Item List.

**Item List**:
The customer's list of the cargo (a packing list, a manifest) read from a spreadsheet: rows pasted into the Items panel, or an Excel, CSV, TSV or JSON file dropped on it or chosen. Its cells are kept as they came, blank rows and blank columns left out, and the report prints them under Cargo Description as a table the full width of the page, the quantity before the item. A project holds one; a new one takes its place. A photo of a list is an Attachment and prints whole; a PDF prints its pages, laid out like a photo group's photos, 1, 2, 4, 6 or 8 to a page (Justin, 2026-11-24); any other file that is not a spreadsheet prints its name.
_Avoid_: packing list (one kind of it), manifest, grid, spreadsheet

**Project team**:
The team lead and the Team Assigned of a project, all Team records of the organization. Said "Team" inside a project (the Project panel's Team section). On the report they appear as Personnel in Attendance, as cards like the Team page's, the team lead first and marked by a blue ring but not labelled; the team lead also signs off the report. Each person's job title, phone and email on a report are that report's own, filled in from their profile. People on the job who are not on the team are Personnel.
_Avoid_: personnel (as the panel name), Team (bare, outside a project)

**Team record**:
One person on the organization's Team page: name, title, labels, role, phone, email, location and photo. A staff User is tied to the Team record with their email at sign-in, and its role is their membership's role. Said "a Team" in the app, both words capitalised (Justin, 2026-11-10).
_Avoid_: team member, member, employee, profile (that is the User's own)

**Team Lead**:
The Team record who runs a project: picked in the Project panel's Team section, first among Personnel in Attendance, and the one who signs off the report. Called Owner until 2026-11-10 and Lead for a day after. Being team lead gives no extra rights. The others picked there are the Team Assigned.
_Avoid_: owner, project owner, lead, creator, author

**Personnel**:
People on the job who are not on the organization's team, such as a customer's surveyor. They are added by company in the Project panel's Team section with Add Personnel: a company (typed, or picked from the customers), then each of its people as a name and a title. They print under the team in Personnel in Attendance, each company under its own name.
_Avoid_: attendees, guests, contacts (those are a customer's), on-the-spot people

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

**Introduction**:
The report's opening sentence, on the Project Report page: who was where, when and for what. It is worked out from the project's records in words that fit any job, a loading and a discharge alike, and the project details panel's Description field holds it for anyone to reword. What is typed there prints in its place and no longer follows the panels; the field says which of the two it shows (auto-generated or edited), and its reset, or clearing it, brings the worked-out sentence back.
_Avoid_: opening paragraph, verbiage, Introduction as the field's label (its name for a few hours on 2026-11-19), a Load or Discharge control (Justin, 2026-11-19: the sentence is edited, not switched)

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

**Help text**:
The short explanation an input's ? opens: what goes there and what the report does with it. Every input has one. It is changed in one place, and everyone sees the change without a new version of the app (Justin, 2026-11-24).
_Avoid_: tooltip, hint, description (that is a stage's or a photo's own text)

**Value**:
What the surveyor enters for an input. Every value saves by itself as it is typed; there is no Save button. When two people change the same value, the last change to reach the server stays and the other is kept in the history.

**Save state**:
Where a change is, as the cloud in the header shows it: Saving (on its way), Saved (the server has it, safe if the device is lost) or Not saved (the server could not take it yet; it stays on screen, is tried again by itself and offers Retry). Offline editing adds a fourth, Saved on this device (only the phone has it). Saving and Not saved were Syncing and Not synced until 2026-11-12 (#179).
_Avoid_: pending, offline, uploaded, Syncing, Not synced

**Live editing**:
Other people's saved values appearing on your screen without reloading, a second or two behind.
_Avoid_: real-time, sync (for this)

**Presence**:
Who else has a project open right now, shown as their faces, with the panel each is in. A live hint only: never saved to the report and never in the history.
_Avoid_: viewers, online users, collaborators

**Source**:
Where an input's value comes from: user, system, prefilled, derived, template or external.

**Generated value**:
A value the app makes or an outside service fills in, an input whose source is system, derived or external, such as the project number or the opening sentence. It looks the same everywhere, in bright blue with an icon, and its reset brings the app's value back after someone types over it. A prefilled value, such as a new project's four stage names, is the surveyor's from the start and is not one (Justin, 2026-11-24).
_Avoid_: auto-generated (as the term), computed, default

**Group repeater**:
Content made of groups the surveyor adds, reorders, collapses and removes: the time log's days, the photo groups and the transport stops. A group's Delete sits at the far right of its bottom row, and removing anything asks first. Groups, photos and panels move by holding and dragging; nothing has a drag handle.
_Avoid_: repeater panel, grouped repeater

**Time log**:
The group repeater of a project's days; each day holds entries.

**Entry**:
One line of a time log day: a time and an activity.
_Avoid_: description, text (for the activity)

**Photo group**:
A set of photos in a panel section, with a layout that says how many share a page: 1 or 2 across the page, or 4, 6 or 8 in two columns. It takes PDFs and videos too, laid out the same way: each page of a PDF takes a spot of its own, shown whole, and a video takes one spot as its Thumbnail (Justin, 2026-11-24). Every tile in the panel, and every spot on the Preview, wears an icon that says whether it is a photo, a PDF or a video; the Preview's marks stay out of the downloaded PDF (Justin, 2026-11-25).
_Avoid_: section (as a group's name)

**Operations panel**:
The optional photo panel every project starts with, once called Inspection. Its title is typed at the top of the panel, as every photo panel's is, and the report and its contents print that title: alone on the panel's first page, with "(continued)" on each page after it.
_Avoid_: Inspection panel

**Project Files URL**:
The one input at the top of the Operations panel, above its stages: the link to the project's folder somewhere else, a OneDrive folder say, that holds its photos, videos and files. The report prints it as one short line, Project Files and where it goes, beside the title of the Project Report's first page and of the Operations panel's first page; in the PDF it is a link to click. Empty, or not an address a browser can open, it prints nothing. Once it holds such an address, an arrow shows inside the field at its far right that opens it. It is optional. Whoever opens it still needs access on the other side.
_Avoid_: Project Files Link (its name for a few hours on 2026-11-19), OneDrive link (as the input's name), folder link, share link

**Stage**:
A photo group of the Operations panel: one part of the job, with a name, a description and photos. A new project starts with Preloading, Loading Operations, Securing and Lifting Gear; stages are renamed, added, removed and reordered like any photo group. The contents list a photo panel's groups under its title.
_Avoid_: phase, step

**Group switch**:
The switch on a photo group. Off, the group keeps its text and photos and leaves the report: its pages, its line in the contents and its count toward the percent. On brings it back.

**Photo**:
An image the surveyor adds to a photo group, with its own description, written by tapping the photo; the description prints on the photo, and in the panel an icon on the photo shows it has one. One kind of attachment.
_Avoid_: caption

**Thumbnail**:
The picture a video shows as in its photo group, made automatically from one of its frames when it is added, with a play button in the middle and its length at the bottom right. In the downloaded PDF it is a link that opens the video in the app, since a PDF cannot play it (Justin, 2026-11-24).
_Avoid_: poster, preview (the Preview is the report on screen)

**Crop**:
How a photo is framed in its spot in the report: zoomed in on part of it, always in the photo's own shape. It belongs to that spot, shows as it changes while the surveyor edits, and prints in the preview and the PDF; the photo and everything it recorded never change, and no new image is made (Justin, 2026-11-24).
_Avoid_: edit (for the crop), zoom (as something apart from the crop)

**Attachment**:
A File a User adds to a project: a photo, a video or a document. It keeps every detail the file it came from carried, such as the time and place it was taken, even when the app makes it smaller or changes its format (Justin, 2026-11-24), and follows its report's rules for deleting and restoring. It always shows, whatever format it arrived in: one the device cannot read is turned into one it can before anyone sees it (Justin, 2026-11-24). In the downloaded PDF an attached PDF's pages go in as the PDF's own pages, text and all, and only as pictures when the PDF is locked against copying them; the Preview shows each page as a picture (Justin, 2026-11-24).
_Avoid_: asset (in surveying that is the vessel or cargo surveyed), media, upload, uploaded file

**File**:
Anything uploaded and kept in private storage: a photo, an attached document, or a logo, cover or photo on a record or the organization. It holds what it is for, its type and size, and for a photo the time and place it was taken and the full field list of the file the User picked, so no metadata field is ever lost. An Attachment is a File added to a project; a record's logo is a File but not an Attachment.
_Avoid_: upload, asset, blob

### Report pages

**Report page**:
One page of the report: the Cover, Table of Contents, Introduction with Personnel in Attendance, the pages of the optional and custom panels, the Time Log and the Closing. Every page but the cover carries the header and a page number. The surface it renders on belongs to the UI vocabulary.
_Avoid_: page (bare, where the UI's Page could be meant), sheet

**Closing**:
The last report page: the standard disclaimer and the team lead's sign-off, like an email signature. It prints under the title Disclaimer.
_Avoid_: disclaimer page, sign-off page

**Report link**:
The app's short address of one report page, `/report/<project>/<page>`. Every report page's QR code holds it, and in the PDF the code is a link to it. It opens that project's Preview at that page, for a signed-in User of the organization only.
_Avoid_: QR link, share link

**Page variant**:
How a report page renders: full, toc, list, template, team, table or photo.

**Region**:
The header, main or footer of a report page, where an input's value lands.
_Avoid_: page section, output section

### The workspace

**Dashboard**:
The page every staff User lands on after signing in, with a little of everything; in V1 it lists the projects, like the Projects page.
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
A Customer, Team record, Transport or Facility: anything with its own list page that is not a project. Its row opens its record page.
_Avoid_: entity, item, resource

**Record page**:
One record's screen, shared by all four kinds, with two tabs: Page, how it reads with its projects, first, and Edit.
_Avoid_: detail page, profile (that is the User's own)

**Pinned**:
The menu's list, at its top above Recents, of the projects and records a User pinned from their ⋮ menu (Pin, Unpin); each User's own, newest first (#346).
_Avoid_: favourites, starred, bookmarks
_Not_: the map's pin, the marker where a record sits on the map

**Search**:
The pop-up opened by the search icon beside the logo in the menu, or Ctrl K / ⌘ K on a desktop (#345): Recents and each page's latest before anything is typed, then what is found, grouped by page, names first.
_Avoid_: finder, command palette

**Label**:
What a list page sorts by: a project's status, a customer's type, a Team record's labels, a transport's transport type and a facility's type. A page's labels are its board columns, its filter options and its chart's slices, in the same colours and order; a record with none sits under Other.
_Avoid_: tag, category, group
_Open_: since 2026-11-17 labels is also the field for a record's free tags, which any record may have beside its type. Whether a page with a type also sorts by those is not decided.

**Export**:
Producing a file of the report. PDF today; other formats are listed but not built.
_Avoid_: download

### Record fields

**Record field**:
One named fact kept on a record, a project, a contact or the organization. Each field word below means the same thing wherever it is used; any kind of record may use any of them, and none is required because another kind has it. A field is spelled the same in the database and on the screens (Justin, 2026-11-17).
_Avoid_: field (bare, where an Input could be meant), property, attribute, column

**name**:
What the app shows for it: a company's everyday name, a person's full name.
_Avoid_: title (that is a project's, or a person's job title), display name

**legal**:
A company's formal registered name, like AXA XL, a division of AXA. A report prints it where it is filled, and the name where it is not.
_Avoid_: legal name (as the field word), company name, full name

**code**:
A company's abbreviation, like SGL: a few capital letters, three when the app or the team makes one up, that start its project numbers and document IDs.
_Avoid_: abbreviation, short code (as the field word), prefix

**type**:
The one thing a record is, picked from its page's fixed list: a customer's Freight Forwarder, a facility's Port, a project's Cargo, a transport's Sea. A record has at most one. A transport also has its mode.
_Avoid_: kind, category, types (several belong in labels)

**labels**:
Any number of free tags on a record, whatever its kind, beside its type: a customer's Crane Services, a Team record's Port Captain.
_Avoid_: tags, types, categories

**icon**:
The symbol the app shows for a project, transport or facility that has no image of its own: its page's symbol in the main menu (a folder for projects), or its type's or mode's where those have one. A person with no photo shows their initials instead, and a customer or a Personnel company with no logo its code, on a circle coloured by role or kind (#355). It belongs to the app and is never a field of a record.
_Avoid_: logo, avatar, placeholder

**logo**:
A company's mark, as an image a User added or the app took from the company's website.
_Avoid_: icon, brand, picture

**photo**:
A person's face, on a Team record or a contact. Not a Photo, which is an image in a report's photo group.
_Avoid_: avatar, picture, headshot

**cover**:
The one big image on top of a record's Page tab. Called picture until 2026-11-17. Not the report's Cover, which is a report page.
_Avoid_: picture, background, banner

**photos**:
More images of a record beside its cover; the cover is one picked from them. A transport's photos gather every photo of it taken on a job: each prints in that job's report and is kept on the transport, and the cover changes only when someone picks another (Justin, 2026-11-24).
_Avoid_: gallery, pictures

**location**:
Where a record is, picked from the list of places as it is typed and shown on the map: Houston, TX. Called city on customers and facilities until 2026-11-17.
_Avoid_: city, place (that is the saved lookup behind it), region

**address**:
The postal address as typed, one block, as it prints: street, suite, city, state, zip and country together, never as fields of their own.
_Avoid_: street, billing address, state, zip, country (as fields)

**email**:
A company's one main address, or a person's own. A company's other addresses belong to its contacts.
_Avoid_: emails, default email, contact email

**phone**:
A company's one main number, or a person's own. A company's other numbers belong to its contacts.
_Avoid_: phones, mobile, telephone

**website**:
A company's own site.
_Avoid_: url, link (that is a person's)

**link**:
A person's profile page elsewhere, such as LinkedIn; on a project's Operations panel, its Project Files URL, the project's folder elsewhere.
_Avoid_: website, url

**title**:
A person's job title; on a project, the title its report's cover prints.
_Avoid_: position, role (that is a membership's), name

### The installed app

**Installed app**:
The Report Generator put on a phone's home screen, or on a computer, with its own icon and name. It opens full screen with no browser bars. It belongs to the address it was installed from, and it needs a connection until offline editing arrives.
_Avoid_: PWA, native app, download

**Install App**:
The line in the profile picture menu, between Organization and Log Out, and the small link on the login page that put the Report Generator on the device. It installs with one tap where the browser offers that; otherwise it shows three short steps for iPhone or for Android, and the User picks which phone. It is not shown inside the installed app.
_Avoid_: Download, Get the app, Add to Home Screen (that is one of the iPhone's own steps)

**Test copy**:
The installed app taken from the dev address. It reads Trident Dev under its icon, where the real one reads Trident. Since 2026-11-25 the team keeps its real projects there (Justin), until the real address goes live; then it installs once more from there and signs in.
_Avoid_: dev app, beta, staging app

**Needs Internet screen**:
What the Report Generator shows when it is opened with no signal: the logo, Needs Internet, a line saying that working with no signal is coming, and Try Again. The page that was asked for comes back by itself when the signal returns. Not the "Needs internet" written on a single greyed button, which comes with offline editing.
_Avoid_: offline page, error page, no connection screen

**Update note**:
Retired (Justin, 2026-11-27): the small "New version, tap to update" note an open Report Generator showed when a newer version was ready. What's New now opens by itself instead, and its button switches to the newer version, only once every change is Saved.
_Avoid_: update banner, update prompt, popup

### Releases

**Release**:
A numbered version of the Report Generator, such as v1.1.0, with its release notes. The app shows the number of the release it runs.
_Avoid_: build, deploy, drop

**Release notes**:
A release's new features and bug fixes, each in a line or two, with before and after pictures where a change has them.
_Avoid_: changelog, patch notes, update message

**What's New**:
The window everyone sees once per release, the next time they open the Report Generator after it: the version number, then its release notes. Not the Update note, which only offers the switch (#363).
_Avoid_: popup, announcement, changelog

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

### How the app saves

**Row**:
One stored thing: a record, a project, a panel, a stop, an entry, a photo or any other piece that saves by itself, named by an id made on the device.
_Avoid_: document, entity, object

**Row change**:
One put or delete of a row, naming its table, its id, the columns that changed and a change id made on the device, so a change sent twice counts once. Changes travel in batches that apply all or nothing.
_Avoid_: patch, mutation, diff

**Row registry**:
The one list of every table that saves: its columns, its parent, its validation and its rules. A new table joins the app by one entry there.
_Avoid_: schema (that is the database's), table map

**Save command**:
The one server action every row change goes through, whatever the table. Things that are not rows (asking for an upload address, looking a place up, exporting a PDF) have commands of their own.
_Avoid_: save endpoint, sync API, persist

**Mapper**:
What turns the screens' state into rows and rows back into that state; the only part of the app that knows both shapes. It translates the names the screens use into the ids the rows hold.
_Avoid_: adapter, serializer, converter

**Sync loop**:
What sends the screens' changes: about a second after the last change it asks the mapper for rows, compares them with what the server last confirmed, and sends only the difference through the save command. It drives the save state.
_Avoid_: autosave (that is what the User sees), sync engine (that is PowerSync, ADR 0006)
