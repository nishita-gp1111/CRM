# Excel Migration Map

## Source Workbook

Reference workbook:

- `docs/reference/current-progress-management.xlsx`

Important visible sheets:

- `【全体】ダッシュボード`
- `【第一】案件管理シート`
- `【HD】案件管理シート`
- `【2026年6月】月間進捗管理シート（第一）`
- `【2026年6月】月間進捗管理シート（HD）`
- `【2026年6月】IS管理シート（HD）`

Important hidden definition sheets:

- `ヨミ表（定義）`
- `単価表`

## Mapping

| Excel | CRM |
| --- | --- |
| 案件名 | Company.name and Deal.name candidate |
| 担当者名 | Contact internal record, displayed as 担当者 |
| IS担当者 | DealParticipant APPOINTMENT_SETTER |
| FS担当者 | DealParticipant CLOSER |
| 進捗 | Deal.legacyProgress and ForecastCategory mapping candidate |
| 獲得商材 / 商材 | Product / DealLineItem |
| 初期費用 / 月額費用 | DealLineItem revenue metadata |
| 粗利 | DealLineItem grossProfitAmount or expectedGrossProfitAmount |
| アポ獲得日 | SalesPerformanceEvent APPOINTMENT_SET or MeetingBooking.appointmentSetAt |
| 商談日 | MeetingBooking.startsAt or SalesPerformanceEvent VALID_MEETING |
| 決済者 / 決裁者 | Deal.decisionMakerStatus with original value in metadata |

## Not Imported As Fixed Values

- Weekly totals
- Monthly totals
- Averages
- Conversion rates
- Ideal progress
- Required daily activity
- Stage lead-time calculations

These are recalculated by the CRM.
