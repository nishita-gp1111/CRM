import { describe, expect, it } from "vitest";
import {
  defaultAppointmentFormSchema,
  normalizeAppointmentFormSchema,
  validateAppointmentPayloadAgainstSchema,
} from "./appointment-form-config";

const basePayload = {
  idempotencyKey: "appointment-test-key",
  businessUnitId: "00000000-0000-4000-8000-000000000001",
  appointmentSetterUserId: "00000000-0000-4000-8000-000000000002",
  companyName: "テスト株式会社",
  prefectureCode: "13",
  industryId: "00000000-0000-4000-8000-000000000003",
  contactName: "山田 太郎",
  appointmentAcquiredAt: "2026-06-23T10:00:00.000Z",
  appointmentDate: "2026-06-24",
  startTime: "10:00",
  endTime: "10:30",
  scheduledStartAt: "2026-06-24T01:00:00.000Z",
  scheduledEndAt: "2026-06-24T01:30:00.000Z",
  primaryProductId: "00000000-0000-4000-8000-000000000004",
};

describe("appointment form config", () => {
  it("keeps system required fields visible and required", () => {
    const schema = defaultAppointmentFormSchema();
    const next = normalizeAppointmentFormSchema({
      ...schema,
      fields: schema.fields.map((field) =>
        field.fieldKey === "companyName"
          ? { ...field, required: false, isVisible: false, fieldType: "TEXTAREA" }
          : field,
      ),
    });
    const companyName = next.fields.find((field) => field.fieldKey === "companyName");
    expect(companyName?.required).toBe(true);
    expect(companyName?.isVisible).toBe(true);
    expect(companyName?.fieldType).toBe("TEXT");
  });

  it("allows hideable fields only when a default value exists", () => {
    const schema = defaultAppointmentFormSchema();
    const next = normalizeAppointmentFormSchema({
      ...schema,
      fields: schema.fields.map((field) =>
        field.fieldKey === "sourceChannel"
          ? { ...field, isVisible: false, defaultValue: "" }
          : field,
      ),
    });
    expect(next.fields.find((field) => field.fieldKey === "sourceChannel")?.isVisible).toBe(true);
  });

  it("rejects direct invalid option values", () => {
    const schema = defaultAppointmentFormSchema();
    expect(() =>
      validateAppointmentPayloadAgainstSchema(schema, {
        ...basePayload,
        sourceChannel: "BAD",
      }),
    ).toThrow();
  });

  it("normalizes custom fields with their destination metadata", () => {
    const schema = defaultAppointmentFormSchema();
    const custom = {
      fieldKey: "customMemo",
      label: "カスタムメモ",
      fieldType: "TEXT" as const,
      required: true,
      isVisible: true,
      isEnabled: true,
      sortOrder: 999,
      sectionId: schema.sections[0].id,
      crmObject: "DEAL" as const,
      crmProperty: "customFields.customMemo",
      isCustom: true,
    };
    const result = validateAppointmentPayloadAgainstSchema(
      { ...schema, fields: [...schema.fields, custom] },
      { ...basePayload, customMemo: "温度感高め" },
    );
    expect(result.customFields.customMemo).toMatchObject({
      value: "温度感高め",
      crmObject: "DEAL",
    });
  });
});
