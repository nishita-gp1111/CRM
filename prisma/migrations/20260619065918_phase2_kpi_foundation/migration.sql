-- CreateEnum
CREATE TYPE "product_status" AS ENUM ('active', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "price_book_status" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "deal_line_item_status" AS ENUM ('proposed', 'won', 'lost', 'cancelled');

-- CreateEnum
CREATE TYPE "forecast_category_status" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "decision_maker_status" AS ENUM ('decision_maker', 'non_decision_maker', 'unknown');

-- CreateEnum
CREATE TYPE "qualification_result" AS ENUM ('valid', 'invalid', 'condition_ng', 'undetermined');

-- CreateEnum
CREATE TYPE "deal_participant_role" AS ENUM ('owner', 'appointment_setter', 'closer', 'referrer', 'walk_in_owner', 'support');

-- CreateEnum
CREATE TYPE "deal_participant_status" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "meeting_booking_status" AS ENUM ('scheduled', 'attended', 'no_show', 'cancelled', 'rescheduled', 'invalid');

-- CreateEnum
CREATE TYPE "sales_performance_event_type" AS ENUM ('call', 'connection', 'owner_contact', 'full', 'short', 'condition_ng', 'appointment_set', 'valid_meeting', 'invalid_meeting', 'meeting_attended', 'deal_won', 'deal_lost', 'revenue_recognized', 'gross_profit_recognized', 'referral_created', 'referral_appointment_set', 'referral_meeting_attended', 'referral_won', 'field_visit', 'field_visit_connection', 'field_visit_owner_connection', 'field_visit_meeting', 'field_visit_appointment_set', 'field_visit_won', 'field_visit_same_day_won', 'domain_attachment');

-- CreateEnum
CREATE TYPE "sales_performance_event_source" AS ENUM ('manual', 'system', 'import', 'backfill');

-- CreateEnum
CREATE TYPE "referral_status" AS ENUM ('new', 'appointment_set', 'meeting_attended', 'won', 'lost', 'cancelled');

-- CreateEnum
CREATE TYPE "field_visit_status" AS ENUM ('planned', 'visited', 'connected', 'owner_connected', 'meeting_set', 'appointment_set', 'won', 'lost', 'invalid');

-- CreateEnum
CREATE TYPE "metric_source_type" AS ENUM ('manual_daily', 'performance_event', 'appointment', 'deal', 'deal_line_item', 'referral', 'field_visit', 'formula', 'delivery_project');

-- CreateEnum
CREATE TYPE "metric_category" AS ENUM ('executive', 'outcome', 'pipeline', 'activity', 'conversion', 'quality', 'referral', 'field_visit', 'product', 'forecast', 'action_plan', 'cs');

-- CreateEnum
CREATE TYPE "metric_unit" AS ENUM ('count', 'currency', 'percent', 'days', 'number');

-- CreateEnum
CREATE TYPE "metric_aggregation" AS ENUM ('count', 'distinct_count', 'sum', 'average', 'rate');

-- CreateEnum
CREATE TYPE "metric_period_type" AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom');

-- CreateEnum
CREATE TYPE "daily_metric_status" AS ENUM ('draft', 'submitted', 'approved', 'locked');

-- CreateEnum
CREATE TYPE "daily_metric_source" AS ENUM ('manual', 'import', 'backfill', 'adjustment');

-- CreateEnum
CREATE TYPE "validation_severity" AS ENUM ('info', 'warning', 'error');

-- CreateEnum
CREATE TYPE "action_plan_status" AS ENUM ('not_started', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "action_plan_priority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "deal_status" ADD VALUE 'cancelled';
ALTER TYPE "deal_status" ADD VALUE 'invalid';
ALTER TYPE "deal_status" ADD VALUE 'nurture';

-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "cancelled_at" TIMESTAMPTZ(3),
ADD COLUMN     "decision_maker_status" "decision_maker_status" NOT NULL DEFAULT 'unknown',
ADD COLUMN     "forecast_category_id" UUID,
ADD COLUMN     "invalidated_at" TIMESTAMPTZ(3),
ADD COLUMN     "legacy_progress" VARCHAR(160),
ADD COLUMN     "lost_at" TIMESTAMPTZ(3),
ADD COLUMN     "qualification_result" "qualification_result" NOT NULL DEFAULT 'undetermined',
ADD COLUMN     "won_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "meeting_bookings" ADD COLUMN     "appointment_set_at" TIMESTAMPTZ(3),
ADD COLUMN     "attended_at" TIMESTAMPTZ(3),
ADD COLUMN     "business_unit_id" UUID,
ADD COLUMN     "cancelled_at" TIMESTAMPTZ(3),
ADD COLUMN     "deal_id" UUID,
ADD COLUMN     "host_user_id" UUID,
ADD COLUMN     "legacy_metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "meeting_type" VARCHAR(120),
ADD COLUMN     "no_show_at" TIMESTAMPTZ(3),
ADD COLUMN     "qualification_result" "qualification_result" NOT NULL DEFAULT 'undetermined',
ADD COLUMN     "set_by_user_id" UUID,
ADD COLUMN     "source_channel" VARCHAR(120),
ADD COLUMN     "status" "meeting_booking_status" NOT NULL DEFAULT 'scheduled';

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "normalized_name" VARCHAR(160) NOT NULL,
    "sku" VARCHAR(80),
    "description" TEXT,
    "category" VARCHAR(120),
    "status" "product_status" NOT NULL DEFAULT 'active',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_unit_products" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "business_unit_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "status" "product_status" NOT NULL DEFAULT 'active',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "business_unit_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_book_entries" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "business_unit_id" UUID,
    "name" VARCHAR(160) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'JPY',
    "unit_price_amount" DECIMAL(18,2),
    "revenue_amount" DECIMAL(18,2),
    "gross_profit_amount" DECIMAL(18,2),
    "effective_from" DATE,
    "effective_until" DATE,
    "status" "price_book_status" NOT NULL DEFAULT 'active',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "price_book_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forecast_categories" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "business_unit_id" UUID,
    "key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "probability" INTEGER NOT NULL DEFAULT 0,
    "status" "forecast_category_status" NOT NULL DEFAULT 'active',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "is_omitted" BOOLEAN NOT NULL DEFAULT false,
    "legacy_aliases" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "forecast_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_line_items" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "deal_id" UUID NOT NULL,
    "product_id" UUID,
    "price_book_entry_id" UUID,
    "business_unit_id" UUID,
    "name" VARCHAR(180) NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "unit_price_amount" DECIMAL(18,2),
    "revenue_amount" DECIMAL(18,2),
    "gross_profit_amount" DECIMAL(18,2),
    "expected_gross_profit_amount" DECIMAL(18,2),
    "billing_started_at" DATE,
    "status" "deal_line_item_status" NOT NULL DEFAULT 'proposed',
    "source" VARCHAR(120),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "deal_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_participants" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "deal_id" UUID NOT NULL,
    "user_id" UUID,
    "work_function" "work_function",
    "role" "deal_participant_role" NOT NULL,
    "status" "deal_participant_status" NOT NULL DEFAULT 'active',
    "contribution_weight" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "credited_at" TIMESTAMPTZ(3),
    "snapshot_user_name" VARCHAR(120),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "deal_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_performance_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "business_unit_id" UUID,
    "deal_id" UUID,
    "deal_line_item_id" UUID,
    "meeting_booking_id" UUID,
    "referral_id" UUID,
    "field_visit_id" UUID,
    "metric_definition_id" UUID,
    "credited_user_id" UUID,
    "credited_role" "deal_participant_role",
    "work_function" "work_function",
    "event_type" "sales_performance_event_type" NOT NULL,
    "source" "sales_performance_event_source" NOT NULL DEFAULT 'system',
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "amount" DECIMAL(18,2),
    "idempotency_key" VARCHAR(240) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMPTZ(3),

    CONSTRAINT "sales_performance_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "business_unit_id" UUID,
    "deal_id" UUID,
    "referrer_user_id" UUID,
    "owner_user_id" UUID,
    "referred_company_name" VARCHAR(200) NOT NULL,
    "referred_contact_name" VARCHAR(160),
    "referred_email" VARCHAR(320),
    "referred_phone" VARCHAR(40),
    "status" "referral_status" NOT NULL DEFAULT 'new',
    "referred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appointment_set_at" TIMESTAMPTZ(3),
    "meeting_attended_at" TIMESTAMPTZ(3),
    "won_at" TIMESTAMPTZ(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_visits" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "business_unit_id" UUID,
    "owner_user_id" UUID,
    "deal_id" UUID,
    "company_name" VARCHAR(200) NOT NULL,
    "contact_name" VARCHAR(160),
    "address" TEXT,
    "status" "field_visit_status" NOT NULL DEFAULT 'visited',
    "visited_at" TIMESTAMPTZ(3) NOT NULL,
    "connected_at" TIMESTAMPTZ(3),
    "owner_connected_at" TIMESTAMPTZ(3),
    "meeting_set_at" TIMESTAMPTZ(3),
    "appointment_set_at" TIMESTAMPTZ(3),
    "won_at" TIMESTAMPTZ(3),
    "same_day_won" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "field_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_definitions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "business_unit_id" UUID,
    "key" VARCHAR(120) NOT NULL,
    "display_name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "category" "metric_category" NOT NULL DEFAULT 'activity',
    "unit" "metric_unit" NOT NULL DEFAULT 'count',
    "source_type" "metric_source_type" NOT NULL,
    "aggregation" "metric_aggregation" NOT NULL DEFAULT 'sum',
    "work_function" "work_function",
    "object_type" VARCHAR(80),
    "date_field" VARCHAR(80),
    "attribution_role" "deal_participant_role",
    "numerator_metric_id" UUID,
    "denominator_metric_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_visible_by_default" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "min_sample_size" INTEGER NOT NULL DEFAULT 0,
    "query_definition" JSONB NOT NULL DEFAULT '{}',
    "filter_definition" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "metric_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_definition_versions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "metric_definition_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "display_name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "source_type" "metric_source_type" NOT NULL,
    "aggregation" "metric_aggregation" NOT NULL,
    "unit" "metric_unit" NOT NULL,
    "query_definition" JSONB NOT NULL DEFAULT '{}',
    "filter_definition" JSONB NOT NULL DEFAULT '{}',
    "created_by_user_id" UUID,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_definition_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_metric_entries" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "business_unit_id" UUID,
    "metric_definition_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "work_function" "work_function",
    "target_date" DATE NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "source" "daily_metric_source" NOT NULL DEFAULT 'manual',
    "status" "daily_metric_status" NOT NULL DEFAULT 'draft',
    "submitted_at" TIMESTAMPTZ(3),
    "approved_at" TIMESTAMPTZ(3),
    "approved_by_user_id" UUID,
    "locked_at" TIMESTAMPTZ(3),
    "comment" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "daily_metric_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_validation_rules" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "metric_definition_id" UUID NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "severity" "validation_severity" NOT NULL DEFAULT 'warning',
    "condition" JSONB NOT NULL DEFAULT '{}',
    "message" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "metric_validation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_targets" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "metric_definition_id" UUID NOT NULL,
    "business_unit_id" UUID,
    "user_id" UUID,
    "team_id" UUID,
    "work_function" "work_function",
    "scope_key" VARCHAR(240) NOT NULL,
    "period_type" "metric_period_type" NOT NULL DEFAULT 'monthly',
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "target_value" DECIMAL(18,4) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "kpi_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_calendars" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "business_unit_id" UUID,
    "name" VARCHAR(160) NOT NULL,
    "timezone" VARCHAR(80) NOT NULL DEFAULT 'Asia/Tokyo',
    "work_week_definition" JSONB NOT NULL DEFAULT '{}',
    "default_holidays" JSONB NOT NULL DEFAULT '[]',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "business_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_calendar_exceptions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "calendar_id" UUID NOT NULL,
    "target_date" DATE NOT NULL,
    "is_working_day" BOOLEAN NOT NULL,
    "name" VARCHAR(160),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "business_calendar_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_plans" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "business_unit_id" UUID,
    "work_function" "work_function",
    "owner_user_id" UUID,
    "target_id" UUID,
    "metric_definition_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "due_date" DATE,
    "status" "action_plan_status" NOT NULL DEFAULT 'not_started',
    "priority" "action_plan_priority" NOT NULL DEFAULT 'medium',
    "completed_at" TIMESTAMPTZ(3),
    "created_by_user_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "action_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legacy_source_links" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "import_job_id" UUID,
    "provider" VARCHAR(80) NOT NULL,
    "workbook_fingerprint" VARCHAR(160) NOT NULL,
    "sheet_name" VARCHAR(160) NOT NULL,
    "row_number" INTEGER NOT NULL,
    "row_fingerprint" VARCHAR(160) NOT NULL,
    "target_object_type" VARCHAR(80) NOT NULL,
    "target_object_id" VARCHAR(120) NOT NULL,
    "imported_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "legacy_source_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_organization_id_status_name_idx" ON "products"("organization_id", "status", "name");

-- CreateIndex
CREATE UNIQUE INDEX "products_organization_id_normalized_name_key" ON "products"("organization_id", "normalized_name");

-- CreateIndex
CREATE INDEX "business_unit_products_organization_id_business_unit_id_sta_idx" ON "business_unit_products"("organization_id", "business_unit_id", "status", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "business_unit_products_organization_id_business_unit_id_pro_key" ON "business_unit_products"("organization_id", "business_unit_id", "product_id");

-- CreateIndex
CREATE INDEX "price_book_entries_organization_id_product_id_status_idx" ON "price_book_entries"("organization_id", "product_id", "status");

-- CreateIndex
CREATE INDEX "price_book_entries_organization_id_business_unit_id_status_idx" ON "price_book_entries"("organization_id", "business_unit_id", "status");

-- CreateIndex
CREATE INDEX "forecast_categories_organization_id_business_unit_id_status_idx" ON "forecast_categories"("organization_id", "business_unit_id", "status", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "forecast_categories_organization_id_business_unit_id_key_key" ON "forecast_categories"("organization_id", "business_unit_id", "key");

-- CreateIndex
CREATE INDEX "deal_line_items_organization_id_business_unit_id_status_idx" ON "deal_line_items"("organization_id", "business_unit_id", "status");

-- CreateIndex
CREATE INDEX "deal_line_items_organization_id_deal_id_idx" ON "deal_line_items"("organization_id", "deal_id");

-- CreateIndex
CREATE INDEX "deal_line_items_organization_id_product_id_idx" ON "deal_line_items"("organization_id", "product_id");

-- CreateIndex
CREATE INDEX "deal_line_items_organization_id_billing_started_at_idx" ON "deal_line_items"("organization_id", "billing_started_at");

-- CreateIndex
CREATE INDEX "deal_participants_organization_id_deal_id_role_idx" ON "deal_participants"("organization_id", "deal_id", "role");

-- CreateIndex
CREATE INDEX "deal_participants_organization_id_user_id_role_credited_at_idx" ON "deal_participants"("organization_id", "user_id", "role", "credited_at");

-- CreateIndex
CREATE INDEX "sales_performance_events_organization_id_business_unit_id_o_idx" ON "sales_performance_events"("organization_id", "business_unit_id", "occurred_at");

-- CreateIndex
CREATE INDEX "sales_performance_events_organization_id_event_type_occurre_idx" ON "sales_performance_events"("organization_id", "event_type", "occurred_at");

-- CreateIndex
CREATE INDEX "sales_performance_events_organization_id_credited_user_id_o_idx" ON "sales_performance_events"("organization_id", "credited_user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "sales_performance_events_organization_id_deal_id_idx" ON "sales_performance_events"("organization_id", "deal_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_performance_events_organization_id_idempotency_key_key" ON "sales_performance_events"("organization_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "referrals_organization_id_business_unit_id_referred_at_idx" ON "referrals"("organization_id", "business_unit_id", "referred_at");

-- CreateIndex
CREATE INDEX "referrals_organization_id_referrer_user_id_referred_at_idx" ON "referrals"("organization_id", "referrer_user_id", "referred_at");

-- CreateIndex
CREATE INDEX "referrals_organization_id_status_idx" ON "referrals"("organization_id", "status");

-- CreateIndex
CREATE INDEX "field_visits_organization_id_business_unit_id_visited_at_idx" ON "field_visits"("organization_id", "business_unit_id", "visited_at");

-- CreateIndex
CREATE INDEX "field_visits_organization_id_owner_user_id_visited_at_idx" ON "field_visits"("organization_id", "owner_user_id", "visited_at");

-- CreateIndex
CREATE INDEX "field_visits_organization_id_status_idx" ON "field_visits"("organization_id", "status");

-- CreateIndex
CREATE INDEX "metric_definitions_organization_id_business_unit_id_work_fu_idx" ON "metric_definitions"("organization_id", "business_unit_id", "work_function", "is_active");

-- CreateIndex
CREATE INDEX "metric_definitions_organization_id_source_type_aggregation_idx" ON "metric_definitions"("organization_id", "source_type", "aggregation");

-- CreateIndex
CREATE UNIQUE INDEX "metric_definitions_organization_id_key_key" ON "metric_definitions"("organization_id", "key");

-- CreateIndex
CREATE INDEX "metric_definition_versions_organization_id_metric_definitio_idx" ON "metric_definition_versions"("organization_id", "metric_definition_id", "is_current");

-- CreateIndex
CREATE UNIQUE INDEX "metric_definition_versions_metric_definition_id_version_key" ON "metric_definition_versions"("metric_definition_id", "version");

-- CreateIndex
CREATE INDEX "daily_metric_entries_organization_id_business_unit_id_targe_idx" ON "daily_metric_entries"("organization_id", "business_unit_id", "target_date");

-- CreateIndex
CREATE INDEX "daily_metric_entries_organization_id_metric_definition_id_t_idx" ON "daily_metric_entries"("organization_id", "metric_definition_id", "target_date");

-- CreateIndex
CREATE INDEX "daily_metric_entries_organization_id_user_id_target_date_idx" ON "daily_metric_entries"("organization_id", "user_id", "target_date");

-- CreateIndex
CREATE INDEX "metric_validation_rules_organization_id_is_active_idx" ON "metric_validation_rules"("organization_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "metric_validation_rules_metric_definition_id_key_key" ON "metric_validation_rules"("metric_definition_id", "key");

-- CreateIndex
CREATE INDEX "kpi_targets_organization_id_business_unit_id_period_start_p_idx" ON "kpi_targets"("organization_id", "business_unit_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "kpi_targets_organization_id_user_id_period_start_period_end_idx" ON "kpi_targets"("organization_id", "user_id", "period_start", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_targets_organization_id_metric_definition_id_scope_key__key" ON "kpi_targets"("organization_id", "metric_definition_id", "scope_key", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "business_calendars_organization_id_business_unit_id_is_defa_idx" ON "business_calendars"("organization_id", "business_unit_id", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "business_calendars_organization_id_business_unit_id_name_key" ON "business_calendars"("organization_id", "business_unit_id", "name");

-- CreateIndex
CREATE INDEX "business_calendar_exceptions_organization_id_target_date_idx" ON "business_calendar_exceptions"("organization_id", "target_date");

-- CreateIndex
CREATE UNIQUE INDEX "business_calendar_exceptions_calendar_id_target_date_key" ON "business_calendar_exceptions"("calendar_id", "target_date");

-- CreateIndex
CREATE INDEX "action_plans_organization_id_business_unit_id_status_due_da_idx" ON "action_plans"("organization_id", "business_unit_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "action_plans_organization_id_owner_user_id_status_due_date_idx" ON "action_plans"("organization_id", "owner_user_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "action_plans_organization_id_metric_definition_id_idx" ON "action_plans"("organization_id", "metric_definition_id");

-- CreateIndex
CREATE INDEX "legacy_source_links_organization_id_target_object_type_targ_idx" ON "legacy_source_links"("organization_id", "target_object_type", "target_object_id");

-- CreateIndex
CREATE INDEX "legacy_source_links_organization_id_workbook_fingerprint_sh_idx" ON "legacy_source_links"("organization_id", "workbook_fingerprint", "sheet_name");

-- CreateIndex
CREATE UNIQUE INDEX "legacy_source_links_organization_id_provider_workbook_finge_key" ON "legacy_source_links"("organization_id", "provider", "workbook_fingerprint", "sheet_name", "row_number", "row_fingerprint", "target_object_type");

-- CreateIndex
CREATE INDEX "deals_organization_id_business_unit_id_status_close_date_idx" ON "deals"("organization_id", "business_unit_id", "status", "close_date");

-- CreateIndex
CREATE INDEX "deals_organization_id_forecast_category_id_idx" ON "deals"("organization_id", "forecast_category_id");

-- CreateIndex
CREATE INDEX "meeting_bookings_organization_id_business_unit_id_starts_at_idx" ON "meeting_bookings"("organization_id", "business_unit_id", "starts_at");

-- CreateIndex
CREATE INDEX "meeting_bookings_organization_id_set_by_user_id_appointment_idx" ON "meeting_bookings"("organization_id", "set_by_user_id", "appointment_set_at");

-- CreateIndex
CREATE INDEX "meeting_bookings_organization_id_deal_id_idx" ON "meeting_bookings"("organization_id", "deal_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_unit_products" ADD CONSTRAINT "business_unit_products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_unit_products" ADD CONSTRAINT "business_unit_products_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "business_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_unit_products" ADD CONSTRAINT "business_unit_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_book_entries" ADD CONSTRAINT "price_book_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_book_entries" ADD CONSTRAINT "price_book_entries_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forecast_categories" ADD CONSTRAINT "forecast_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forecast_categories" ADD CONSTRAINT "forecast_categories_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "business_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_line_items" ADD CONSTRAINT "deal_line_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_line_items" ADD CONSTRAINT "deal_line_items_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_line_items" ADD CONSTRAINT "deal_line_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_line_items" ADD CONSTRAINT "deal_line_items_price_book_entry_id_fkey" FOREIGN KEY ("price_book_entry_id") REFERENCES "price_book_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_participants" ADD CONSTRAINT "deal_participants_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_participants" ADD CONSTRAINT "deal_participants_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_performance_events" ADD CONSTRAINT "sales_performance_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_visits" ADD CONSTRAINT "field_visits_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_definitions" ADD CONSTRAINT "metric_definitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_definition_versions" ADD CONSTRAINT "metric_definition_versions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_definition_versions" ADD CONSTRAINT "metric_definition_versions_metric_definition_id_fkey" FOREIGN KEY ("metric_definition_id") REFERENCES "metric_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_metric_entries" ADD CONSTRAINT "daily_metric_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_metric_entries" ADD CONSTRAINT "daily_metric_entries_metric_definition_id_fkey" FOREIGN KEY ("metric_definition_id") REFERENCES "metric_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_validation_rules" ADD CONSTRAINT "metric_validation_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_validation_rules" ADD CONSTRAINT "metric_validation_rules_metric_definition_id_fkey" FOREIGN KEY ("metric_definition_id") REFERENCES "metric_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_targets" ADD CONSTRAINT "kpi_targets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_targets" ADD CONSTRAINT "kpi_targets_metric_definition_id_fkey" FOREIGN KEY ("metric_definition_id") REFERENCES "metric_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_calendars" ADD CONSTRAINT "business_calendars_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_calendars" ADD CONSTRAINT "business_calendars_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "business_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_calendar_exceptions" ADD CONSTRAINT "business_calendar_exceptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_calendar_exceptions" ADD CONSTRAINT "business_calendar_exceptions_calendar_id_fkey" FOREIGN KEY ("calendar_id") REFERENCES "business_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_plans" ADD CONSTRAINT "action_plans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_plans" ADD CONSTRAINT "action_plans_metric_definition_id_fkey" FOREIGN KEY ("metric_definition_id") REFERENCES "metric_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_plans" ADD CONSTRAINT "action_plans_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "kpi_targets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legacy_source_links" ADD CONSTRAINT "legacy_source_links_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
