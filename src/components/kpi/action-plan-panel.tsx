"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Option = { id: string; name: string };
type MetricOption = { id: string; displayName: string };
type ActionPlanItem = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  ownerUserId: string | null;
  businessUnitId: string | null;
  workFunction: string | null;
  metricDefinition: { id: string; displayName: string } | null;
};

const statusLabels: Record<string, string> = {
  NOT_STARTED: "未着手",
  IN_PROGRESS: "進行中",
  COMPLETED: "完了",
  CANCELLED: "中止",
};

const priorityLabels: Record<string, string> = {
  LOW: "低",
  MEDIUM: "中",
  HIGH: "高",
  URGENT: "緊急",
};

function stringValue(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function nullableValue(form: FormData, key: string) {
  const value = stringValue(form, key).trim();
  return value ? value : null;
}

export function ActionPlanPanel({
  actionPlans,
  metrics,
  users,
  businessUnits,
  defaultBusinessUnitId,
  defaultWorkFunction,
  defaultUserId,
  canManage,
}: {
  actionPlans: ActionPlanItem[];
  metrics: MetricOption[];
  users: Option[];
  businessUnits: Option[];
  defaultBusinessUnitId: string;
  defaultWorkFunction: string;
  defaultUserId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function request(path: string, method: string, body?: Record<string, unknown>) {
    setPending(true);
    setError("");
    const response = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(json.message ?? "ActionPlanを更新できませんでした。");
      return false;
    }
    router.refresh();
    return true;
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const ok = await request("/api/action-plans", "POST", {
      title: stringValue(form, "title"),
      description: nullableValue(form, "description"),
      businessUnitId: nullableValue(form, "businessUnitId"),
      workFunction: nullableValue(form, "workFunction"),
      ownerUserId: nullableValue(form, "ownerUserId"),
      metricDefinitionId: nullableValue(form, "metricDefinitionId"),
      dueDate: nullableValue(form, "dueDate"),
      priority: stringValue(form, "priority") || "MEDIUM",
      status: "NOT_STARTED",
    });
    if (ok) formElement.reset();
  }

  async function update(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = await request(`/api/action-plans/${id}`, "PATCH", {
      title: stringValue(form, "title"),
      description: nullableValue(form, "description"),
      businessUnitId: nullableValue(form, "businessUnitId"),
      workFunction: nullableValue(form, "workFunction"),
      ownerUserId: nullableValue(form, "ownerUserId"),
      metricDefinitionId: nullableValue(form, "metricDefinitionId"),
      dueDate: nullableValue(form, "dueDate"),
      priority: stringValue(form, "priority"),
      status: stringValue(form, "status"),
    });
    if (ok) setEditingId(null);
  }

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">ActionPlan</h2>
          <p className="mt-1 text-sm text-slate-500">
            KPI不足に対する次の打ち手を作成し、完了まで追います。
          </p>
        </div>
        <span className="rounded-md bg-brand-50 px-2 py-1 text-xs font-bold text-brand-700">
          {actionPlans.length}件
        </span>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <form onSubmit={create} className="mt-5 grid gap-3 md:grid-cols-2">
        <label className="md:col-span-2">
          <span className="field-label">アクション</span>
          <input
            className="text-field"
            name="title"
            placeholder="例: 今週中に未商談案件を再架電する"
            required
          />
        </label>
        <label>
          <span className="field-label">KPI</span>
          <select className="text-field" name="metricDefinitionId">
            <option value="">未指定</option>
            {metrics.map((metric) => (
              <option key={metric.id} value={metric.id}>
                {metric.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">期限</span>
          <input className="text-field" type="date" name="dueDate" />
        </label>
        <label>
          <span className="field-label">事業部</span>
          <select className="text-field" name="businessUnitId" defaultValue={defaultBusinessUnitId}>
            <option value="">全事業部</option>
            {businessUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">職種</span>
          <select className="text-field" name="workFunction" defaultValue={defaultWorkFunction}>
            <option value="">全職種</option>
            <option value="IS">IS</option>
            <option value="FS">FS</option>
            <option value="CS">CS</option>
          </select>
        </label>
        <label>
          <span className="field-label">担当者</span>
          <select
            className="text-field"
            name="ownerUserId"
            defaultValue={defaultUserId}
            disabled={!canManage}
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">優先度</span>
          <select className="text-field" name="priority" defaultValue="MEDIUM">
            {Object.entries(priorityLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="md:col-span-2">
          <span className="field-label">メモ</span>
          <textarea className="text-field min-h-20" name="description" />
        </label>
        <div className="md:col-span-2">
          <button className="primary-button w-full" disabled={pending}>
            {pending ? "保存中..." : "ActionPlanを作成"}
          </button>
        </div>
      </form>

      <div className="mt-6 space-y-3">
        {actionPlans.map((plan) => (
          <div key={plan.id} className="rounded-lg border border-line p-4">
            {editingId === plan.id ? (
              <form onSubmit={(event) => update(event, plan.id)} className="grid gap-3 md:grid-cols-2">
                <label className="md:col-span-2">
                  <span className="field-label">アクション</span>
                  <input className="text-field" name="title" defaultValue={plan.title} required />
                </label>
                <label>
                  <span className="field-label">状態</span>
                  <select className="text-field" name="status" defaultValue={plan.status}>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="field-label">優先度</span>
                  <select className="text-field" name="priority" defaultValue={plan.priority}>
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="field-label">KPI</span>
                  <select
                    className="text-field"
                    name="metricDefinitionId"
                    defaultValue={plan.metricDefinition?.id ?? ""}
                  >
                    <option value="">未指定</option>
                    {metrics.map((metric) => (
                      <option key={metric.id} value={metric.id}>
                        {metric.displayName}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="field-label">期限</span>
                  <input className="text-field" type="date" name="dueDate" defaultValue={plan.dueDate ?? ""} />
                </label>
                <label>
                  <span className="field-label">事業部</span>
                  <select className="text-field" name="businessUnitId" defaultValue={plan.businessUnitId ?? ""}>
                    <option value="">全事業部</option>
                    {businessUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="field-label">職種</span>
                  <select className="text-field" name="workFunction" defaultValue={plan.workFunction ?? ""}>
                    <option value="">全職種</option>
                    <option value="IS">IS</option>
                    <option value="FS">FS</option>
                    <option value="CS">CS</option>
                  </select>
                </label>
                <label>
                  <span className="field-label">担当者</span>
                  <select
                    className="text-field"
                    name="ownerUserId"
                    defaultValue={plan.ownerUserId ?? defaultUserId}
                    disabled={!canManage}
                  >
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="md:col-span-2">
                  <span className="field-label">メモ</span>
                  <textarea className="text-field min-h-20" name="description" defaultValue={plan.description ?? ""} />
                </label>
                <div className="flex gap-2 md:col-span-2">
                  <button className="primary-button" disabled={pending}>
                    保存
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setEditingId(null)}
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{plan.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {plan.metricDefinition?.displayName ?? "KPI未指定"} ・
                      {plan.dueDate ?? "期限なし"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                      {statusLabels[plan.status] ?? plan.status}
                    </span>
                    <span className="rounded-md bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">
                      {priorityLabels[plan.priority] ?? plan.priority}
                    </span>
                  </div>
                </div>
                {plan.description ? (
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {plan.description}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setEditingId(plan.id)}
                  >
                    編集
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => request(`/api/action-plans/${plan.id}/complete`, "POST")}
                    disabled={pending}
                  >
                    完了
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {actionPlans.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line p-4 text-sm text-slate-500">
            未完了のActionPlanはありません。
          </p>
        ) : null}
      </div>
    </section>
  );
}
