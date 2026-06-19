"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Definition = {
  id: string;
  displayName: string;
  description: string | null;
};

type Entry = {
  metricDefinitionId: string;
  value: unknown;
  status: string;
};

type BusinessUnit = { id: string; name: string };

export function DailyMetricForm({
  definitions,
  entries,
  businessUnits,
  defaultBusinessUnitId,
}: {
  definitions: Definition[];
  entries: Entry[];
  businessUnits: BusinessUnit[];
  defaultBusinessUnitId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const entryMap = new Map(
    entries.map((entry) => [entry.metricDefinitionId, Number(entry.value ?? 0)]),
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSaved(false);
    const form = new FormData(event.currentTarget);
    const entries = definitions.map((definition) => ({
      metricDefinitionId: definition.id,
      value: Number(form.get(definition.id) ?? 0),
    }));
    const response = await fetch("/api/daily-metrics", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessUnitId: form.get("businessUnitId"),
        workFunction: form.get("workFunction"),
        targetDate: form.get("targetDate"),
        entries,
      }),
    });
    const result = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(result.message ?? "保存できませんでした。");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="card grid gap-4 p-5 md:grid-cols-4">
        <label>
          <span className="field-label">対象日</span>
          <input className="text-field" type="date" name="targetDate" defaultValue={today} />
        </label>
        <label>
          <span className="field-label">事業部</span>
          <select className="text-field" name="businessUnitId" defaultValue={defaultBusinessUnitId}>
            {businessUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">職種</span>
          <select className="text-field" name="workFunction" defaultValue="IS">
            <option value="IS">IS</option>
            <option value="FS">FS</option>
            <option value="CS">CS</option>
          </select>
        </label>
        <div className="flex items-end">
          <button className="primary-button w-full" disabled={pending}>
            {pending ? "保存中..." : "保存"}
          </button>
        </div>
      </section>

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          保存しました。
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {definitions.map((definition) => (
          <label key={definition.id} className="card block p-5">
            <span className="text-sm font-semibold text-slate-600">
              {definition.displayName}
            </span>
            <input
              className="text-field mt-3 text-lg font-semibold"
              name={definition.id}
              type="number"
              min="0"
              step="1"
              defaultValue={entryMap.get(definition.id) ?? 0}
            />
            {definition.description ? (
              <span className="mt-2 block text-xs leading-5 text-slate-400">
                {definition.description}
              </span>
            ) : null}
          </label>
        ))}
      </section>
    </form>
  );
}
