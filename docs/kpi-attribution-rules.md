# KPI Attribution Rules

## Roles

- `APPOINTMENT_SETTER`: IS user credited for appointments.
- `CLOSER`: FS user credited for wins, gross profit, and forecast.
- `REFERRER`: user credited for referrals.
- `WALK_IN_OWNER`: user credited for field visits.

## Immutable Attribution

Owner changes on Deal do not rewrite history. Historical KPI credit is read from:

- `DealParticipant.creditedAt`
- `DealParticipant.snapshotUserName`
- `SalesPerformanceEvent.creditedUserId`
- `SalesPerformanceEvent.creditedRole`

## Counting

- IS appointment count can come from DailyMetricEntry or SalesPerformanceEvent depending on the metric.
- FS wins count distinct Deal.
- Gross profit sums DealLineItem.
- Domain attachment count uses DealLineItem filtered by Product.
- Referral and field visit counts use their own tables.

## Decision Maker Labels

Display labels:

- `DECISION_MAKER`: 決裁者
- `NON_DECISION_MAKER`: 非決裁者
- `UNKNOWN`: 不明

The importer treats `決済者` as an alias and stores the original value in metadata.
