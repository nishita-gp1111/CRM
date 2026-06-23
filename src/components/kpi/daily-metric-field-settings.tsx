"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type BusinessUnit = { id: string; name: string };
type MetricOption = { id: string; displayName: string };
type Row = {
  id: string;
  metricDefinitionId: string;
  displayName: string;
  description: string | null;
  unitLabel: string;
  isEnabled: boolean;
  displayOrder: number;
  hasEntries: boolean;
};

export function DailyMetricFieldSettings({
  businessUnits,
  rows,
  metricOptions,
  selectedBusinessUnitId,
  selectedWorkFunction,
  selectedStatus,
}: {
  businessUnits: BusinessUnit[];
  rows: Row[];
  metricOptions: MetricOption[];
  selectedBusinessUnitId: string;
  selectedWorkFunction: string;
  selectedStatus: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function request(path: string, method: string, body: Record<string, unknown>) {
    setPending(true);
    setError("");
    setMessage("");
    const response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(result.message ?? "処理できませんでした。");
      return false;
    }
    setMessage("更新しました。");
    router.refresh();
    return true;
  }

  async function addExisting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const metricDefinitionId = String(form.get("metricDefinitionId") ?? "");
    if (!metricDefinitionId) {
      setError("追加するKPIを選択してください。");
      return;
    }
    await request("/api/daily-metric-field-configs", "POST", {
      mode: "existing",
      businessUnitId: selectedBusinessUnitId,
      workFunction: selectedWorkFunction,
      metricDefinitionId,
    });
  }

  async function createNew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await request("/api/daily-metric-field-configs", "POST", {
      mode: "new",
      businessUnitId: selectedBusinessUnitId,
      workFunction: selectedWorkFunction,
      displayName: String(form.get("displayName") ?? ""),
      description: String(form.get("description") ?? ""),
      unit: String(form.get("unit") ?? "COUNT"),
      displayOrder: Number(form.get("displayOrder") ?? 0),
    });
    event.currentTarget.reset();
  }

  async function toggle(row: Row, isEnabled: boolean) {
    if (
      !isEnabled &&
      !window.confirm("日次入力画面から非表示にします。過去の実績データは削除されません。")
    ) {
      return;
    }
    await request(`/api/daily-metric-field-configs/${row.id}`, "PATCH", { isEnabled });
  }

  async function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= rows.length) return;
    const nextRows = [...rows];
    const current = nextRows[index];
    const swap = nextRows[nextIndex];
    nextRows[index] = { ...swap, displayOrder: current.displayOrder };
    nextRows[nextIndex] = { ...current, displayOrder: swap.displayOrder };
    await request("/api/daily-metric-field-configs/reorder", "PUT", {
      businessUnitId: selectedBusinessUnitId,
      workFunction: selectedWorkFunction,
      items: nextRows.map((row, rowIndex) => ({
        id: row.id,
        displayOrder: row.displayOrder || (rowIndex + 1) * 10,
      })),
    });
  }

  return (
    <div className="space-y-6">
      <form className="card grid gap-3 p-4 md:grid-cols-4">
        <label>
          <span className="field-label">事業部</span>
          <select className="text-field" name="businessUnitId" defaultValue={selectedBusinessUnitId}>
            {businessUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">職種</span>
          <select className="text-field" name="workFunction" defaultValue={selectedWorkFunction}>
            <option value="IS">IS</option>
            <option value="FS">FS</option>
            <option value="CS">CS</option>
          </select>
        </label>
        <label>
          <span className="field-label">表示状態</span>
          <select className="text-field" name="status" defaultValue={selectedStatus}>
            <option value="enabled">使用中</option>
            <option value="disabled">非表示</option>
            <option value="all">すべて</option>
          </select>
        </label>
        <div className="flex items-end">
          <button className="primary-button w-full">表示</button>
        </div>
      </form>

      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{message}</p> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <form className="card p-5" onSubmit={addExisting}>
          <h2 className="font-bold">既存KPIから追加</h2>
          <div className="mt-4 flex gap-3">
            <select className="text-field" name="metricDefinitionId" disabled={pending}>
              <option value="">選択してください</option>
              {metricOptions.map((metric) => (
                <option key={metric.id} value={metric.id}>
                  {metric.displayName}
                </option>
              ))}
            </select>
            <button className="primary-button whitespace-nowrap" disabled={pending}>
              追加
            </button>
          </div>
        </form>

        <form className="card grid gap-3 p-5 md:grid-cols-2" onSubmit={createNew}>
          <h2 className="font-bold md:col-span-2">新しい入力項目を作成</h2>
          <label>
            <span className="field-label">項目名</span>
            <input className="text-field" name="displayName" required maxLength={160} />
          </label>
          <label>
            <span className="field-label">単位</span>
            <select className="text-field" name="unit" defaultValue="COUNT">
              <option value="COUNT">件数</option>
              <option value="NUMBER">数値</option>
              <option value="CURRENCY">金額</option>
              <option value="PERCENT">パーセント</option>
            </select>
          </label>
          <label>
            <span className="field-label">表示順</span>
            <input className="text-field" name="displayOrder" type="number" min="0" defaultValue="0" />
          </label>
          <label className="md:col-span-2">
            <span className="field-label">説明</span>
            <textarea className="text-field min-h-20" name="description" maxLength={2000} />
          </label>
          <div className="md:col-span-2">
            <button className="primary-button" disabled={pending}>
              作成して追加
            </button>
          </div>
        </form>
      </div>

      <section className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3">項目名</th>
              <th className="px-4 py-3">単位</th>
              <th className="px-4 py-3">使用状態</th>
              <th className="px-4 py-3">表示順</th>
              <th className="px-4 py-3">過去データ</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="border-t border-line align-top">
                <td className="px-4 py-3">
                  <p className="font-semibold">{row.displayName}</p>
                  {row.description ? (
                    <p className="mt-1 text-xs leading-5 text-slate-500">{row.description}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-slate-600">{row.unitLabel}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-md px-2 py-1 text-xs font-bold ${row.isEnabled ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                    {row.isEnabled ? "使用中" : "非表示"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{row.displayOrder}</td>
                <td className="px-4 py-3 text-slate-600">{row.hasEntries ? "あり" : "なし"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button className="secondary-button" type="button" disabled={pending || index === 0} onClick={() => move(index, -1)}>
                      上へ
                    </button>
                    <button className="secondary-button" type="button" disabled={pending || index === rows.length - 1} onClick={() => move(index, 1)}>
                      下へ
                    </button>
                    {row.isEnabled ? (
                      <button className="secondary-button" type="button" disabled={pending} onClick={() => toggle(row, false)}>
                        外す
                      </button>
                    ) : (
                      <button className="primary-button" type="button" disabled={pending} onClick={() => toggle(row, true)}>
                        再追加
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="border-t border-line p-5 text-sm text-slate-500">
            この条件の入力項目はありません。
          </p>
        ) : null}
      </section>
    </div>
  );
}
