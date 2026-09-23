# Trident Platform Roadmap

Owner: Justin. Captured 2026-09-18 from Justin's roadmap and the Trello card
"Trident: Report Generator V1 and roadmap" (https://trello.com/c/SDILPz9M).
Checked items are owner-reported completion, not repository-verified.

> **Open question (2026-09-18):** Justin is reconsidering the order below.
> He may want authentication, a real database, and cloud media storage set
> up *before* the Report Generator MVP, rather than working backwards from a
> local-only prototype. Exhibit B currently excludes auth from Milestone 1
> and preserves a Sept 26 due date. Resolving this is a product/contract
> decision for the next Wayfinder map, not this one.

## Phase 1 — Trident Website

- [x] Trident website

## Phase 2 — Branding + Visual System

- [x] Branding + visual system

## Phase 3 — Interactive 3D Globe

- [x] Interactive 3D globe

## Phase 4 — Custom HTML Email System

- [x] Custom HTML email system

## Phase 5 — Report Generator (`apps/app`)

Milestone 1 (Exhibit B): six weeks from the Effective Date, acceptance under
Section 7. Authentication, login, roles, dashboards, and client accounts are
outside Milestone 1 / V1. Milestone 2 direction is agreed pending planning.

### 🟢 Prototype — Complete

- [x] Standalone Report Generator for mobile and desktop
- [x] Create, save, open, and edit reports locally
- [x] Automatic on-device saving and autosave
- [x] Structured guided report-entry workflow
- [x] Required and optional report sections
- [x] Accordion-based form panels
- [x] Responsive mobile field workflow
- [x] Desktop split-screen form and live preview
- [x] Live report preview
- [x] Paginated report layouts
- [x] Automatic table of contents
- [x] Drag-and-drop section reordering
- [x] Photo upload
- [x] Photo management and preview
- [x] Time log
- [x] Automatic time-log sorting
- [x] Mobile pinch-to-zoom
- [x] Desktop Ctrl/Cmd + mouse-wheel zoom
- [x] Section completion tracking
- [x] Overall report progress tracking
- [x] Reusable report sections
- [x] Configurable page layouts
- [x] PDF generation and download
- [x] Prototype camera access
  - [ ] Production-ready field camera workflow

### 🟡 MVP — In Progress

- [ ] Obtain required production-service access and client information
- [ ] Connect Report Generator to production database
- [ ] Replace local-only storage with persistent database records
- [ ] Database-backed report creation
- [ ] Database-backed report saving
- [ ] Database-backed report loading
- [ ] Database-backed report editing
- [ ] Persist report sections
- [ ] Persist photos
- [ ] Persist photo ordering
- [ ] Persist time-log data
- [ ] Restore complete reports from database
- [ ] Synchronize autosave with database
- [ ] Persistent photo storage
- [ ] Database loading/saving/error states
- [ ] Harden mobile camera capture for real field use

### 🔵 V1 — To Do

- [ ] Fix report reset clearing the shared photo store; verify resetting one report preserves another report's photos
- [ ] Complete and test database-backed report operations
- [ ] Reliable draft recovery
- [ ] Support offline editing and synchronization; recover drafts after app closure or connection loss
- [ ] Installable PWA support on supported phones and tablets
- [ ] Final required-field validation
- [ ] Handle missing, invalid, and incomplete data
- [ ] Finalize report layouts and page templates
- [ ] Verify PDF output across all report sections
- [ ] Finalize photo quality, ordering, captions, and PDF placement
- [ ] Add destructive-action confirmations
- [ ] Finalize empty, loading, offline, and error states
- [ ] Real-world field testing with Trident
- [ ] Apply release-critical field-testing feedback
- [ ] Mobile testing
- [ ] Tablet testing
- [ ] Desktop testing
- [ ] Cross-browser testing
- [ ] Fix remaining UI/layout bugs
- [ ] Fix remaining autosave/database bugs
- [ ] Fix remaining photo/export bugs
- [ ] Accessibility and keyboard-navigation pass
- [ ] Performance and production-readiness pass
- [ ] Production logging/error monitoring
- [ ] Deploy V1
- [ ] Verify production release against Milestone 1 requirements

## Phase 6 — Client + Project Database

- [ ] Client + Project Database

## Phase 7 — Login/Auth + Team Access (Milestone 2, with Phase 9)

- [ ] Login/Auth + Team Access

## Phase 8 — Admin Dashboard

- [ ] Admin Dashboard

## Phase 9 — Roles + Permissions

- [ ] Roles + Permissions

## Phase 10 — Client Portal

- [ ] Client Portal

## Phase 11 — Real-Time Text + Email + Notification System

- [ ] Real-Time Text + Email + Notification System

## Phase 12 — Report Templates + More Report Types

- [ ] Report Templates + More Report Types

## Phase 13 — Vessel / Port / Cargo API Integrations

- [ ] Vessel / Port / Cargo API Integrations

## Phase 14 — Real-Time Shipment + Project Tracking

- [ ] Real-Time Shipment + Project Tracking

## Phase 15 — AI Chat + Sales/Ops Dashboard

- [ ] AI Chat + Sales/Ops Dashboard

## Phase 16 — Website Expansion + Port SEO Page System

- [ ] Website Expansion + Port SEO Page System

## Phase 17 — Social Media Image Generator

- [ ] Social Media Image Generator

## Phase 18 — Social Media Automation System

- [ ] Social Media Automation System

## Phase 19 — Paid Marketing + Optimization

- [ ] Paid Marketing + Optimization

## Phase 20 — AI-Assisted Workflows + Automation

- [ ] AI-Assisted Workflows + Automation

## Cross-cutting

- [ ] Review and update the reusable UI package on GitHub/npm

## External sources

- Report Generator V1, August 12 doc: https://docs.google.com/document/d/1cFT7QAyfmGT7QcorXPhHYdBfvxJUL90E6wvhXlgy54Q/edit
- Trello: Report Generator V1 and roadmap: https://trello.com/c/SDILPz9M
- Trello: AI Workflow, Matt Pocock skills and Vite+ practice: https://trello.com/c/dFsFjGh4
- Vite+ official: https://viteplus.dev/guide/ , https://viteplus.dev/guide/migrate , https://viteplus.dev/config/
