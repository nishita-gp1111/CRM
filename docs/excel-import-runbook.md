# Excel Import Runbook

## Dry Run

1. Open `/imports/legacy-progress`.
2. Upload the progress management `.xlsx`.
3. Review read rows, candidates, unknown users, unknown products, unknown progress values, invalid dates, and amount errors.
4. Save the dry-run result as an ImportJob only after reviewing the preview.

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

## Current Phase 2 Behavior

The implemented UI/API supports dry run and stores a mapping-confirmation ImportJob. It intentionally does not create CRM records without a mapping confirmation step.
