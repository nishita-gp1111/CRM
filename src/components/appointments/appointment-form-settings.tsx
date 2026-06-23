"use client";

import { useEffect, useRef, useState } from "react";
import type {
  AppointmentFieldDestination,
  AppointmentFormField,
  AppointmentFormFieldType,
  AppointmentFormSchema,
  AppointmentFormSection,
} from "@/lib/appointment-form-config";

type BusinessUnit = { id: string; name: string };
type Version = {
  id: string;
  version: number;
  status: string;
  publishedAt: string | null;
  createdAt: string;
};

const fieldTypes: Array<{ value: AppointmentFormFieldType; label: string }> = [
  { value: "TEXT", label: "1行テキスト" },
  { value: "TEXTAREA", label: "長文" },
  { value: "NUMBER", label: "数値" },
  { value: "EMAIL", label: "メール" },
  { value: "PHONE", label: "電話番号" },
  { value: "URL", label: "URL" },
  { value: "DATE", label: "日付" },
  { value: "DATETIME", label: "日時" },
  { value: "SELECT", label: "単一選択" },
  { value: "MULTI_SELECT", label: "複数選択" },
  { value: "CHECKBOX", label: "チェックボックス" },
  { value: "USER", label: "ユーザー選択" },
  { value: "BUSINESS_UNIT", label: "事業部選択" },
  { value: "PRODUCT", label: "商品選択" },
];

const destinations: AppointmentFieldDestination[] = [
  "COMPANY",
  "CONTACT",
  "DEAL",
  "DEAL_LINE_ITEM",
  "MEETING_BOOKING",
  "FORM_SUBMISSION",
];

function emptySchema() {
  return {
    schemaVersion: 1,
    sections: [],
    fields: [],
  } satisfies AppointmentFormSchema;
}

function sortSections(sections: AppointmentFormSection[]) {
  return [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
}

function sortFields(fields: AppointmentFormField[], sectionId: string) {
  return fields.filter((field) => field.sectionId === sectionId).sort((a, b) => a.sortOrder - b.sortOrder);
}

function resequence(schema: AppointmentFormSchema) {
  const sections = sortSections(schema.sections).map((section, index) => ({
    ...section,
    sortOrder: (index + 1) * 10,
  }));
  const fields = schema.fields.map((field) => field);
  for (const section of sections) {
    sortFields(fields, section.id).forEach((field, index) => {
      field.sortOrder = (index + 1) * 10;
    });
  }
  return { ...schema, sections, fields };
}

function newField(sectionId: string): AppointmentFormField {
  const id = `custom_${Date.now()}`;
  return {
    fieldKey: id,
    label: "新規項目",
    fieldType: "TEXT",
    required: false,
    isVisible: true,
    isEnabled: true,
    sortOrder: 999,
    sectionId,
    crmObject: "FORM_SUBMISSION",
    crmProperty: `metadata.${id}`,
    isCustom: true,
  };
}

function isFieldEditable(field: AppointmentFormField, property: "fieldType" | "required" | "isVisible" | "crm") {
  if (field.systemRequired && ["fieldType", "required", "isVisible", "crm"].includes(property)) return false;
  return true;
}

export function AppointmentFormSettings({ businessUnits }: { businessUnits: BusinessUnit[] }) {
  const [businessUnitId, setBusinessUnitId] = useState(businessUnits[0]?.id ?? "");
  const [schema, setSchema] = useState<AppointmentFormSchema>(emptySchema());
  const [publishedSchema, setPublishedSchema] = useState<AppointmentFormSchema>(emptySchema());
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedKey, setSelectedKey] = useState("businessUnitId");
  const [search, setSearch] = useState("");
  const [dirty, setDirty] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const centerRef = useRef<HTMLDivElement | null>(null);
  const selectedField = schema.fields.find((field) => field.fieldKey === selectedKey) ?? schema.fields[0];

  useEffect(() => {
    if (!businessUnitId) return;
    setPending(true);
    setMessage("");
    fetch(`/api/appointment-form-config?businessUnitId=${businessUnitId}`)
      .then((response) => response.json().then((body) => ({ response, body })))
      .then(({ response, body }) => {
        if (!response.ok) throw new Error(body.message ?? "読み込めませんでした。");
        setSchema(body.draftSchema);
        setPublishedSchema(body.publishedSchema);
        setVersions(body.versions ?? []);
        setDirty(false);
      })
      .catch((error) => setMessage(error.message))
      .finally(() => setPending(false));
  }, [businessUnitId]);

  function updateField(fieldKey: string, patch: Partial<AppointmentFormField>) {
    setDirty(true);
    setSchema((current) =>
      ({
        ...current,
        fields: current.fields.map((field) => {
          if (field.fieldKey !== fieldKey) return field;
          const next = { ...field, ...patch };
          if (field.systemRequired) {
            next.fieldType = field.fieldType;
            next.required = true;
            next.isVisible = true;
            next.crmObject = field.crmObject;
            next.crmProperty = field.crmProperty;
          }
          if (field.hideableWithDefault && next.isVisible === false && !next.defaultValue) {
            setMessage("初期値がない項目は非表示にできません。");
            next.isVisible = true;
          }
          return next;
        }),
      }),
    );
  }

  function addStandard(field: AppointmentFormField) {
    setSchema((current) => {
      const exists = current.fields.find((item) => item.fieldKey === field.fieldKey);
      if (exists) {
        return {
          ...current,
          fields: current.fields.map((item) =>
            item.fieldKey === field.fieldKey ? { ...item, isVisible: true, isEnabled: true } : item,
          ),
        };
      }
      return { ...current, fields: [...current.fields, field] };
    });
    setSelectedKey(field.fieldKey);
    requestAnimationFrame(() => scrollToField(field.fieldKey));
  }

  function addCustomField() {
    const sectionId = schema.sections[0]?.id ?? "owner_company_contact";
    const field = newField(sectionId);
    setDirty(true);
    setSchema((current) => resequence({ ...current, fields: [...current.fields, field] }));
    setSelectedKey(field.fieldKey);
    requestAnimationFrame(() => scrollToField(field.fieldKey));
  }

  function addSection() {
    const id = `section_${Date.now()}`;
    setDirty(true);
    setSchema((current) =>
      resequence({
        ...current,
        sections: [...current.sections, { id, title: "新規セクション", sortOrder: 999 }],
      }),
    );
  }

  function moveField(fieldKey: string, direction: -1 | 1) {
    setDirty(true);
    setSchema((current) => {
      const field = current.fields.find((item) => item.fieldKey === fieldKey);
      if (!field) return current;
      const peers = sortFields(current.fields, field.sectionId);
      const index = peers.findIndex((item) => item.fieldKey === fieldKey);
      const target = peers[index + direction];
      if (!target) return current;
      return resequence({
        ...current,
        fields: current.fields.map((item) =>
          item.fieldKey === field.fieldKey
            ? { ...item, sortOrder: target.sortOrder }
            : item.fieldKey === target.fieldKey
              ? { ...item, sortOrder: field.sortOrder }
              : item,
        ),
      });
    });
  }

  function scrollToField(fieldKey: string) {
    centerRef.current
      ?.querySelector(`[data-field-key="${fieldKey}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function removeField(fieldKey: string) {
    const field = schema.fields.find((item) => item.fieldKey === fieldKey);
    if (!field || field.systemRequired) return;
    if (!confirm(`${field.label}をフォームから外しますか？`)) return;
    const peers = sortFields(schema.fields, field.sectionId);
    const index = peers.findIndex((item) => item.fieldKey === fieldKey);
    const nextSelected = peers[index - 1]?.fieldKey ?? peers[index + 1]?.fieldKey ?? schema.fields.find((item) => item.fieldKey !== fieldKey)?.fieldKey ?? "";
    setDirty(true);
    setSchema((current) =>
      normalizeRemoved({
        ...current,
        fields: current.fields.map((item) =>
          item.fieldKey === fieldKey ? { ...item, isVisible: false, isEnabled: false } : item,
        ),
      }),
    );
    setSelectedKey(nextSelected);
  }

  function normalizeRemoved(next: AppointmentFormSchema) {
    return { ...next, fields: next.fields };
  }

  async function post(path: string, body: unknown, success: string) {
    setPending(true);
    setMessage("");
    const response = await fetch(path, {
      method: path.endsWith("appointment-form-config") ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setMessage(result.message ?? "保存できませんでした。");
      return;
    }
    if (result.draftSchema) setSchema(result.draftSchema);
    if (success.includes("保存") || success.includes("公開")) setDirty(false);
    setMessage(success);
    const refresh = await fetch(`/api/appointment-form-config?businessUnitId=${businessUnitId}`).then((item) => item.json());
    setVersions(refresh.versions ?? []);
    setPublishedSchema(refresh.publishedSchema);
  }

  const hiddenStandard = schema.fields.filter((field) => {
    if (field.isVisible && field.isEnabled) return false;
    const keyword = search.trim().toLowerCase();
    if (!keyword) return true;
    return field.label.toLowerCase().includes(keyword) || field.fieldKey.toLowerCase().includes(keyword);
  });

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <label className="min-w-64">
          <span className="field-label">事業部</span>
          <select className="text-field" value={businessUnitId} onChange={(event) => setBusinessUnitId(event.target.value)}>
            {businessUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
          </select>
        </label>
        <span className={`rounded-full px-3 py-2 text-xs font-bold ${dirty ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
          {dirty ? "未保存の変更あり" : "保存済み"}
        </span>
        <button className="secondary-button" type="button" disabled={pending} onClick={() => post("/api/appointment-form-config/publish", { businessUnitId }, "公開しました。")}>公開</button>
        <button className="secondary-button" type="button" disabled={pending} onClick={() => post("/api/appointment-form-config/duplicate-published", { businessUnitId }, "公開済みから複製しました。")}>公開済みから複製</button>
        <div className="ml-auto flex rounded-lg border border-slate-200 bg-white p-1">
          {(["desktop", "mobile"] as const).map((mode) => (
            <button key={mode} className={`rounded-md px-3 py-2 text-sm font-bold ${previewMode === mode ? "bg-brand-500 text-white" : "text-slate-500"}`} type="button" onClick={() => setPreviewMode(mode)}>
              {mode === "desktop" ? "PC" : "スマホ"}
            </button>
          ))}
        </div>
      </div>
      {message ? <p className="rounded-lg bg-brand-50 px-4 py-3 text-sm font-bold text-brand-700">{message}</p> : null}
      <div className="grid items-start gap-5 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
        <aside className="card sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto p-4">
          <h2 className="text-sm font-bold text-ink">利用可能な項目</h2>
          <input
            className="text-field mt-3"
            placeholder="項目検索"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="mt-3 space-y-2">
            {hiddenStandard.map((field) => (
              <button key={field.fieldKey} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-bold text-slate-600 hover:border-brand-300 hover:bg-brand-50" type="button" onClick={() => addStandard(field)}>
                {field.label}
              </button>
            ))}
            {!hiddenStandard.length ? <p className="text-sm text-slate-400">全て追加済みです。</p> : null}
          </div>
          <button className="primary-button mt-5 w-full" type="button" onClick={addCustomField}>新規項目追加</button>
          <button className="secondary-button mt-2 w-full" type="button" onClick={addSection}>セクション追加</button>
        </aside>
        <main ref={centerRef} className={`card min-w-0 p-4 ${previewMode === "mobile" ? "mx-auto w-full max-w-sm" : ""}`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">フォーム構成</h2>
            <span className="text-xs font-bold text-slate-400">下書き編集中</span>
          </div>
          <div className="space-y-4">
            {sortSections(schema.sections).map((section) => (
              <section key={section.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <input
                  className="text-field mb-3 font-bold"
                  value={section.title}
                  onChange={(event) =>
                    setSchema((current) => ({
                      ...current,
                      sections: current.sections.map((item) => item.id === section.id ? { ...item, title: event.target.value } : item),
                    }))
                  }
                />
                <label className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-500">
                  <input
                    type="checkbox"
                    checked={Boolean(section.defaultCollapsed)}
                    onChange={(event) =>
                      setSchema((current) => ({
                        ...current,
                        sections: current.sections.map((item) => item.id === section.id ? { ...item, defaultCollapsed: event.target.checked } : item),
                      }))
                    }
                  />
                  初期状態で折りたたむ
                </label>
                <div className="space-y-2">
                  {sortFields(schema.fields, section.id).map((field) => (
                    <button
                      key={field.fieldKey}
                      data-field-key={field.fieldKey}
                      className={`w-full rounded-lg border px-3 py-2 text-left ${selectedKey === field.fieldKey ? "border-brand-400 bg-brand-50" : "border-slate-200 bg-white"}`}
                      type="button"
                      onClick={() => setSelectedKey(field.fieldKey)}
                    >
                      <span className="block text-sm font-bold text-ink">{field.label}</span>
                      <span className="text-xs text-slate-400">
                        {field.fieldKey} / {field.isVisible ? "表示" : "非表示"} {field.systemRequired ? "/ 必須固定" : ""}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </main>
        <aside className="card sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto p-4">
          <h2 className="text-sm font-bold text-ink">選択中項目の設定</h2>
          {selectedField ? (
            <div className="mt-4 space-y-4">
              <label>
                <span className="field-label">表示名</span>
                <input className="text-field" value={selectedField.label} onChange={(event) => updateField(selectedField.fieldKey, { label: event.target.value })} />
              </label>
              <label>
                <span className="field-label">説明文</span>
                <textarea className="text-field min-h-20" value={selectedField.description ?? ""} onChange={(event) => updateField(selectedField.fieldKey, { description: event.target.value })} />
              </label>
              <label>
                <span className="field-label">プレースホルダー</span>
                <input className="text-field" value={selectedField.placeholder ?? ""} onChange={(event) => updateField(selectedField.fieldKey, { placeholder: event.target.value })} />
              </label>
              <label>
                <span className="field-label">入力形式</span>
                <select className="text-field" value={selectedField.fieldType} disabled={!isFieldEditable(selectedField, "fieldType")} onChange={(event) => updateField(selectedField.fieldKey, { fieldType: event.target.value as AppointmentFormFieldType })}>
                  {fieldTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3 text-sm font-bold text-slate-600">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedField.required} disabled={!isFieldEditable(selectedField, "required")} onChange={(event) => updateField(selectedField.fieldKey, { required: event.target.checked })} />
                  必須
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedField.isVisible} disabled={!isFieldEditable(selectedField, "isVisible")} onChange={(event) => updateField(selectedField.fieldKey, { isVisible: event.target.checked })} />
                  表示
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={Boolean(selectedField.adminOnly)} onChange={(event) => updateField(selectedField.fieldKey, { adminOnly: event.target.checked })} />
                  管理者だけ表示
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedField.isEnabled} disabled={selectedField.systemRequired} onChange={(event) => updateField(selectedField.fieldKey, { isEnabled: event.target.checked })} />
                  有効
                </label>
              </div>
              <label>
                <span className="field-label">所属セクション</span>
                <select className="text-field" value={selectedField.sectionId} onChange={(event) => updateField(selectedField.fieldKey, { sectionId: event.target.value })}>
                  {sortSections(schema.sections).map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}
                </select>
              </label>
              <div className="flex gap-2">
                <button className="secondary-button flex-1" type="button" onClick={() => moveField(selectedField.fieldKey, -1)}>上へ</button>
                <button className="secondary-button flex-1" type="button" onClick={() => moveField(selectedField.fieldKey, 1)}>下へ</button>
              </div>
              <button className="secondary-button w-full border-red-200 text-red-600" type="button" disabled={selectedField.systemRequired} onClick={() => removeField(selectedField.fieldKey)}>
                項目を外す
              </button>
              <label>
                <span className="field-label">初期値</span>
                <input className="text-field" value={String(selectedField.defaultValue ?? "")} onChange={(event) => updateField(selectedField.fieldKey, { defaultValue: event.target.value })} />
              </label>
              <label>
                <span className="field-label">選択肢（value:labelを1行ずつ）</span>
                <textarea
                  className="text-field min-h-24"
                  value={(selectedField.options ?? []).map((option) => `${option.value}:${option.label}`).join("\n")}
                  onChange={(event) =>
                    updateField(selectedField.fieldKey, {
                      options: event.target.value.split("\n").map((line) => {
                        const [value, ...label] = line.split(":");
                        return { value: value.trim(), label: (label.join(":") || value).trim() };
                      }).filter((option) => option.value),
                    })
                  }
                />
              </label>
              <label>
                <span className="field-label">CRM保存先</span>
                <select className="text-field" value={selectedField.crmObject ?? "FORM_SUBMISSION"} disabled={!isFieldEditable(selectedField, "crm")} onChange={(event) => updateField(selectedField.fieldKey, { crmObject: event.target.value as AppointmentFieldDestination })}>
                  {destinations.map((destination) => <option key={destination} value={destination}>{destination}</option>)}
                </select>
              </label>
              <label>
                <span className="field-label">CRMプロパティ</span>
                <input className="text-field" value={selectedField.crmProperty ?? ""} disabled={!isFieldEditable(selectedField, "crm")} onChange={(event) => updateField(selectedField.fieldKey, { crmProperty: event.target.value })} />
              </label>
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                <p>公開中Version: {versions.find((version) => version.status === "PUBLISHED")?.version ?? "未公開"}</p>
                <p>本番反映中の項目数: {publishedSchema.fields.filter((field) => field.isVisible).length}</p>
              </div>
              <div>
                <span className="field-label">変更履歴</span>
                <div className="mt-2 max-h-40 space-y-2 overflow-auto">
                  {versions.map((version) => (
                    <button key={version.id} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-xs font-bold text-slate-500 hover:bg-brand-50" type="button" onClick={() => post("/api/appointment-form-config/restore", { businessUnitId, versionId: version.id }, `Version ${version.version} を下書きへ復元しました。`)}>
                      v{version.version} / {version.status} / {new Date(version.createdAt).toLocaleString("ja-JP")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
      <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-xl border border-line bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
        <span className={`text-sm font-bold ${dirty ? "text-amber-700" : "text-green-700"}`}>
          {dirty ? "未保存の変更があります" : "下書きは保存済みです"}
        </span>
        <button className="primary-button" type="button" disabled={pending || !dirty} onClick={() => post("/api/appointment-form-config", { businessUnitId, formSchema: schema }, "下書きを保存しました。")}>
          {pending ? "保存中..." : "下書き保存"}
        </button>
      </div>
    </div>
  );
}
