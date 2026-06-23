CREATE TABLE "appointment_capture_links" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "business_unit_id" UUID NOT NULL,
  "form_id" UUID,
  "form_version_id" UUID,
  "credited_appointment_setter_id" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "token_hash" VARCHAR(64) NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  "expires_at" TIMESTAMPTZ(3),
  "passcode_hash" TEXT,
  "max_submissions" INTEGER,
  "submission_count" INTEGER NOT NULL DEFAULT 0,
  "created_by_user_id" UUID NOT NULL,
  "last_used_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "appointment_capture_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "appointment_capture_links_token_hash_key"
ON "appointment_capture_links"("token_hash");

CREATE INDEX "appointment_capture_links_organization_id_business_unit_id_status_idx"
ON "appointment_capture_links"("organization_id", "business_unit_id", "status");

CREATE INDEX "appointment_capture_links_organization_id_credited_appointment_setter_id_status_idx"
ON "appointment_capture_links"("organization_id", "credited_appointment_setter_id", "status");

ALTER TABLE "appointment_capture_links"
ADD CONSTRAINT "appointment_capture_links_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
