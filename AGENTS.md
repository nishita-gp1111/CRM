# AGENTS

## Project

This is a Next.js / Prisma / PostgreSQL CRM. Keep tenant isolation by always deriving `organizationId` from `getAuthContext()`.

## Phase 2 Rules

- Do not delete Contact, Company, Deal, Activity, MeetingBooking, or existing CRM records.
- Keep Contact internal and display customer people as `担当者`.
- Do not use BusinessUnitMembership as read ACL. Active organization members can view all active business units.
- Count Deal as one opportunity.
- Count revenue and gross profit from DealLineItem.
- Preserve historical attribution through DealParticipant and SalesPerformanceEvent.
- Do not import spreadsheet totals, averages, rates, or ideal progress as facts.
- Legacy workbook import must run dry-run before any apply step.

## Commands

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
