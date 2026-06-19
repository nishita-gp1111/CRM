# KPI Catalog

| key | Display | Business Unit | Work | Source | Aggregation | Date | Attribution | Numerator | Denominator | Distinct | Initial |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| executive_confirmed_gross_profit | 確定粗利 | all | all | DEAL_LINE_ITEM | SUM grossProfitAmount | billingStartedAt | CLOSER | - | - | line item | shown |
| executive_weighted_forecast_gross_profit | 加重見込粗利 | all | all | DEAL_LINE_ITEM | SUM expected GP x forecast | expectedCloseDate | CLOSER | - | - | line item | shown |
| first_fs_gross_profit | 第1 FS 粗利実績 | 第1 | FS | DEAL_LINE_ITEM | SUM grossProfitAmount | billingStartedAt | CLOSER | - | - | line item | shown |
| first_fs_won_deals | 第1 FS 受注数 | 第1 | FS | DEAL | DISTINCT_COUNT | closeDate | CLOSER | - | - | deal | shown |
| first_fs_valid_meetings | 第1 FS 有効商談数 | 第1 | FS | PERFORMANCE_EVENT | COUNT VALID_MEETING | occurredAt | CLOSER | - | - | event | shown |
| first_fs_appointments_set | 第1 FS 商談設定数 | 第1 | FS | PERFORMANCE_EVENT | COUNT APPOINTMENT_SET | occurredAt | APPOINTMENT_SETTER | - | - | event | shown |
| first_fs_win_rate | 第1 FS 受注率 | 第1 | FS | FORMULA | RATE | period | CLOSER | first_fs_won_deals | first_fs_valid_meetings | - | shown |
| first_is_calls | 第1 IS 架電数 | 第1 | IS | MANUAL_DAILY | SUM | targetDate | user | - | - | entry | shown |
| first_is_connections | 第1 IS 接続数 | 第1 | IS | MANUAL_DAILY | SUM | targetDate | user | - | - | entry | shown |
| first_is_owner_contacts | 第1 IS オーナー数 | 第1 | IS | MANUAL_DAILY | SUM | targetDate | user | - | - | entry | shown |
| first_is_full | 第1 IS フル数 | 第1 | IS | MANUAL_DAILY | SUM | targetDate | user | - | - | entry | shown |
| first_is_appointments | 第1 IS アポ数 | 第1 | IS | MANUAL_DAILY | SUM | targetDate | user | - | - | entry | shown |
| first_is_call_to_connection_rate | 第1 IS 架電→接続率 | 第1 | IS | FORMULA | RATE | period | user | first_is_connections | first_is_calls | - | shown |
| hd_fs_gross_profit | HD FS 粗利実績 | HD | FS | DEAL_LINE_ITEM | SUM grossProfitAmount | billingStartedAt | CLOSER | - | - | line item | shown |
| hd_fs_won_deals | HD FS 受注数 | HD | FS | DEAL | DISTINCT_COUNT | closeDate | CLOSER | - | - | deal | shown |
| hd_fs_domain_attachments | HD FS ドメイン付帯数 | HD | FS | DEAL_LINE_ITEM | COUNT product=ドメイン | billingStartedAt | CLOSER | - | - | line item | shown |
| hd_fs_referrals | HD FS 紹介数 | HD | FS | REFERRAL | DISTINCT_COUNT | referredAt | REFERRER | - | - | referral | shown |
| hd_fs_field_visits | HD FS 飛込数 | HD | FS | FIELD_VISIT | DISTINCT_COUNT | visitedAt | WALK_IN_OWNER | - | - | field visit | shown |
| hd_is_calls | HD IS 架電数 | HD | IS | MANUAL_DAILY | SUM | targetDate | user | - | - | entry | shown |
| hd_is_connections | HD IS 接続数 | HD | IS | MANUAL_DAILY | SUM | targetDate | user | - | - | entry | shown |
| hd_is_owner_contacts | HD IS オーナー数 | HD | IS | MANUAL_DAILY | SUM | targetDate | user | - | - | entry | shown |
| hd_is_full | HD IS フル数 | HD | IS | MANUAL_DAILY | SUM | targetDate | user | - | - | entry | shown |
| hd_is_appointments | HD IS アポ数 | HD | IS | MANUAL_DAILY | SUM | targetDate | user | - | - | entry | shown |
| hd_is_condition_ng | HD IS 条件NG数 | HD | IS | MANUAL_DAILY | SUM | targetDate | user | - | - | entry | shown |
| hd_is_short | HD IS ショート数 | HD | IS | MANUAL_DAILY | SUM | targetDate | user | - | - | entry | shown |
| hd_is_call_to_appointment_rate | HD IS 架電→アポ率 | HD | IS | FORMULA | RATE | period | user | hd_is_appointments | hd_is_calls | - | shown |

Definitions are stored in `MetricDefinition.queryDefinition` and versioned in `MetricDefinitionVersion`.
