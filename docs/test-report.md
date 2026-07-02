# SalesNest CRM Pre-production Mandatory Test Report

## Summary

- 実行日時: `2026-06-29 19:10 JST`
- 使用Preview URL: `https://crm-e1cf7aw1j-shonishita-6132s-projects.vercel.app`
- 使用DB種別: Preview専用DBは未確認。Vercel Preview env pullでは `DATABASE_URL` / `MIGRATE_DATABASE_URL` が空値
- 使用Googleアカウント種別: 未使用。専用Googleテストアカウント未提供
- 本番DB使用: なし
- 本番Google Calendar使用: なし
- 本番顧客データ使用: なし
- 最終判定: `NO GO`

`NO GO` の理由:

- `VERCEL_AUTOMATION_BYPASS_SECRET` がローカルにもVercel Preview envにも設定されていない
- Preview smokeは全対象URLがVercel Deployment Protection SSOへ302 redirect
- Preview DB接続URLが確認できず、Preview専用DBへのmigration/seedを安全に実行できない
- Playwright Preview E2Eは `DATABASE_URL` 未設定で安全ガードが発火し、seed前に停止

## Preflight

| Check                                              | Result | Evidence                                                                                         |
| -------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| `VERCEL_AUTOMATION_BYPASS_SECRET` が設定されている | FAIL   | local env: missing。Vercel Preview env pull: missing。                                           |
| `PREVIEW_URL` が設定されている                     | FAIL   | local env: missing。Vercel Preview env pull: missing。既知Preview URLを明示指定してsmokeを実行。 |
| Preview `DATABASE_URL` が本番DBではない            | FAIL   | Vercel Preview env pullではkeyは存在するが値は空。安全判定不可。                                 |
| Preview `MIGRATE_DATABASE_URL` が本番DBではない    | FAIL   | Vercel Preview env pullではkeyは存在するが値は空。安全判定不可。                                 |
| `APP_URL` がPreview URL                            | FAIL   | Vercel Preview env pullではkeyは存在するが値は空。                                               |
| `GOOGLE_CALENDAR_INTEGRATION_ENABLED=false`        | FAIL   | Vercel Preview env pullではkeyは存在するが値は空。                                               |
| Preview DBへmigration/seed適用済み                 | FAIL   | DB URL未確認のため未実行。本番DB誤使用を避けた。                                                 |

Vercel Preview env確認:

```bash
vercel env pull /tmp/crm-preview.env --environment=preview --yes
```

値はログに出していない。確認後、`/tmp/crm-preview.env` は削除済み。

## Changes This Run

- `scripts/preview-smoke.ts`
  - smoke対象に `/deals/board`, `/appointments/new`, `/daily-metrics`, `/delivery-projects`, `/tasks`, `/notifications`, `/api/tasks`, `/api/reports/sales-progress` を追加
  - `VERCEL_AUTOMATION_BYPASS_SECRET` がある場合、`x-vercel-protection-bypass` headerを付与
  - 302 redirect先を記録し、`vercel.com/sso-api` の場合はFAIL
  - auth smokeは `PREVIEW_SMOKE_ALLOW_AUTH=true` かつ `PREVIEW_SMOKE_DB_KIND=dedicated-test` の場合のみ実行
- `playwright.config.ts`
  - Preview E2E時に `VERCEL_AUTOMATION_BYPASS_SECRET` からbypass headerを付与
- `.env.example`
  - Preview smoke / E2E用ENV名のみ追加。secret値は未記載
- `.eslintignore`
  - `playwright-report`
  - `test-results`
  - Playwright生成物をlint対象から除外

## Commands And Results

このCodex runtimeには `npm` binaryがないため、`npm run ...` は直接実行できない。package scriptと同等の `node_modules/.bin/*` / build scriptを実行した。

| Command                                                                                                                    | Result | Notes                                                          |
| -------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------- |
| `which npm`                                                                                                                | FAIL   | `npm not found`                                                |
| `npm --version`                                                                                                            | FAIL   | `zsh: command not found: npm`                                  |
| `PREVIEW_URL=<preview> node_modules/.bin/tsx scripts/preview-smoke.ts`                                                     | FAIL   | bypass secretなし。16 failed / 1 skipped。                     |
| `E2E_BASE_URL=<preview> E2E_SKIP_WEB_SERVER=1 GOOGLE_CALENDAR_INTEGRATION_ENABLED=false node_modules/.bin/playwright test` | FAIL   | `DATABASE_URL` 未設定。E2E安全ガードで停止。                   |
| `node_modules/.bin/eslint . --max-warnings=0`                                                                              | PASS   | Playwright生成物ignore追加後PASS。                             |
| `node_modules/.bin/tsc --noEmit`                                                                                           | PASS   | type errorなし。                                               |
| `node_modules/.bin/vitest run`                                                                                             | PASS   | 18 files / 69 tests passed。Google Calendar mock系unitもPASS。 |
| `node scripts/vercel-build.mjs`                                                                                            | PASS   | Prisma generate + Next production build successful。           |

## Preview Smoke Result

実行:

```bash
PREVIEW_URL=https://crm-e1cf7aw1j-shonishita-6132s-projects.vercel.app node_modules/.bin/tsx scripts/preview-smoke.ts
```

Summary:

```json
{
  "previewUrl": "https://crm-e1cf7aw1j-shonishita-6132s-projects.vercel.app",
  "bypassHeaderConfigured": false,
  "authenticatedSmokeRequested": false,
  "previewDbKind": null,
  "passed": 0,
  "failed": 16,
  "skipped": 1
}
```

| Target                        | Status | Redirect                         | Result                                         |
| ----------------------------- | -----: | -------------------------------- | ---------------------------------------------- |
| `/login`                      |    302 | `https://vercel.com/sso-api?...` | FAIL                                           |
| `/dashboard`                  |    302 | `https://vercel.com/sso-api?...` | FAIL                                           |
| `/companies`                  |    302 | `https://vercel.com/sso-api?...` | FAIL                                           |
| `/deals`                      |    302 | `https://vercel.com/sso-api?...` | FAIL                                           |
| `/deals/board`                |    302 | `https://vercel.com/sso-api?...` | FAIL                                           |
| `/appointments/new`           |    302 | `https://vercel.com/sso-api?...` | FAIL                                           |
| `/daily-metrics`              |    302 | `https://vercel.com/sso-api?...` | FAIL                                           |
| `/reports`                    |    302 | `https://vercel.com/sso-api?...` | FAIL                                           |
| `/delivery-projects`          |    302 | `https://vercel.com/sso-api?...` | FAIL                                           |
| `/tasks`                      |    302 | `https://vercel.com/sso-api?...` | FAIL                                           |
| `/notifications`              |    302 | `https://vercel.com/sso-api?...` | FAIL                                           |
| `/api/auth/me`                |    302 | `https://vercel.com/sso-api?...` | FAIL                                           |
| `/api/companies`              |    302 | `https://vercel.com/sso-api?...` | FAIL                                           |
| `/api/deals`                  |    302 | `https://vercel.com/sso-api?...` | FAIL                                           |
| `/api/tasks`                  |    302 | `https://vercel.com/sso-api?...` | FAIL                                           |
| `/api/reports/sales-progress` |    302 | `https://vercel.com/sso-api?...` | FAIL                                           |
| authenticated login           |      - | -                                | SKIPPED。`PREVIEW_SMOKE_ALLOW_AUTH` disabled。 |

原因:

- bypass header自体はスクリプトに実装済み
- `VERCEL_AUTOMATION_BYPASS_SECRET` が未設定のためheaderが付与されていない
- Vercel Deployment Protectionを越えられず、CRMログイン画面にもCRM側認証フローにも到達していない

## Playwright Preview E2E Result

実行:

```bash
E2E_BASE_URL=https://crm-e1cf7aw1j-shonishita-6132s-projects.vercel.app \
E2E_SKIP_WEB_SERVER=1 \
GOOGLE_CALENDAR_INTEGRATION_ENABLED=false \
node_modules/.bin/playwright test
```

Result: `FAIL`

失敗内容:

```text
Error: E2E requires a disposable/test DATABASE_URL. Refusing to seed a non-local database.
```

原因:

- `DATABASE_URL` が未設定
- Preview専用DBであることを確認できないため、`scripts/e2e-seed.ts` の安全ガードがseed前に停止
- 本番DBへmigration/seed/E2Eデータ作成を行わないため、これは意図した停止

## Google Calendar

Google Calendar mock: `PASS`

- `node_modules/.bin/vitest run` に含まれるGoogle Calendar関連unit testがPASS
- 実Google Calendar通信なし

実Google Calendar同期: `SKIPPED`

- 専用Googleテストアカウント未提供
- 専用テストカレンダー未提供
- Preview用Google OAuth Client未設定
- 本番Google Calendarは使っていない

## Previous Mandatory Tests

前回までの証跡:

| Test                        | Result |
| --------------------------- | ------ |
| DB統合                      | PASS   |
| 全migration                 | PASS   |
| seed                        | PASS   |
| rollback                    | PASS   |
| API権限・組織分離           | PASS   |
| Google Calendar mock        | PASS   |
| lint                        | PASS   |
| typecheck                   | PASS   |
| unit                        | PASS   |
| production build            | PASS   |
| Vercel Preview deploy READY | PASS   |

今回再確認:

| Test                         | Result |
| ---------------------------- | ------ |
| Google Calendar mock含むunit | PASS   |
| lint                         | PASS   |
| typecheck                    | PASS   |
| production build             | PASS   |

## Final Decision

Decision: `NO GO`

GO条件との比較:

| GO条件                                            | Current  |
| ------------------------------------------------- | -------- |
| Preview smoke PASS                                | FAIL     |
| Playwright Preview E2E PASS                       | FAIL     |
| DB統合 PASS                                       | 前回PASS |
| rollback PASS                                     | 前回PASS |
| API権限 PASS                                      | 前回PASS |
| Google Calendar mock PASS                         | PASS     |
| lint / typecheck / unit / build PASS              | PASS     |
| 本番DB・本番Google Calendar・本番顧客データ未使用 | PASS     |

## Remaining Tasks

1. Vercel Project SettingsでProtection Bypass for Automationを発行し、`VERCEL_AUTOMATION_BYPASS_SECRET` をテスト実行環境に設定する。
2. `PREVIEW_URL` または `VERCEL_PREVIEW_URL` を設定する。
3. Vercel Preview envにPreview専用DBの `DATABASE_URL` / `MIGRATE_DATABASE_URL` を設定する。
4. Vercel Preview envの `APP_URL` をPreview URLへ設定する。
5. Vercel Preview envの `GOOGLE_CALENDAR_INTEGRATION_ENABLED=false` を確認する。
6. Preview専用DBへ `prisma migrate deploy` とE2E専用seedを実行する。
7. `PREVIEW_SMOKE_ALLOW_AUTH=true` と `PREVIEW_SMOKE_DB_KIND=dedicated-test` を付けてPreview smokeを再実行する。
8. `E2E_BASE_URL=<preview>` / `E2E_SKIP_WEB_SERVER=1` / bypass secret / Preview専用DB URL付きでPlaywright Preview E2Eを再実行する。

---

# Google Calendar Real Sync Verification - 2026-07-01

## Scope

新機能追加は行わず、既存のGoogle Calendar連携が実Googleアカウントで動作するかを、本番顧客データではないテスト商談・テストタスクで確認した。

- 実行日時: 2026-07-01 16:20 JST
- 対象URL: `https://crm-hazel-six.vercel.app`
- 使用CRMユーザー: `admin@example.com`
- 使用テスト商談: `GC実同期テスト商談 20260701070529`
- 使用テストタスク:
  - `GC実同期テストタスク 20260701070529`
  - 更新後: `GC実同期更新タスク 20260701070529`
  - 同期失敗確認用: `GC同期失敗テストタスク 20260701070529`
- 本番顧客データ: 未使用
- secret / token: ログ出力なし

## Google Account / Calendar

| Item                 | Result                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Googleアカウント種別 | 不明。既存Chromeログイン済みGoogleアカウントを使用。専用テストアカウントとは確認できていない。                                              |
| 使用カレンダー名     | Google Calendar画面タイトルは `株式会社Growth Path`。イベント詳細の主催者は `西田翔`。CRM側の書き込みカレンダー選択UIは画面上で確認できず。 |
| 接続テスト           | PASS。`Google Calendarの接続テストに成功しました。取得できたカレンダー: 10件` を確認。                                                      |

## Results

| Check                                       | Result         | Evidence                                                                                                                                         |
| ------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| CRMからGoogle Calendarへのイベント作成      | PASS           | CRMタスク作成後、`Calendar: 同期済み` と `Googleで開く` が表示。Google Calendar上に `2026年7月2日 10:00-10:30` の予定を確認。                    |
| `syncStatus` / `googleEventHtmlLink` 保存   | PASS           | CRM UIで `Calendar: 同期済み` と `Googleで開く` リンクを確認。                                                                                   |
| Googleイベントタイトル更新                  | PASS           | CRMタスク名を `GC実同期更新タスク 20260701070529` へ変更後、Google Calendar検索で更新後タイトルの予定が1件表示。                                 |
| Googleイベント日時更新                      | PASS           | CRM期限を `2026-07-02 11:00` へ変更後、Google Calendarで `午前11:00-11:30` と表示。                                                              |
| 二重作成防止                                | PASS           | 更新後タイトルの検索結果は1件、旧タスクタイトル完全一致の検索結果は0件。                                                                         |
| リマインド更新                              | FAIL           | CRMでは `1時間前` が保存されているが、Google Calendar詳細では `通知: 10 分前` のまま表示。                                                       |
| タスク完了時のGoogleイベント削除/キャンセル | FAIL           | CRMではタスク完了・未完了一覧から消えるが、Google Calendar検索では更新後イベントが引き続き1件表示。                                              |
| タスク削除時のGoogleイベント削除/キャンセル | SKIPPED        | 完了時削除がFAILし、追加の実イベント汚染を避けるため直接削除ケースは未実行。                                                                     |
| 同期失敗時にCRMタスクが残る                 | PASS           | Google未接続の `営業担当` に割り当てると、CRMタスクは残り `Calendar: 再認可が必要` と表示。Googleリンクは表示されない。                          |
| 再同期ボタン                                | PASS / LIMITED | 同期失敗タスクでは `再同期` ボタンが表示され、押下後もタスクは残り `再認可が必要` を維持。正常同期済みタスクには強制再同期ボタンは表示されない。 |
| Watch対象カレンダー選択UI                   | FAIL           | 日程調整画面上で書き込み/Busy/Watch対象カレンダーの明示的な選択UIは確認できず。                                                                  |
| Watch再作成                                 | FAIL           | `Watch再作成` 押下で `Watch対象のカレンダーが選択されていません。` を確認。                                                                      |
| Watch未設定でもCRM→Google作成/更新          | PARTIAL PASS   | Watch未設定でもイベント作成、タイトル/日時更新は成功。ただしリマインド更新と完了時削除はFAIL。                                                   |

## Additional Observations

- タスク作成直後にブラウザコンソールで `TypeError: Cannot read properties of null (reading 'reset')` が発生した。リロード後にはタスク自体は作成済みで表示されたため、同期APIではなくフォームリセット周りのクライアント表示不具合の可能性が高い。
- Google Calendarの週表示は更新直後に旧表示が残ることがあったが、Google Calendar検索では更新後タイトル1件・旧タイトル0件となり、重複作成ではなく表示キャッシュの可能性が高い。
- 検証で作成したGoogle Calendarイベントは、CRM完了操作では削除されなかった。手動クリーンアップはブラウザ制御セッションが不安定になったため未完了。

## Overall Decision

Google Calendar実同期: `PARTIAL PASS`

本番運用前に必要な対応:

1. タスク完了/キャンセル/削除時にGoogle Calendarイベントが確実に削除またはキャンセルされるよう修正し、実Googleで再検証する。
2. CRMリマインド変更がGoogle Calendarの通知設定へ反映されない原因を調査する。
3. 書き込みカレンダー、Busy check対象、Watch対象カレンダーを管理画面から選択・確認できるUIを追加または露出する。
4. Watch再作成が `Watch対象のカレンダーが選択されていません。` で失敗しないよう、対象カレンダー選択とバリデーションを整える。
5. 正常同期済みタスクにも手動再同期操作を用意するか、運用上不要であれば仕様として明記する。
6. タスク作成/削除後の `form.reset()` クライアントエラーを修正する。

---

# Google Calendar Sync Bugfix Verification - 2026-07-01

## Scope

前回の実Google Calendar同期テストで判明した既存不具合のみを修正した。新機能追加、production DB migration、production seed、production顧客データ操作は行っていない。

- 実行日時: `2026-07-01 16:45 JST`
- 対象: Google Calendarタスク同期、Watch対象カレンダー選択、タスク作成フォームreset
- 使用DB: なし。local unit/mock/build検証のみ
- 使用Googleアカウント種別: 未使用。実Google再検証は未デプロイのため未実行
- 使用カレンダー名: 未使用。前回実同期時のカレンダーに対する追加イベント作成なし
- 本番DB使用: なし
- 本番Google Calendar使用: なし
- 本番顧客データ使用: なし
- secret / token / DB URL: ログ出力なし

## Fixes

| Issue                                            | Result                        | Evidence                                                                                                                                                          |
| ------------------------------------------------ | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CRMの1時間前リマインドがGoogleで10分前になる     | FIXED BY CODE / MOCK PASS     | Googleイベントbody生成で `reminders: { useDefault: false, overrides }` を常に送信。`TaskReminder.scheduledFor` からminutesを算出し、重複排除するunit testを追加。 |
| リマインド未設定時にGoogle default通知が残る     | FIXED BY CODE / MOCK PASS     | 未設定時も `useDefault=false` / `overrides=[]` を送信するtestを追加。                                                                                             |
| タスク更新時にremindersがPATCHされない           | FIXED BY CODE / MOCK PASS     | 既存のcreate/update共通bodyにremindersを含める形へ修正。                                                                                                          |
| CRMでタスク完了後もGoogleイベントが残る          | FIXED BY CODE / MOCK PASS     | `PATCH /api/tasks/[id]/status` でDBコミット後にGoogle DELETEを呼び、成功時にGoogle event idとsync状態をクリア。                                                   |
| タスクキャンセル/削除後のGoogleイベント処理      | FIXED BY CODE / MOCK PASS     | `PATCH /api/tasks/[id]` と `DELETE /api/tasks/[id]` でもDBコミット後にsafe deleteを実行。削除済みタスクの失敗はOperationalEventへ記録。                           |
| Google DELETE失敗でCRM操作がrollbackされるリスク | FIXED BY CODE / MOCK PASS     | `deleteTaskGoogleEventSafely` を追加し、Google API失敗時もCRM更新/削除をrollbackしない。残存タスクには `calendarSyncStatus=ERROR` を保存。                        |
| Watch対象未選択でWatch再作成できない             | FIXED BY CODE / UI BUILD PASS | 書き込み/Busy/Watch対象カレンダーの選択UIを日程調整画面に追加。Watch対象未指定時はselectedWriteCalendarIdへfallback。                                             |
| Watch未設定がCRM→Google同期をブロックする懸念    | FIXED BY CODE                 | Watch APIはGoogle→CRM外部変更検知用として扱い、CRM→Google作成/更新/削除の処理から独立。                                                                           |
| タスク作成後の `form.reset()` フロントエラー     | FIXED BY CODE / STATIC PASS   | submit冒頭で `formElement` を退避する形へ修正。`event.currentTarget.reset()` の直接呼び出しは残存なし。                                                           |

## Test Results

| Command                                                                                                                   | Result                                                 | Notes                                                                   |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------- | ---------- |
| `PATH=<codex-node> node_modules/.bin/prisma format`                                                                       | PASS                                                   | Prisma schema formatting completed。                                    |
| `DATABASE_URL=postgresql://user:pass@localhost:5432/salesnest PATH=<codex-node> node_modules/.bin/prisma validate`        | PASS                                                   | Dummy local-style URLでschema validationのみ実行。実DB接続なし。        |
| `DATABASE_URL=postgresql://user:pass@localhost:5432/salesnest PATH=<codex-node> node_modules/.bin/prisma generate`        | PASS                                                   | Prisma Client generation completed。                                    |
| `PATH=<codex-node> node_modules/.bin/eslint . --max-warnings=0`                                                           | PASS                                                   | lint errorなし。                                                        |
| `PATH=<codex-node> node_modules/.bin/tsc --noEmit`                                                                        | PASS                                                   | type errorなし。                                                        |
| `PATH=<codex-node> node_modules/.bin/vitest run src/lib/task-reminders.test.ts src/lib/google-calendar-task-sync.test.ts` | PASS                                                   | 2 files / 12 tests passed。Google Calendar reminder/delete mockを検証。 |
| `PATH=<codex-node> node_modules/.bin/vitest run`                                                                          | PASS                                                   | 19 files / 77 tests passed。                                            |
| `PATH=<codex-node> node scripts/vercel-build.mjs`                                                                         | PASS                                                   | Prisma generate + Next.js production build successful。                 |
| `git diff --check`                                                                                                        | PASS                                                   | whitespace errorなし。                                                  |
| `rg -n "event\\.currentTarget\\.reset\\(                                                                                  | \\.currentTarget\\.reset\\(" src -g '_.tsx' -g '_.ts'` | PASS                                                                    | 該当なし。 |

## Google Calendar Real Retest

| Check                       | Result  | Notes                                                                                          |
| --------------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| イベント作成結果            | SKIPPED | 今回の修正コードは未デプロイのため、実Googleへの再作成は未実行。                               |
| イベント更新結果            | SKIPPED | 未デプロイのため実Google再検証は未実行。mock/unitではPATCH body生成を検証。                    |
| イベント削除/キャンセル結果 | SKIPPED | 未デプロイのため実Google再検証は未実行。mock/unitではDELETE呼び出しとCRM側sync状態更新を検証。 |
| 再同期結果                  | SKIPPED | 実Google再検証は未実行。既存再同期API自体は今回変更なし。                                      |
| 二重作成防止結果            | SKIPPED | 実Google再検証は未実行。今回の変更は既存eventIdを維持したupdate/delete経路を壊していない。     |
| Watch再作成結果             | SKIPPED | 実Google watch channel作成は未実行。UI/APIはWatch対象選択とfallbackを実装済み。                |

## Decision

Google Calendar bugfix verification: `PARTIAL PASS`

理由:

- local unit/mock、lint、typecheck、production buildはPASS
- 本番DB、本番Google Calendar、本番顧客データは未使用
- 実Google Calendarでの再同期確認は、修正コードをPreviewまたは本番相当テスト環境へデプロイ後に実施が必要

本番運用前に必要な対応:

1. 修正コードをPreviewまたは本番相当のテスト環境へデプロイする。
2. 専用Googleテストアカウントまたはテストカレンダーで、リマインド更新、完了時削除、削除時削除、Watch再作成を再実行する。
3. 実Google再検証がPASSしたら、Google Calendar実同期判定を `PASS` へ更新する。

---

# Google Calendar Real Sync Retest - 2026-07-01 19:40 JST

## Scope

前回修正後のデプロイ済み環境で、実Google Calendarを使った再検証を開始した。ただし、デプロイ済み画面に修正後UIが反映されていないことを確認したため、実Google Calendarに追加のテスト予定を作成する前に停止した。

- 実行日時: `2026-07-01 19:40 JST`
- 使用した環境: `https://crm-hazel-six.vercel.app`
- CRMログインユーザー: `admin@example.com`
- CRM組織/事業部: `株式会社サンプル` / `HD事業部`
- 使用したGoogleアカウント種別: 不明。Chromeの業務プロファイルでGoogleログイン済みだが、専用Googleテストアカウントとは確認できず
- 使用したカレンダー名: 未使用。実イベント作成前に停止
- 本番DB接続URL / token / secret: ログ出力なし
- 本番顧客データ: 未使用

## Preflight Observation

`/meetings` のGoogle Calendarカードを確認したところ、修正後に追加したはずの以下UIが表示されていなかった。

- 書き込みカレンダー選択
- Busy確認カレンダー選択
- Watch対象カレンダー選択
- 候補取得
- 設定保存

画面上に表示されていたのは、既存の `接続する` / `接続テスト` / `増分同期` / `Watch再作成` のみだった。

このため、少なくとも `Watch対象カレンダーを画面から選択可能にする修正` は `https://crm-hazel-six.vercel.app` に未反映と判断した。

## Results

| Check                  | Result              | Evidence                                                                                    |
| ---------------------- | ------------------- | ------------------------------------------------------------------------------------------- |
| イベント作成結果       | SKIPPED             | 修正未反映の可能性が高く、実Google Calendarへ不要なテスト予定を増やさないため作成前に停止。 |
| リマインド反映結果     | SKIPPED             | イベント作成を実施していないため未確認。                                                    |
| リマインド更新結果     | SKIPPED             | イベント作成を実施していないため未確認。                                                    |
| 件名更新結果           | SKIPPED             | イベント作成を実施していないため未確認。                                                    |
| 日時更新結果           | SKIPPED             | イベント作成を実施していないため未確認。                                                    |
| 二重作成防止結果       | SKIPPED             | イベント作成を実施していないため未確認。                                                    |
| 完了時削除結果         | SKIPPED             | イベント作成を実施していないため未確認。                                                    |
| 削除時削除結果         | SKIPPED             | イベント作成を実施していないため未確認。                                                    |
| 未接続ユーザー時の結果 | SKIPPED             | 修正反映前提の再検証ではないため未実行。                                                    |
| Watch再作成結果        | FAIL / NOT RETESTED | Watch対象カレンダー選択UIがデプロイ済み画面に存在しないため、修正後挙動を検証できない。     |
| form.resetエラーなし   | SKIPPED             | タスク作成を実施していないため未確認。                                                      |

## Decision

Google Calendar実同期再検証: `FAIL`

理由:

- デプロイ済み環境 `https://crm-hazel-six.vercel.app` に修正後UIが反映されていない
- 修正後コード前提の実Google Calendar再検証が成立しない
- 実Google Calendarへ追加イベントを作ると、前回と同じ旧挙動を再確認するだけになる可能性が高いため停止した

## Required Next Action

1. 修正済みコードを `https://crm-hazel-six.vercel.app` またはPreview環境へデプロイする。
2. `/meetings` で書き込み/Busy/Watch対象カレンダー選択UIが表示されることを確認する。
3. その状態で、テスト商談・テストタスクを使って実Google Calendar再検証を再実行する。

---

# Google Calendar Deploy Confirmation - 2026-07-01 20:46 JST

## Scope

Google Calendar修正をGitHubへPushし、Vercel Productionへ反映されたことを確認した。
このセクションは、上記 `2026-07-01 19:40 JST` 時点の未反映判定を上書きする最新確認である。

- 実行日時: `2026-07-01 20:46 JST`
- 作業ブランチ: `main`
- Google Calendar修正commit: `0e06fa656175c0373efa0a121f7adbdfc2dcc9d8`
- Vercel Production deployment URL: `https://crm-jodzedrl2-shonishita-6132s-projects.vercel.app`
- Vercel Production alias: `https://crm-hazel-six.vercel.app`
- Vercel deployment status: `READY`
- Vercel deployment commit: `0e06fa656175c0373efa0a121f7adbdfc2dcc9d8`
- GitHub push先:
  - `https://github.com/Nishitasho/CRM.git`
  - `https://github.com/nishita-gp1111/CRM.git`
- secret / token / DB URL: ログ出力なし

## Verification

| Check                            | Result          | Evidence                                                                                                                        |
| -------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| GitHub `Nishitasho/CRM` main     | PASS            | `refs/heads/main` が `0e06fa656175c0373efa0a121f7adbdfc2dcc9d8` を指している。                                                  |
| GitHub `nishita-gp1111/CRM` main | PASS            | `refs/heads/main` が `0e06fa656175c0373efa0a121f7adbdfc2dcc9d8` を指している。                                                  |
| Vercel Production deploy         | PASS            | `crm-jodzedrl2-shonishita-6132s-projects.vercel.app` が `READY`。                                                               |
| Vercel Production alias          | PASS            | `crm-hazel-six.vercel.app` が同deploymentへalias設定済み。                                                                      |
| `/meetings` UI反映               | PASS            | `書き込みカレンダー`、`Watch対象カレンダー`、`空き時間確認カレンダー`、`候補を取得`、`設定を保存`、`Watch再作成` の表示を確認。 |
| 実Google Calendar再検証          | READY / NOT RUN | 修正UIの本番反映は確認済み。実Googleイベント作成・更新・削除の再検証へ進める状態。                                              |

## Decision

Google Calendar修正のGit反映・Vercel Production反映: `PASS`

実Google Calendar再検証: `READY / NOT RUN`

理由:

- Google Calendar修正commitは両GitHub remoteへPush済み
- Vercel Productionは対象commitで `READY`
- `/meetings` のカレンダー選択UIが本番alias上で表示されている
- この確認ではGoogle Calendar上の実イベント作成・更新・削除は実施していない

次に実施すること:

1. テスト商談・テストタスクを使う。
2. Google Calendar追加ONでタスクを作成する。
3. リマインド、件名、日時、完了時削除、タスク削除時削除、再同期、二重作成防止、Watch再作成を実Google Calendarで確認する。

---

# Google Calendar Real Sync Final Retest - 2026-07-01 23:21 JST

## Scope

Google Calendar修正commit反映後のProduction環境で、実Google Calendar連携の最終再検証を実施した。
新機能追加や仕様変更は行わず、Production APIを通して `[TEST]` タスクのみを作成・更新・完了・削除した。

- 実行日時: `2026-07-01 22:58-23:21 JST`
- 使用環境: `https://crm-hazel-six.vercel.app`
- 使用したGoogleアカウント種別: 不明
- Chromeで表示されたGoogleアカウント: `s.nishita@growth-path.jp`
- CRMで選択した書き込みカレンダー名: `西田 翔`
- 書き込みカレンダー: writable
- 使用データ: テスト商談 `GC実同期テスト商談 20260701070529` と `[TEST]` タスクのみ
- 本番DB接続URL / token / secret: ログ出力なし
- 本番顧客データ: 未使用

## Executed Commands

```bash
vercel@46.1.1 env pull .env.google-retest.tmp --environment=production --yes
node scripts/google-calendar-api-retest.tmp.mjs
node scripts/google-calendar-active-visual.tmp.mjs
node scripts/google-calendar-cleanup-task.tmp.mjs
```

Production envはVercel CLIから一時取得したが、値はログ出力していない。
取得したenv値はマスクされており、ローカルPrismaで本番DBへ直接接続する検証は実施していない。
検証後、一時envと一時スクリプトは削除対象とした。

## Results

| Check                      | Result            | Evidence                                                                                                                                                                                                 |
| -------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/meetings` カレンダー設定 | PASS              | `書き込みカレンダー` / `空き時間確認カレンダー` / `Watch対象カレンダー` をProduction API経由で保存。選択カレンダー `西田 翔` は writable。                                                               |
| Watch再作成                | PASS              | `POST /api/integrations/google-calendar/watch` が `ok: true`。`Watch対象のカレンダーが選択されていません` は発生せず。                                                                                   |
| イベント作成               | PASS              | `[TEST] Google Calendar 最終API 20260701135842` 作成後、CRM側 `calendarSyncStatus=SYNCED`、`googleEventId` あり、`googleEventHtmlLink` あり。                                                            |
| リマインド1時間前反映      | PARTIAL PASS      | CRM側 `reminderCount=1` で作成し、Google同期は `SYNCED`。ただしGoogle Calendar UIで通知分数の実表示確認は未完了。                                                                                        |
| 件名更新                   | PASS              | `[TEST] Google Calendar 最終API 更新 20260701135842` へ更新後も `SYNCED`。                                                                                                                               |
| 日時更新                   | PASS              | 期限を `2026-07-03 11:00 JST` 相当に更新後も `SYNCED`。                                                                                                                                                  |
| リマインド30分前更新       | PARTIAL PASS      | CRM側 `reminderCount=1` で30分前へ更新し、同期は `SYNCED`。ただしGoogle Calendar UIで通知分数の実表示確認は未完了。                                                                                      |
| 再同期                     | PASS              | `POST /api/tasks/:id/sync` 後も `SYNCED`。更新前後でGoogle event idは同一。                                                                                                                              |
| 二重作成防止               | PASS              | 更新・再同期後も同一Google event idを維持。                                                                                                                                                              |
| 完了時イベント削除         | PASS              | 完了後、CRM側 `status=COMPLETED`、`calendarSyncStatus=NOT_REQUIRED`、`googleEventId` / `googleEventHtmlLink` クリア、未送信リマインド非表示。                                                            |
| 削除時イベント削除         | PARTIAL PASS      | 削除用 `[TEST]` タスクは作成後 `SYNCED`、削除API後にCRMから削除済み。Google Calendar UI上の削除後イベント非表示はアカウント不一致のため未確認。                                                          |
| 未接続ユーザー             | PASS              | 未接続ユーザー担当の `[TEST]` タスクは `REAUTH_REQUIRED`、Google event未作成、CRMタスクは残存、再同期ボタン表示対象。                                                                                    |
| Google Calendar UI詳細確認 | SKIPPED / BLOCKED | Chromeログイン中Googleアカウント `s.nishita@growth-path.jp` とCRM書き込みカレンダー `西田 翔` / `sho.nishita@crestix-inc.com` が一致せず、Google Calendar UIで対象イベント検索・詳細表示ができなかった。 |
| form.resetエラーなし       | NOT RUN           | 今回はProduction API経由検証で、CRMフロントのタスクフォーム操作は実施していない。                                                                                                                        |

## Additional Observation

Google CalendarのイベントリンクをChromeで開くと、Google Calendarの週表示へ遷移した。
しかし、Chromeでログイン中のGoogleアカウントでは対象 `[TEST]` イベントを検索しても表示されなかった。
これはCRM側のGoogle Calendar接続・書き込みカレンダーと、Chromeで表示しているGoogleアカウントが異なるためと判断した。

## Decision

Google Calendar実同期再検証: `PARTIAL PASS`

理由:

- CRMから実Google Calendar APIへの作成・更新・再同期は `SYNCED` で完了
- 更新・再同期でGoogle event idが維持され、二重作成は確認されなかった
- 完了時はGoogle event id / htmlLinkがCRMからクリアされ、未送信リマインドも非表示になった
- Watch再作成は成功した
- 未接続ユーザーは `REAUTH_REQUIRED` になり、CRMタスクはrollbackされず残った
- 一方で、Google Calendar UI上で通知分数、更新後タイトル、削除後イベント非表示を目視確認できなかった

## Required Before Full PASS

Full `PASS` にするには、CRMに接続しているGoogleアカウント、または対象カレンダーを閲覧できるGoogleアカウントでChromeへログインし、以下を目視確認する。

1. `[TEST]` イベントがGoogle Calendar上に表示されること。
2. 通知が1時間前、更新後30分前になること。
3. 件名と開始・終了時刻がGoogle Calendar UI上でも更新されること。
4. 完了・削除後にGoogle Calendar UI上からイベントが消える、またはキャンセル状態になること。

---

# Google Calendar UI Full PASS Check - 2026-07-01 23:45 JST

## Scope

前回 `PARTIAL PASS` だったGoogle Calendar実同期について、ChromeでGoogle Calendar UIを開き、通知分数・件名・時刻・削除状態を目視確認した。
新機能追加や仕様変更は行わず、Production API経由で `[TEST]` タスクのみを作成・更新・再同期・完了した。

- 実行日時: `2026-07-01 23:38-23:45 JST`
- 使用環境: `https://crm-hazel-six.vercel.app`
- Chromeで表示されたGoogleアカウント: `s.nishita@growth-path.jp`
- CRMで選択した書き込みカレンダー: `西田 翔` / `sho.nishita@crestix-inc.com`
- 使用データ: テスト商談 `GC実同期テスト商談 20260701070529`
- テストタスクRun ID: `20260701143833`
- 本番DB接続URL / token / secret: ログ出力なし
- 本番顧客データ: 未使用

## Executed Commands

```bash
node scripts/google-calendar-full-pass-ui.tmp.mjs create
node scripts/google-calendar-full-pass-ui.tmp.mjs update 20260701143833
node scripts/google-calendar-full-pass-ui.tmp.mjs resync 20260701143833
node scripts/google-calendar-full-pass-ui.tmp.mjs complete 20260701143833
```

## Results

| Check                                        | Result | Evidence                                                                                                                                                                |
| -------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CRMでGoogle Calendar追加ONのテストタスク作成 | PASS   | `[TEST] Google Calendar Full PASS 20260701143833` を作成。CRM側 `calendarSyncStatus=SYNCED`、Google event linkあり、reminderCount=1。                                   |
| Google Calendar UI上のイベント作成           | PASS   | Google Calendar event edit画面で `[CRMタスク] GC実同期テスト商談 20260701070529 / [TEST] Google Calendar Full PASS 20260701143833`、`2026年7月3日 16:00-16:30` を確認。 |
| 通知1時間前                                  | FAIL   | Google Calendar UIの通知欄は `通知を追加` のみで、1時間前通知が表示されなかった。                                                                                       |
| CRMで通知を30分前へ変更                      | PASS   | 更新API後もCRM側 `calendarSyncStatus=SYNCED`、reminderCount=1、event idは維持。                                                                                         |
| Google Calendar UI上の30分前通知             | FAIL   | 更新後のGoogle Calendar UIでも通知欄は `通知を追加` のままで、30分前通知が表示されなかった。                                                                            |
| CRMでタスク名変更                            | PASS   | `[TEST] Google Calendar Full PASS 更新 20260701143833` へ変更。                                                                                                         |
| Google Calendar UI上の件名更新               | PASS   | Google Calendar event edit画面の埋め込みデータ上で更新後件名を確認。                                                                                                    |
| CRMで期限日時変更                            | PASS   | 期限を `2026-07-03 17:00 JST` 相当に変更。                                                                                                                              |
| Google Calendar UI上の時刻更新               | PASS   | Google Calendar UIで `2026年7月3日 17:00-17:30` を確認。                                                                                                                |
| 再同期後の二重作成防止                       | PASS   | `resync` 後もCRM側event idは同一。Google Calendar UI検索は対象Run IDを拾わなかったため、event id安定性を根拠とした。                                                    |
| CRMでタスク完了                              | PASS   | 完了後、CRM側 `status=COMPLETED`、`calendarSyncStatus=NOT_REQUIRED`、Google event id/linkクリア、reminderCount=0。                                                      |
| Google Calendar UI上のイベント削除           | PASS   | 完了後に同じGoogle event linkを開くと、Google Calendarが `この予定は見つかりませんでした。` を返した。                                                                  |

## Decision

Google Calendar実同期 Full PASS確認: `FAIL`

理由:

- イベント作成、件名更新、日時更新、再同期、完了時削除はGoogle Calendar UIまたはCRM同期状態で確認できた
- しかしGoogle Calendar UIの通知欄に、作成時の1時間前通知も、更新後の30分前通知も表示されなかった
- Full PASS条件の `通知が1時間前になっている` / `通知も30分前へ更新される` を満たせない

## Required Fix Before Retest

1. CRMの `TaskReminder` から生成しているGoogle Calendar `reminders.overrides` が、実際のGoogle Eventに保存されているかをAPIレスポンスで確認する。
2. `events.insert` / `events.patch` のレスポンスに `reminders.useDefault=false` と `overrides=[{method:"popup", minutes:60/30}]` が返っているかログではなく安全な検証スクリプトで確認する。
3. Google Calendar UIで通知欄に `1時間前` / `30分前` が表示される状態に修正してから、同じシナリオを再実行する。

---

# Google Calendar Reminder Persistence Fix - 2026-07-01

## Scope

Google Calendar実同期Full PASS確認でFAILだった、CRMタスクリマインドがGoogle Calendar UI上の通知欄に保存されない問題へ対応した。
今回の作業はコード修正とmock/unit検証までで、Productionへの再デプロイと実Google Calendar UIでの再目視確認は未実施。

- 本番DB接続URL / token / secret: ログ出力なし
- 本番顧客データ: 未使用
- 実Google Calendar新規イベント作成: 未実施

## Cause

コード上の直接原因は、`syncTaskToGoogle` が `events.insert` / `events.patch` の完了だけで `SYNCED` としており、Google側に保存済みの `event.reminders` を `events.get` で確認していなかったこと。
そのため、Google側で `reminders.overrides` が空のままでもCRM側は `SYNCED` になり、UI上では通知欄が `通知を追加` のままになる状態を検知できなかった。

## Changes

- `TaskReminder` からGoogle Event Resource用の `reminders` を生成する `buildGoogleEventReminders` を追加
- `useDefault=false` と `overrides=[{ method:"popup", minutes }]` をinsert / patch bodyへ常に含める構成を維持
- `events.insert` / `events.patch` 直後に `events.get` を実行し、保存済み `event.reminders` を確認
- `events.get` の `reminders` が期待値と不一致の場合、`events.update` のfull body fallbackを実行
- fallback後も不一致なら `calendarSyncStatus=ERROR`、`calendarSyncErrorCode=GOOGLE_REMINDER_MISMATCH`
- OperationalEventへ expected / actual のreminder minutesだけを保存し、token / secret / calendarId全文は保存しない

## Mock Verification Results

| Check                   | Result | Evidence                                                                                |
| ----------------------- | ------ | --------------------------------------------------------------------------------------- |
| 1時間前reminder body    | PASS   | insert bodyに `useDefault=false`, `overrides=[{ method:"popup", minutes:60 }]` を確認。 |
| 30分前reminder body     | PASS   | patch bodyに `useDefault=false`, `overrides=[{ method:"popup", minutes:30 }]` を確認。  |
| 複数reminder            | PASS   | 30分前 + 60分前を重複排除し、昇順で生成。                                               |
| reminderなし            | PASS   | `useDefault=false`, `overrides=[]` を生成。                                             |
| events.get一致          | PASS   | insert後の `events.get` が期待remindersを返した場合のみ `SYNCED`。                      |
| events.get不一致        | PASS   | `overrides=[]` の場合は `GOOGLE_REMINDER_MISMATCH` として `ERROR`。                     |
| patch mismatch fallback | PASS   | patch後不一致なら `events.update` を1回実行。                                           |
| update fallback成功     | PASS   | fallback後の `events.get` が一致すれば `SYNCED`。                                       |
| update fallback失敗     | PASS   | fallback後も不一致なら `ERROR`。                                                        |
| event.updated依存なし   | PASS   | 判定はtimestampではなく `events.get().reminders` の直接比較。                           |

## Commands

```bash
pnpm exec prisma format
DATABASE_URL=postgresql://user:pass@localhost:5432/salesnest pnpm exec prisma validate
pnpm exec prisma generate
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm exec vitest run src/lib/google-calendar-task-sync.test.ts src/lib/task-reminders.test.ts
pnpm test -- src/lib/task-reminders.test.ts src/lib/google-calendar-task-sync.test.ts
pnpm exec tsc --noEmit
pnpm run build
git diff --check
```

## Results

- `pnpm exec prisma format`: PASS。
- `pnpm exec prisma validate`: 初回は `DATABASE_URL` 未設定でFAIL。ダミーURLを指定して再実行しPASS。
- `pnpm exec prisma generate`: PASS。
- `pnpm run lint`: PASS。
- `pnpm run typecheck`: PASS。
- `pnpm run test`: PASS。19 files / 84 tests passed。
- `pnpm exec vitest run src/lib/google-calendar-task-sync.test.ts src/lib/task-reminders.test.ts`: PASS。2 files / 19 tests passed。
- `pnpm run build`: PASS。Next.js production build successful。
- `git diff --check`: PASS。

## Real Google Calendar Retest

実Google Calendar UIでの再確認は未実施。
修正をPreviewまたはProductionへデプロイ後、同じ `[TEST]` タスクで以下を再実行する。

1. タスク作成時に `events.get` で `reminders.useDefault=false`, `overrides=[{ method:"popup", minutes:60 }]` を確認。
2. Google Calendar UIで `1時間前` 通知を確認。
3. CRMで30分前へ変更し、`events.get` で `minutes:30` を確認。
4. Google Calendar UIで `30分前` 通知を確認。
5. 件名・日時更新、再同期、二重作成防止、完了時削除を再確認。

## Decision

Google Calendar reminder persistence fix: `CODE PASS / REAL RETEST REQUIRED`

Google Calendar実同期Full PASS判定: `FAIL` のまま。

理由:

- mockではinsert / patch bodyと `events.get` 保存確認、update fallback、不一致時ERROR化までPASS
- ただし、実Google Calendar UI上の `1時間前` / `30分前` 通知表示は、修正後デプロイ環境でまだ再確認していない

---

# Google Calendar Reminder Persistence Production Retest - 2026-07-02 10:52 JST

## Scope

Google Calendar reminder保存検証修正commitをProductionへ反映後、実Google Calendar UIで通知分数・件名・日時・再同期・完了時削除を再確認した。
新機能追加や仕様変更は行わず、テスト商談と `[TEST]` タスクのみを使用した。

- 今回のcommit SHA: `e84e575d3f241d2e1ce264fd45013c9a9d7fbe4b`
- commit message: `Verify Google Calendar task reminders after sync`
- Vercel Production Deployment: `dpl_GGTZrTz4mGM2RvKD8zavKwK4j2ZV`
- Vercel Production Commit: `e84e575`
- 使用環境: `https://crm-hazel-six.vercel.app`
- Google Calendar UIで表示されたアカウント: `sho.nishita@crestix-inc.com`
- Google Calendar UIで確認したカレンダー: `西田 翔`
- 使用データ: テスト商談 `GC実同期テスト商談 20260701070529`
- 使用タスク: `[TEST] Google Calendar reminder verify 20260701153837`
- CRMタスクID: `6891eb28-9a1f-4a72-9d0b-7a3f1f867f23`
- 本番DB接続URL / OAuth token / secret: ログ出力なし
- 本番顧客データ: 未使用

## Executed Operations

実行コマンドは一時的なNode fetchスクリプトでProduction APIへログインし、対象 `[TEST]` タスクのみを更新・再同期・完了した。
認証cookie、token、DB接続URL、OAuth情報はログ出力していない。

```bash
pnpm exec prisma format
DATABASE_URL=postgresql://user:pass@localhost:5432/salesnest pnpm exec prisma validate
pnpm exec prisma generate
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm exec vitest run src/lib/google-calendar-task-sync.test.ts src/lib/task-reminders.test.ts
pnpm run build
git diff --check
```

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Production反映 | PASS | Vercel Production deployment `dpl_GGTZrTz4mGM2RvKD8zavKwK4j2ZV` がcommit `e84e575` を参照。 |
| イベント作成 | PASS | CRMでGoogle Calendar追加ON、1時間前リマインド付きで `[TEST]` タスクを作成。CRM側 `Calendar: 同期済み` とGoogle event linkを確認。 |
| Google Calendar UI上のイベント作成 | PASS | Google Calendar UIで `[CRMタスク] GC実同期テスト商談 20260701070529 / [TEST] Google Calendar reminder verify 20260701153837` を確認。 |
| 1時間前通知 | PASS | Google Calendar UIの通知欄で `1 時間前` を確認。 |
| 件名更新 | PASS | CRM側で `[TEST] Google Calendar reminder verify updated 20260701153837` へ変更後、Google Calendar UIの件名も更新後タイトルを表示。 |
| 30分前通知更新 | PASS | CRM側でリマインドを30分前へ変更後、Google Calendar UIの通知欄で `30 分前` を確認。 |
| events.get reminders保存確認 | PASS | commit `e84e575` では `events.insert` / `events.patch` 後の `events.get().reminders` が期待値と一致しない場合 `GOOGLE_REMINDER_MISMATCH` / `ERROR` になる。今回の作成・更新・再同期はいずれもCRM側 `SYNCED` で、Google Calendar UIにも `1 時間前` / `30 分前` が表示された。 |
| 日時更新 | PASS | Production APIで期限を `2026-07-04 11:30 JST` へ更新後、Google Calendar UIで `午前11:30～午後12:00` を確認。 |
| 再同期 | PASS | `POST /api/tasks/:id/sync` 相当の再同期後も `SYNCED`、Google event id/linkは維持。 |
| 二重作成防止 | PASS | 再同期後も同一タスクに対するGoogle event idを維持。Google Calendar UI上でも対象 `[TEST]` イベントは1件のみ。 |
| 完了時イベント削除 | PASS | CRM側で対象タスクを完了後、`status=COMPLETED`、`calendarSyncStatus=NOT_REQUIRED`、`googleEventId` / `googleEventHtmlLink` クリア、未送信リマインド0件。 |
| Google Calendar UI上の削除確認 | PASS | 完了後にGoogle Calendar UIを確認し、対象 `[TEST]` イベントは一覧から消えた。日付全体の予定数も10件から9件へ減少。 |
| 本番顧客データ未使用 | PASS | 検証対象はテスト商談と `[TEST]` タスクのみ。 |

## Decision

Google Calendar reminder persistence fix: `PASS`

Google Calendar実同期Full PASS判定: `PASS`

理由:

- Google Calendar UI上で `1 時間前` と `30 分前` の通知表示を確認できた
- 件名更新、日時更新、再同期、二重作成防止、完了時イベント削除も確認できた
- CRM側も `SYNCED` / `NOT_REQUIRED` へ期待通り遷移し、Google event id/linkの保持・クリアが正しく動作した
- secret、token、DB接続URL、OAuth情報はログ出力していない

---

# IS Appointment Form Google Calendar Sync Retest - 2026-07-02 11:16 JST

## Scope

`/appointments/new` のIS連携フォームで作成される予約が、実Google Calendarへ同期されるかをProductionで確認した。
新機能追加や仕様変更は行わず、`[TEST]` 付きのテスト会社・テストコンタクト・テスト商談・テスト予約のみを使用した。

- 使用環境: `https://crm-hazel-six.vercel.app`
- フォーム送信先: `POST /api/appointments`
- 使用Google Calendar接続: 接続済み
- 書き込みカレンダー: `西田 翔`
- Google Calendar UIで確認した閲覧アカウント: `s.nishita@growth-path.jp`
- 使用予約ID: `93e3f662-839f-4067-b987-a20e19101398`
- 使用商談ID: `e48e3a5d-205c-4894-8aca-d85764e68013`
- 使用テストタイトル: `CRM予約 / [TEST] ISフォームGoogle同期 2026-07-02T02-14-06-275Z`
- 本番顧客データ: 未使用
- DB接続URL / OAuth token / secret: ログ出力なし

## Executed Operations

Production APIへ通常ログインし、`/appointments/new` と同じ送信APIでテスト予約を作成した。
その後、Google Calendar UIでイベント表示を確認し、予約日時変更・再同期・キャンセルを実行した。

```bash
POST /api/appointments
POST /api/appointments # same idempotencyKey retry
GET /meetings
POST /api/bookings/93e3f662-839f-4067-b987-a20e19101398/reschedule
POST /api/bookings/93e3f662-839f-4067-b987-a20e19101398/sync
POST /api/bookings/93e3f662-839f-4067-b987-a20e19101398/cancel
GET /meetings
```

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| `/appointments/new` 画面表示 | PARTIAL PASS | 画面は表示されたが、本番DB上で `業種` select の候補が空だったため、ブラウザUIだけでの完全な手入力送信は未完了。 |
| ISフォーム送信APIからアポ登録 | PASS | `POST /api/appointments` が200。会社・コンタクト・商談・予約を作成。 |
| Google Calendarイベント作成 | PASS | `/meetings` で対象予約が `syncStatus=SYNCED`、`googleEventHtmlLink` あり。 |
| Googleで開くリンク | PASS | Google Calendarのイベントリンクから実Google Calendar UIへ遷移できた。 |
| タイトル | PASS | Google Calendar UIのイベントダイアログで `CRM予約 / [TEST] ISフォームGoogle同期 2026-07-02T02-14-06-275Z` を確認。 |
| 開始・終了時刻 | PASS | 作成後にリスケし、Google Calendar UIで `7月8日(水) 午後4:00～4:30` を確認。 |
| CRM側SYNCED | PASS | `/meetings` の予約propsで `bookingStatus=RESCHEDULED`, `syncStatus=SYNCED`, `lastSyncedAt=2026-07-02T02:14:10.935Z` を確認。 |
| アポ日時変更でGoogleイベント更新 | PASS | `POST /api/bookings/:id/reschedule` 後、同一GoogleイベントリンクのUI表示が `16:00-16:30 JST` へ更新。 |
| 再同期 | PASS | `POST /api/bookings/:id/sync` が `status=SYNCED` を返却。Googleイベントリンクは同一で維持。 |
| 二重登録防止 | PASS | 同じ `idempotencyKey` で再送し、`duplicated=true` かつ同一 `meetingBookingId` を返却。Googleイベントの二重作成なし。 |
| キャンセル時のGoogleイベント挙動 | PASS | `POST /api/bookings/:id/cancel` が200。CRM側は `bookingStatus=CANCELLED`, `syncStatus=SYNCED`。Google Calendar UI再読み込み後、対象 `[TEST]` イベントは表示されなくなった。 |

## Observations

- Google Calendar同期そのものは、作成・日時更新・再同期・キャンセル削除・二重登録防止まで期待通り動作した。
- ただし、`/appointments/new` の `業種` 候補が本番画面で空だった。実ユーザーが画面だけで登録するには、業種マスタ投入またはフォーム設定側の初期値/非表示設定が必要。
- キャンセル後も予約データには `googleEventHtmlLink` が残る。Google側イベントは削除済みだが、キャンセル済み予約でリンク表示を残すかどうかはUXとして再検討余地あり。

## Decision

IS連携フォームGoogle Calendar実同期判定: `PARTIAL PASS`

理由:

- CRMフォーム送信APIからの予約作成、Google Calendarイベント作成、リンク有効性、タイトル、日時更新、再同期、キャンセル時のGoogleイベント削除、二重登録防止はPASS。
- 一方で、本番の `/appointments/new` UIは `業種` 候補が空で、ブラウザUIのみでの完全な登録が未確認のため、Full PASSではなく `PARTIAL PASS` とする。

---

# Appointment Industry Master Fix Production Retest - 2026-07-02 11:50 JST

## Scope

Productionの `/appointments/new` で `業種` プルダウン候補が空になり、ブラウザ画面だけではIS連携フォームを完了できない問題を修正した。
本番顧客データは使用せず、`[TEST]` 付きのテスト会社・テスト担当者・テスト商談・テスト予約のみを使用した。

- 使用環境: `https://crm-hazel-six.vercel.app`
- 修正commit: `8123da3` / `5541437`
- 本番顧客データ: 未使用
- DB接続URL / OAuth token / secret: ログ出力なし

## Cause

- `/appointments/new` の業種取得条件は `organizationId = current organization` かつ `isActive = true`。
- ProductionのRSC propsで `industries: []` を確認した。
- 同じProduction画面で、事業部・IS担当者・FS担当者・商品候補は存在していた。
- `Industry` には `businessUnitId` がなく、事業部絞りによる欠落ではなかった。
- seedには業種作成処理があるが、Productionではseed依存にできないため、現在組織に有効なIndustryマスタが未投入だったことが原因。

## Fix

- `src/lib/industries.ts` に標準業種12件のidempotent upsert処理を追加。
- `scripts/bootstrap-industries.ts` を追加し、`--organization-id` または `--organization-slug` 指定で安全に業種投入できるようにした。
- 書き込み時は `CONFIRM_BOOTSTRAP_INDUSTRIES=true` を必須にした。
- `POST /api/industries/bootstrap` を追加し、管理権限ユーザーが画面から初期業種を作成できるようにした。
- `/appointments/new` で業種・商品・IS担当者・FS担当者・事業部が不足している場合は理由を表示し、登録ボタンをdisabledにするようにした。
- `POST /api/appointments` で `industryId` が同一組織かつ `isActive=true` のIndustryであることを検証するようにした。
- Client Componentの送信bodyに `appointmentDate` / `startTime` / `endTime` を含め、サーバー側の動的フォーム検証と一致させた。

## Master Bootstrap

Productionでは、デプロイ後にCRMログインセッション経由で `POST /api/industries/bootstrap` を実行した。
投入結果は12件。

- 飲食
- 美容
- 整体・整骨院
- 医療・クリニック
- 士業
- 不動産
- 建設
- 小売
- 教育
- 介護・福祉
- 自動車
- その他

CLIで実行する場合のコマンド:

```bash
CONFIRM_BOOTSTRAP_INDUSTRIES=true pnpm exec tsx scripts/bootstrap-industries.ts --organization-slug sample
```

dry run:

```bash
pnpm exec tsx scripts/bootstrap-industries.ts --organization-slug sample --dry-run
```

## Production Results

| Check | Result | Evidence |
| --- | --- | --- |
| 原因確認 | PASS | Production RSC propsで `industries: []`、事業部・IS/FS・商品は存在。 |
| 業種マスタ投入 | PASS | `POST /api/industries/bootstrap` が200。12件をupsert。 |
| 業種プルダウン表示 | PASS | `/appointments/new` で `飲食`、`美容`、`整体・整骨院`、`医療・クリニック`、`士業` など12件を確認。 |
| ブラウザ画面からアポ登録 | PASS | Playwrightで `/appointments/new` を操作し、業種 `飲食` を選択して送信。`アポを登録しました。` を確認。 |
| 会社作成 | PASS | UI送信レスポンスで `companyId=13546fd1-1e4b-43b9-9a65-a279fc005d05` を確認。 |
| 担当者作成 | PASS | UI送信レスポンスで `contactId=f7f56fa8-cadb-48a2-b311-104501f0a703` を確認。 |
| 商談作成 | PASS | UI送信レスポンスで `dealId=c3ab751b-fb0c-4a8a-b290-bf9a05726aff` を確認。 |
| 予約作成 | PASS | UI送信レスポンスで `meetingBookingId=adcfb7fe-d908-4f91-9da1-4c05566818af` を確認。 |
| Google Calendarイベント作成 | PASS | `/meetings` propsで対象予約が `syncStatus=SYNCED`、`googleEventHtmlLink` あり。 |
| CRM側SYNCED | PASS | UI登録予約・API二重防止確認予約の両方で `syncStatus=SYNCED` を確認。 |
| Googleで開くリンク | PASS | 対象予約にGoogle Calendar event linkが保存された。 |
| 二重作成防止 | PASS | 別テスト予約で同じ `idempotencyKey` を2回送信し、2回目が `duplicated=true` かつ同一 `meetingBookingId` を返却。 |
| テストデータ cleanup | PASS | 作成したテスト予約2件をキャンセルし、Google Calendarイベント削除処理も200で完了。 |

## Verification Commands

```bash
node_modules/.bin/prisma format
DATABASE_URL=postgresql://user:pass@localhost:5432/salesnest node_modules/.bin/prisma validate
node_modules/.bin/prisma generate
node_modules/.bin/eslint . --max-warnings=0
node_modules/.bin/tsc --noEmit
node_modules/.bin/vitest run
node scripts/vercel-build.mjs
git diff --check
```

## Verification Results

- `prisma format`: PASS。
- `prisma validate`: PASS。
- `prisma generate`: PASS。
- `eslint . --max-warnings=0`: PASS。
- `tsc --noEmit`: PASS。
- `vitest run`: PASS。19 files / 84 tests passed。
- `node scripts/vercel-build.mjs`: PASS。Next.js production build successful。
- `git diff --check`: PASS。

## Decision

`/appointments/new` 業種プルダウン復旧判定: `PASS`

理由:

- Productionで業種候補12件が表示された。
- ブラウザ画面から業種を選択してIS連携フォームを完了できた。
- 会社・担当者・商談・予約が作成された。
- Google Calendar同期が `SYNCED` になり、Google event linkも保存された。
- 同一 `idempotencyKey` の再送で二重作成されないことを確認した。
