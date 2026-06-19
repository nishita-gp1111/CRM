# Phase 2 KPI Architecture

## Purpose

Phase 2 turns the CRM from a record manager into a sales operating system. The design does not copy the legacy spreadsheet layout. It normalizes sales facts and calculates KPI views from source records.

## Source Of Truth

- Deal is one opportunity.
- DealLineItem is one product or service on a deal.
- DealParticipant freezes IS / FS / referral / walk-in attribution at the time of contribution.
- SalesPerformanceEvent stores immutable KPI events when a fact should not change after owner changes.
- DailyMetricEntry stores manual daily inputs such as calls, connections, full, short, and condition NG.
- MetricDefinition and MetricDefinitionVersion define how each KPI is calculated.
- KpiTarget stores period targets by organization, business unit, user, team, and work function scope.
- BusinessCalendar stores working days for ideal progress and required activity calculations.

## Services

- `src/lib/kpi.ts`: MetricCalculationService, drilldown, required activity calculation.
- `src/lib/business-calendar.ts`: working days, elapsed days, remaining days.
- `src/lib/legacy-progress-import.ts`: legacy workbook dry-run analysis.

## UI

- `/reports`: scorecard and required activity dashboard.
- `/daily-metrics`: manual daily input.
- `/imports/legacy-progress`: legacy workbook dry run.
- `/settings/kpis`: KPI definition catalog.
- `/settings/products`: product and price master.
- `/settings/targets`: KPI target list.

## Non Goals In Phase 2

- Gmail, Outlook, OAuth, email tracking, and marketing automation are not implemented.
- Google Calendar integration is not implemented.
- DeliveryProject / CS production management is not implemented, but MetricDefinition supports `DELIVERY_PROJECT` for future use.
