"use client";

import { FormEvent, useState } from "react";

type DryRunResult = {
  workbookFingerprint: string;
  sourceName: string;
  totals: Record<string, unknown>;
  sheets: Array<{ sheetName: string; type: string; dataRows: number }>;
  warnings: string[];
};

export function LegacyProgressImporter() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<DryRunResult | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function dryRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/imports/legacy-progress/dry-run", {
      method: "POST",
      body: new FormData(event.currentTarget),
    });
    const json = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(json.message ?? "dry runに失敗しました。");
      return;
    }
    setResult(json);
  }

  async function savePreview() {
    if (!result) return;
    setPending(true);
    setError("");
    const response = await fetch("/api/imports/legacy-progress/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workbookFingerprint: result.workbookFingerprint,
        sourceName: result.sourceName,
        dryRunSummary: result,
      }),
    });
    const json = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(json.message ?? "保存できませんでした。");
      return;
    }
    setMessage(json.message ?? "保存しました。");
  }

  return (
    <div className="space-y-6">
      <form onSubmit={dryRun} className="card p-6">
        <label>
          <span className="field-label">進捗管理Excel</span>
          <input className="text-field" type="file" name="file" accept=".xlsx" />
        </label>
        <div className="mt-4 flex justify-end">
          <button className="primary-button" disabled={pending}>
            {pending ? "確認中..." : "dry run"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </p>
      ) : null}

      {result ? (
        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">dry run結果</h2>
              <p className="mt-1 text-xs text-slate-500">
                {result.sourceName}
              </p>
            </div>
            <button className="secondary-button" type="button" onClick={savePreview} disabled={pending}>
              マッピング確認用に保存
            </button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {Object.entries(result.totals).slice(0, 12).map(([key, value]) => (
              <div key={key} className="rounded-lg border border-line p-3">
                <p className="text-xs text-slate-500">{key}</p>
                <p className="mt-2 text-lg font-semibold">
                  {Array.isArray(value) ? value.length : String(value)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-400">
                <tr>
                  <th className="py-2">シート</th>
                  <th className="py-2">種別</th>
                  <th className="py-2 text-right">行数</th>
                </tr>
              </thead>
              <tbody>
                {result.sheets.map((sheet) => (
                  <tr key={sheet.sheetName} className="border-t border-line">
                    <td className="py-2 font-semibold">{sheet.sheetName}</td>
                    <td className="py-2 text-slate-500">{sheet.type}</td>
                    <td className="py-2 text-right">{sheet.dataRows}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 space-y-2">
            {result.warnings.map((warning) => (
              <p key={warning} className="text-xs text-amber-700">
                {warning}
              </p>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
