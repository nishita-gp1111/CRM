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

| Check | Result | Evidence |
| --- | --- | --- |
| `VERCEL_AUTOMATION_BYPASS_SECRET` が設定されている | FAIL | local env: missing。Vercel Preview env pull: missing。 |
| `PREVIEW_URL` が設定されている | FAIL | local env: missing。Vercel Preview env pull: missing。既知Preview URLを明示指定してsmokeを実行。 |
| Preview `DATABASE_URL` が本番DBではない | FAIL | Vercel Preview env pullではkeyは存在するが値は空。安全判定不可。 |
| Preview `MIGRATE_DATABASE_URL` が本番DBではない | FAIL | Vercel Preview env pullではkeyは存在するが値は空。安全判定不可。 |
| `APP_URL` がPreview URL | FAIL | Vercel Preview env pullではkeyは存在するが値は空。 |
| `GOOGLE_CALENDAR_INTEGRATION_ENABLED=false` | FAIL | Vercel Preview env pullではkeyは存在するが値は空。 |
| Preview DBへmigration/seed適用済み | FAIL | DB URL未確認のため未実行。本番DB誤使用を避けた。 |

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

| Command | Result | Notes |
| --- | --- | --- |
| `which npm` | FAIL | `npm not found` |
| `npm --version` | FAIL | `zsh: command not found: npm` |
| `PREVIEW_URL=<preview> node_modules/.bin/tsx scripts/preview-smoke.ts` | FAIL | bypass secretなし。16 failed / 1 skipped。 |
| `E2E_BASE_URL=<preview> E2E_SKIP_WEB_SERVER=1 GOOGLE_CALENDAR_INTEGRATION_ENABLED=false node_modules/.bin/playwright test` | FAIL | `DATABASE_URL` 未設定。E2E安全ガードで停止。 |
| `node_modules/.bin/eslint . --max-warnings=0` | PASS | Playwright生成物ignore追加後PASS。 |
| `node_modules/.bin/tsc --noEmit` | PASS | type errorなし。 |
| `node_modules/.bin/vitest run` | PASS | 18 files / 69 tests passed。Google Calendar mock系unitもPASS。 |
| `node scripts/vercel-build.mjs` | PASS | Prisma generate + Next production build successful。 |

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

| Target | Status | Redirect | Result |
| --- | ---: | --- | --- |
| `/login` | 302 | `https://vercel.com/sso-api?...` | FAIL |
| `/dashboard` | 302 | `https://vercel.com/sso-api?...` | FAIL |
| `/companies` | 302 | `https://vercel.com/sso-api?...` | FAIL |
| `/deals` | 302 | `https://vercel.com/sso-api?...` | FAIL |
| `/deals/board` | 302 | `https://vercel.com/sso-api?...` | FAIL |
| `/appointments/new` | 302 | `https://vercel.com/sso-api?...` | FAIL |
| `/daily-metrics` | 302 | `https://vercel.com/sso-api?...` | FAIL |
| `/reports` | 302 | `https://vercel.com/sso-api?...` | FAIL |
| `/delivery-projects` | 302 | `https://vercel.com/sso-api?...` | FAIL |
| `/tasks` | 302 | `https://vercel.com/sso-api?...` | FAIL |
| `/notifications` | 302 | `https://vercel.com/sso-api?...` | FAIL |
| `/api/auth/me` | 302 | `https://vercel.com/sso-api?...` | FAIL |
| `/api/companies` | 302 | `https://vercel.com/sso-api?...` | FAIL |
| `/api/deals` | 302 | `https://vercel.com/sso-api?...` | FAIL |
| `/api/tasks` | 302 | `https://vercel.com/sso-api?...` | FAIL |
| `/api/reports/sales-progress` | 302 | `https://vercel.com/sso-api?...` | FAIL |
| authenticated login | - | - | SKIPPED。`PREVIEW_SMOKE_ALLOW_AUTH` disabled。 |

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

| Test | Result |
| --- | --- |
| DB統合 | PASS |
| 全migration | PASS |
| seed | PASS |
| rollback | PASS |
| API権限・組織分離 | PASS |
| Google Calendar mock | PASS |
| lint | PASS |
| typecheck | PASS |
| unit | PASS |
| production build | PASS |
| Vercel Preview deploy READY | PASS |

今回再確認:

| Test | Result |
| --- | --- |
| Google Calendar mock含むunit | PASS |
| lint | PASS |
| typecheck | PASS |
| production build | PASS |

## Final Decision

Decision: `NO GO`

GO条件との比較:

| GO条件 | Current |
| --- | --- |
| Preview smoke PASS | FAIL |
| Playwright Preview E2E PASS | FAIL |
| DB統合 PASS | 前回PASS |
| rollback PASS | 前回PASS |
| API権限 PASS | 前回PASS |
| Google Calendar mock PASS | PASS |
| lint / typecheck / unit / build PASS | PASS |
| 本番DB・本番Google Calendar・本番顧客データ未使用 | PASS |

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

| Item | Result |
| --- | --- |
| Googleアカウント種別 | 不明。既存Chromeログイン済みGoogleアカウントを使用。専用テストアカウントとは確認できていない。 |
| 使用カレンダー名 | Google Calendar画面タイトルは `株式会社Growth Path`。イベント詳細の主催者は `西田翔`。CRM側の書き込みカレンダー選択UIは画面上で確認できず。 |
| 接続テスト | PASS。`Google Calendarの接続テストに成功しました。取得できたカレンダー: 10件` を確認。 |

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| CRMからGoogle Calendarへのイベント作成 | PASS | CRMタスク作成後、`Calendar: 同期済み` と `Googleで開く` が表示。Google Calendar上に `2026年7月2日 10:00-10:30` の予定を確認。 |
| `syncStatus` / `googleEventHtmlLink` 保存 | PASS | CRM UIで `Calendar: 同期済み` と `Googleで開く` リンクを確認。 |
| Googleイベントタイトル更新 | PASS | CRMタスク名を `GC実同期更新タスク 20260701070529` へ変更後、Google Calendar検索で更新後タイトルの予定が1件表示。 |
| Googleイベント日時更新 | PASS | CRM期限を `2026-07-02 11:00` へ変更後、Google Calendarで `午前11:00-11:30` と表示。 |
| 二重作成防止 | PASS | 更新後タイトルの検索結果は1件、旧タスクタイトル完全一致の検索結果は0件。 |
| リマインド更新 | FAIL | CRMでは `1時間前` が保存されているが、Google Calendar詳細では `通知: 10 分前` のまま表示。 |
| タスク完了時のGoogleイベント削除/キャンセル | FAIL | CRMではタスク完了・未完了一覧から消えるが、Google Calendar検索では更新後イベントが引き続き1件表示。 |
| タスク削除時のGoogleイベント削除/キャンセル | SKIPPED | 完了時削除がFAILし、追加の実イベント汚染を避けるため直接削除ケースは未実行。 |
| 同期失敗時にCRMタスクが残る | PASS | Google未接続の `営業担当` に割り当てると、CRMタスクは残り `Calendar: 再認可が必要` と表示。Googleリンクは表示されない。 |
| 再同期ボタン | PASS / LIMITED | 同期失敗タスクでは `再同期` ボタンが表示され、押下後もタスクは残り `再認可が必要` を維持。正常同期済みタスクには強制再同期ボタンは表示されない。 |
| Watch対象カレンダー選択UI | FAIL | 日程調整画面上で書き込み/Busy/Watch対象カレンダーの明示的な選択UIは確認できず。 |
| Watch再作成 | FAIL | `Watch再作成` 押下で `Watch対象のカレンダーが選択されていません。` を確認。 |
| Watch未設定でもCRM→Google作成/更新 | PARTIAL PASS | Watch未設定でもイベント作成、タイトル/日時更新は成功。ただしリマインド更新と完了時削除はFAIL。 |

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

| Issue | Result | Evidence |
| --- | --- | --- |
| CRMの1時間前リマインドがGoogleで10分前になる | FIXED BY CODE / MOCK PASS | Googleイベントbody生成で `reminders: { useDefault: false, overrides }` を常に送信。`TaskReminder.scheduledFor` からminutesを算出し、重複排除するunit testを追加。 |
| リマインド未設定時にGoogle default通知が残る | FIXED BY CODE / MOCK PASS | 未設定時も `useDefault=false` / `overrides=[]` を送信するtestを追加。 |
| タスク更新時にremindersがPATCHされない | FIXED BY CODE / MOCK PASS | 既存のcreate/update共通bodyにremindersを含める形へ修正。 |
| CRMでタスク完了後もGoogleイベントが残る | FIXED BY CODE / MOCK PASS | `PATCH /api/tasks/[id]/status` でDBコミット後にGoogle DELETEを呼び、成功時にGoogle event idとsync状態をクリア。 |
| タスクキャンセル/削除後のGoogleイベント処理 | FIXED BY CODE / MOCK PASS | `PATCH /api/tasks/[id]` と `DELETE /api/tasks/[id]` でもDBコミット後にsafe deleteを実行。削除済みタスクの失敗はOperationalEventへ記録。 |
| Google DELETE失敗でCRM操作がrollbackされるリスク | FIXED BY CODE / MOCK PASS | `deleteTaskGoogleEventSafely` を追加し、Google API失敗時もCRM更新/削除をrollbackしない。残存タスクには `calendarSyncStatus=ERROR` を保存。 |
| Watch対象未選択でWatch再作成できない | FIXED BY CODE / UI BUILD PASS | 書き込み/Busy/Watch対象カレンダーの選択UIを日程調整画面に追加。Watch対象未指定時はselectedWriteCalendarIdへfallback。 |
| Watch未設定がCRM→Google同期をブロックする懸念 | FIXED BY CODE | Watch APIはGoogle→CRM外部変更検知用として扱い、CRM→Google作成/更新/削除の処理から独立。 |
| タスク作成後の `form.reset()` フロントエラー | FIXED BY CODE / STATIC PASS | submit冒頭で `formElement` を退避する形へ修正。`event.currentTarget.reset()` の直接呼び出しは残存なし。 |

## Test Results

| Command | Result | Notes |
| --- | --- | --- |
| `PATH=<codex-node> node_modules/.bin/prisma format` | PASS | Prisma schema formatting completed。 |
| `DATABASE_URL=postgresql://user:pass@localhost:5432/salesnest PATH=<codex-node> node_modules/.bin/prisma validate` | PASS | Dummy local-style URLでschema validationのみ実行。実DB接続なし。 |
| `DATABASE_URL=postgresql://user:pass@localhost:5432/salesnest PATH=<codex-node> node_modules/.bin/prisma generate` | PASS | Prisma Client generation completed。 |
| `PATH=<codex-node> node_modules/.bin/eslint . --max-warnings=0` | PASS | lint errorなし。 |
| `PATH=<codex-node> node_modules/.bin/tsc --noEmit` | PASS | type errorなし。 |
| `PATH=<codex-node> node_modules/.bin/vitest run src/lib/task-reminders.test.ts src/lib/google-calendar-task-sync.test.ts` | PASS | 2 files / 12 tests passed。Google Calendar reminder/delete mockを検証。 |
| `PATH=<codex-node> node_modules/.bin/vitest run` | PASS | 19 files / 77 tests passed。 |
| `PATH=<codex-node> node scripts/vercel-build.mjs` | PASS | Prisma generate + Next.js production build successful。 |
| `git diff --check` | PASS | whitespace errorなし。 |
| `rg -n "event\\.currentTarget\\.reset\\(|\\.currentTarget\\.reset\\(" src -g '*.tsx' -g '*.ts'` | PASS | 該当なし。 |

## Google Calendar Real Retest

| Check | Result | Notes |
| --- | --- | --- |
| イベント作成結果 | SKIPPED | 今回の修正コードは未デプロイのため、実Googleへの再作成は未実行。 |
| イベント更新結果 | SKIPPED | 未デプロイのため実Google再検証は未実行。mock/unitではPATCH body生成を検証。 |
| イベント削除/キャンセル結果 | SKIPPED | 未デプロイのため実Google再検証は未実行。mock/unitではDELETE呼び出しとCRM側sync状態更新を検証。 |
| 再同期結果 | SKIPPED | 実Google再検証は未実行。既存再同期API自体は今回変更なし。 |
| 二重作成防止結果 | SKIPPED | 実Google再検証は未実行。今回の変更は既存eventIdを維持したupdate/delete経路を壊していない。 |
| Watch再作成結果 | SKIPPED | 実Google watch channel作成は未実行。UI/APIはWatch対象選択とfallbackを実装済み。 |

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

| Check | Result | Evidence |
| --- | --- | --- |
| イベント作成結果 | SKIPPED | 修正未反映の可能性が高く、実Google Calendarへ不要なテスト予定を増やさないため作成前に停止。 |
| リマインド反映結果 | SKIPPED | イベント作成を実施していないため未確認。 |
| リマインド更新結果 | SKIPPED | イベント作成を実施していないため未確認。 |
| 件名更新結果 | SKIPPED | イベント作成を実施していないため未確認。 |
| 日時更新結果 | SKIPPED | イベント作成を実施していないため未確認。 |
| 二重作成防止結果 | SKIPPED | イベント作成を実施していないため未確認。 |
| 完了時削除結果 | SKIPPED | イベント作成を実施していないため未確認。 |
| 削除時削除結果 | SKIPPED | イベント作成を実施していないため未確認。 |
| 未接続ユーザー時の結果 | SKIPPED | 修正反映前提の再検証ではないため未実行。 |
| Watch再作成結果 | FAIL / NOT RETESTED | Watch対象カレンダー選択UIがデプロイ済み画面に存在しないため、修正後挙動を検証できない。 |
| form.resetエラーなし | SKIPPED | タスク作成を実施していないため未確認。 |

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
