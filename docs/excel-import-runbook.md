# Excel Import Runbook

## Dry Run

1. Open `/imports/legacy-progress`.
2. Upload the progress management `.xlsx`.
3. Review read rows, candidates, unknown users, unknown products, unknown progress values, invalid dates, and amount errors.
4. Keep the dry-run result for mapping review. The apply step is disabled by default.

`/imports/legacy-progress` is limited to `SUPER_ADMIN` and `ADMIN`.
`LEGACY_EXCEL_IMPORT_ENABLED` defaults to `false`; when it is false, the apply API returns an error and no CRM records are created.

## Mapping Review

Before applying real records:

- Map unknown user names to CRM users.
- Map unknown product names to Product records.
- Confirm ForecastCategory aliases.
- Confirm HD deal grouping candidates.
- Confirm rows with missing company / deal names.

## Idempotency

The migration design uses `LegacySourceLink`:

- provider
- workbookFingerprint
- sheetName
- rowNumber
- rowFingerprint
- targetObjectType
- targetObjectId

The same workbook row must not create duplicate records on re-run.

## Current Behavior

The implemented UI/API supports dry run for understanding the legacy workbook. CRM daily operations do not depend on workbook sheets, cells, or legacy progress values.

The future apply interface remains in place, but production apply is gated by `LEGACY_EXCEL_IMPORT_ENABLED`. Excel migration is not a deploy blocker for Phase 3-A.
