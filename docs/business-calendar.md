# Business Calendar

`BusinessCalendar` stores working-day definitions by organization and optional business unit.

## Fields

- `timezone`: default `Asia/Tokyo`
- `workWeekDefinition`: JSON, currently `{ "workingWeekdays": [1,2,3,4,5] }`
- `defaultHolidays`: JSON array reserved for future holiday templates
- `BusinessCalendarException`: per-date override

## Calculations

`src/lib/business-calendar.ts` returns:

- workingDays
- elapsedWorkingDays
- remainingWorkingDays
- progressRate

KPI dashboards use this to calculate ideal progress and daily required activity.
