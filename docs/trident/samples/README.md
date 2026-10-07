# Sample reports

Real survey reports from the Trident team, filed for "Data model and save contract" (#120) under #119. They show what the Report Generator has to produce. Their formatting does not matter; their data points do, and a value that repeats across a report is stored once.

The reports themselves are not in this repository: it is public and they name clients, vessels and staff. They live in the project's shared files at `/mnt/project-files/samples/119/`, copied from the "Trident Cubed" Google Drive folder (`01-sample-reports`, `02-data-points`). Phone numbers and signatures are redacted in every copy; the originals stay in Drive.

## The reports

| Sample | Kind of survey | Size of the source | Text file |
| --- | --- | --- | --- |
| Discharge | Two transformers and 27 accessory crates discharged from a vessel to rail cars at a Houston terminal over two days, February 2026 | 13 PDF pages, 31 photos, 2 scanned ship documents, 22 time-log events | `reports/2026-02-03-…-discharge-text.md` |
| Truck loading | Five cargo pieces loaded into two 40 ft open-top containers on trucks at a Louisiana yard, May 2025 | Word report, 35 embedded images (not in the text file), 11 time-log events | `reports/2025-05-28-…-truck-loading-text-REDACTED.md` |

The discharge report also exists as a signature-redacted PDF in Drive (8 MB, too large for the Drive connector to copy here); read it there for the photos and page layout.

Both reports follow one skeleton, which is the report shape V1 starts from:

1. Cover: title, subtitle, preparer, facility, dates of attendance, client logo.
2. Contents.
3. Introduction: one sentence built from organization, facility, dates, survey kind, cargo and carrier.
4. Project report: personnel in attendance (name, role, company, email), cargo description, condition inspection, each with photos.
5. Time log: events grouped by day, `HHMM` and an activity.
6. Cargo operations photos: groups by day, each with a caption and photos, and a link to more photos.
7. Optional sections: post-discharge inspection (before and after pairs, impact recorder video link), ship documents (scans), lifting and lashing gear.
8. Standard disclaimer, word for word the same in both reports.
9. Typed sign-off: name, role, email.

## Values that repeat

These appear on several pages of one report, or in both reports, and are one stored value each:

- Organization: name, logo, street, suite, city, state, zip, operations email. Every page header.
- Report identity: project number, client, preparer ("By"), issue date, document ID and revision. Every page header after the cover.
- Facility and dates of attendance: cover, introduction, time-log day headings.
- Carrier (vessel or truck): cover, introduction, cargo description, photo captions.
- Surveyor: name, role and emails appear in personnel and again in the sign-off.
- Cargo units: equipment identifiers and part numbers recur across cargo description, time log and photo captions.
- Standard disclaimer: fixed text shared by every report.

Repeated photos and time-log events are records in a list, not new fields.

## What the existing model lacks

From the data-point breakdown, checked against the prototype's 84 inputs, 12 panels and 20 page definitions. These are proposals for #120, not decisions:

- Issue date, document ID and revision under the project; keep the supplied project number as it is.
- A surveyor's role and contact details for this report, shown in personnel and sign-off.
- Cargo-description photos and operations photo groups bound separately from the condition photos.
- A labelled link (to a photo folder or a video) on a section.
- Ship-document scans kept as files with their pages, not just file names.
- Header, footer, page numbers and contents generated from stored values, never typed.

## Data-point files

All in `/mnt/project-files/samples/119/data-points/`, made by Justin's ChatGPT research agent on 2026-10-05 to 2026-10-07:

| File | What it holds |
| --- | --- |
| `2026-10-07-report-data-point-master.md` | The breakdown: every element of the discharge report mapped to an existing prototype key (covered, adjust or missing), the smallest changes, source discrepancies, and an appendix of 1,034 historical field records that overlap. Start here. |
| `2026-10-05-SGL-full-catalog-privacy-screened.json` | The same comparison as data: the prototype model, its 155 relationships, and each discharge-report element with its fit. |
| `2026-10-07-report-prototype-schema-redacted.md` | Every cell of the prototype's schema workbook: panels, inputs, pages. |
| `2026-10-07-report-prototype-seed-data-redacted.md` | The prototype's seed workbook: example projects, clients, team, carriers, facilities, photos, time logs. Made-up examples, not field evidence. |
| `2026-10-07-simplified-report-prototype-redacted.md` | A smaller panels, inputs and pages workbook with the meaning of each column. |
| `2026-10-07-report-generator-wip-redacted.md` | An earlier workbook of company, website and branding values. |
