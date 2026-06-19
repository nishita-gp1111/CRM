# Phase 2 ER Diagram

```mermaid
erDiagram
  Organization ||--o{ BusinessUnit : owns
  Organization ||--o{ Deal : owns
  Organization ||--o{ Product : owns
  Organization ||--o{ MetricDefinition : owns
  BusinessUnit ||--o{ Deal : classifies
  BusinessUnit ||--o{ BusinessUnitProduct : offers
  Product ||--o{ BusinessUnitProduct : maps
  Product ||--o{ PriceBookEntry : prices
  Deal ||--o{ DealLineItem : contains
  Product ||--o{ DealLineItem : sold_as
  PriceBookEntry ||--o{ DealLineItem : prices
  Deal ||--o{ DealParticipant : attributed_to
  Deal ||--o{ SalesPerformanceEvent : emits
  MetricDefinition ||--o{ MetricDefinitionVersion : versions
  MetricDefinition ||--o{ DailyMetricEntry : records
  MetricDefinition ||--o{ KpiTarget : targets
  MetricDefinition ||--o{ MetricValidationRule : validates
  BusinessCalendar ||--o{ BusinessCalendarException : overrides
  KpiTarget ||--o{ ActionPlan : improves
  MetricDefinition ||--o{ ActionPlan : improves
  ImportJob ||--o{ LegacySourceLink : tracks
```

## Duplicate Counting Rules

- Won deals: distinct `Deal`.
- Gross profit: sum `DealLineItem.grossProfitAmount`.
- Forecast gross profit: sum `DealLineItem.expectedGrossProfitAmount`.
- Weighted forecast: forecast gross profit multiplied by `ForecastCategory.probability`.
- Meetings: distinct `MeetingBooking` or `SalesPerformanceEvent` depending on source definition.
- Referrals: distinct `Referral`.
- Field visits: distinct `FieldVisit`.
