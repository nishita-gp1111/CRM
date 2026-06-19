"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
type Field = { value: string; label: string; required?: boolean };
type Preview = {
  headers: string[];
  rows: Record<string, string>[];
  sample: Record<string, string>[];
  encoding: string;
  sourceName: string;
  sheetName?: string;
  totalRows: number;
  truncated: boolean;
};
const labels = { CONTACT: "担当者", COMPANY: "会社", DEAL: "商談" };
const aliases: Record<
  "CONTACT" | "COMPANY" | "DEAL",
  Record<string, string[]>
> = {
  CONTACT: {
    lastName: ["姓", "名字", "lastName", "last_name"],
    firstName: ["名", "名前", "firstName", "first_name"],
    email: ["メール", "メールアドレス", "email", "e-mail"],
    phone: ["電話", "電話番号", "tel"],
    mobilePhone: ["携帯", "携帯電話", "mobile"],
    jobTitle: ["役職", "肩書き", "jobTitle"],
    lifecycleStage: ["ライフサイクル", "ステージ"],
    leadStatus: ["リードステータス", "状態", "status"],
    source: ["流入元", "獲得経路", "source"],
    memo: ["メモ", "備考", "notes"],
    ownerEmail: ["担当者", "担当者メール", "owner"],
    companyName: ["会社", "会社名", "法人名", "企業名"],
    companyDomain: ["ドメイン", "会社ドメイン"],
  },
  COMPANY: {
    name: ["会社", "会社名", "法人名", "企業名", "name"],
    domain: ["ドメイン", "domain"],
    phone: ["電話", "電話番号", "tel"],
    industry: ["業種", "industry"],
    address: ["住所", "address"],
    city: ["市区町村", "市町村", "city"],
    prefecture: ["都道府県", "prefecture"],
    postalCode: ["郵便番号", "postalCode", "zip"],
    websiteUrl: ["Webサイト", "URL", "website"],
    employeeCount: ["従業員数", "社員数"],
    annualRevenue: ["年間売上", "売上"],
    ownerEmail: ["担当者", "担当者メール", "owner"],
    contactName: ["担当者氏名", "窓口氏名", "顧客担当者"],
    contactEmail: ["担当者メール", "担当者メールアドレス"],
    contactPhone: ["担当者電話", "担当者電話番号"],
    contactJobTitle: ["担当者役職", "役職"],
    contactLabel: ["担当者区分", "関係ラベル", "窓口区分"],
    contactIsPrimary: ["主担当者", "主担当者フラグ"],
  },
  DEAL: {
    name: ["商談", "商談名", "案件名", "dealName", "name"],
    amount: ["金額", "受注金額", "売上見込", "amount"],
    expectedCloseDate: ["受注予定日", "予定日", "expectedCloseDate"],
    closeDate: ["クローズ日", "受注日", "closeDate"],
    source: ["流入元", "獲得経路", "source"],
    lostReason: ["失注理由", "lostReason"],
    externalId: ["外部ID", "externalId", "id"],
    pipelineName: ["パイプライン", "パイプライン名"],
    stageName: ["ステージ", "ステージ名", "状態"],
    ownerEmail: ["担当者", "担当者メール", "owner"],
    companyName: ["会社", "会社名", "法人名", "企業名"],
    companyDomain: ["ドメイン", "会社ドメイン"],
    contactEmail: ["担当者メール", "担当者メールアドレス", "顧客メール"],
  },
};
export function ImportWizard({
  fields,
}: {
  fields: Record<"CONTACT" | "COMPANY" | "DEAL", Field[]>;
}) {
  const router = useRouter();
  const [objectType, setObjectType] = useState<"CONTACT" | "COMPANY" | "DEAL">(
    "COMPANY",
  );
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [mode, setMode] = useState("UPSERT");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/imports/preview", {
      method: "POST",
      body: form,
    });
    const result = await response.json();
    setPending(false);
    if (!response.ok) return setError(result.message);
    const auto: Record<string, string> = {};
    for (const header of result.headers) {
      const found = guessField(objectType, header, fields[objectType]);
      if (found) auto[header] = found.value;
    }
    setMapping(auto);
    setPreview(result);
  }
  async function execute() {
    if (!preview) return;
    const required = fields[objectType].filter((f) => f.required);
    if (required.some((field) => !Object.values(mapping).includes(field.value)))
      return setError(
        `必須項目「${required.find((f) => !Object.values(mapping).includes(f.value))?.label}」をマッピングしてください。`,
      );
    setPending(true);
    setError("");
    const response = await fetch("/api/imports/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objectType, mode, mapping, rows: preview.rows }),
    });
    const result = await response.json();
    setPending(false);
    if (!response.ok) return setError(result.message);
    router.push(`/imports/${result.id}`);
    router.refresh();
  }
  return (
    <div className="space-y-6">
      <section className="card p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_2fr]">
          <label>
            <span className="field-label">インポート対象</span>
            <select
              className="text-field"
              value={objectType}
              onChange={(e) => {
                setObjectType(e.target.value as typeof objectType);
                setPreview(null);
                setMapping({});
              }}
            >
              <option value="COMPANY">会社</option>
              <option value="DEAL">商談</option>
            </select>
          </label>
          <label>
            <span className="field-label">重複時の処理</span>
            <select
              className="text-field"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="UPSERT">既存データを更新</option>
              <option value="CREATE_ONLY">
                新規作成のみ（重複はスキップ）
              </option>
            </select>
          </label>
          <form onSubmit={upload} className="lg:col-span-1">
            <span className="field-label">ファイル</span>
            <input
              className="text-field"
              name="file"
              type="file"
              accept=".csv,.tsv,.txt,.xlsx,text/csv,text/tab-separated-values,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            />
            <span className="field-label mt-3">貼り付け</span>
            <textarea
              className="text-field min-h-24"
              name="pastedTable"
              placeholder="列名を含む表データ"
            />
            <div className="mt-3 flex justify-end">
              <button className="primary-button" disabled={pending}>
                {pending ? "読込中..." : "読込"}
              </button>
            </div>
          </form>
        </div>
        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </section>
      {preview ? (
        <>
          <section className="card p-6">
            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                対象: <strong>{labels[objectType]}</strong>
              </span>
              <span>
                取込元: <strong>{preview.sourceName}</strong>
              </span>
              {preview.sheetName ? (
                <span>
                  シート: <strong>{preview.sheetName}</strong>
                </span>
              ) : null}
              <span>
                形式: <strong>{preview.encoding}</strong>
              </span>
              <span>
                行数: <strong>{preview.totalRows}</strong>
              </span>
              {preview.truncated ? (
                <span className="text-amber-700">5,000行で切り詰めました</span>
              ) : null}
            </div>
            <h2 className="mt-6 font-bold">列マッピング</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {preview.headers.map((header) => (
                <label
                  key={header}
                  className="grid grid-cols-[1fr_1fr] items-center gap-3 rounded-xl border border-line p-3"
                >
                  <span className="truncate text-sm font-semibold">
                    {header}
                  </span>
                  <select
                    className="text-field py-2"
                    value={mapping[header] ?? ""}
                    onChange={(e) =>
                      setMapping({ ...mapping, [header]: e.target.value })
                    }
                  >
                    <option value="">スキップ</option>
                    {fields[objectType].map((field) => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                        {field.required ? " *" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </section>
          <section className="card overflow-hidden">
            <div className="border-b border-line px-6 py-4 font-bold">
              プレビュー（先頭5行）
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-canvas">
                  <tr>
                    {preview.headers.map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-4 py-3 text-left text-xs text-slate-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {preview.sample.map((row, i) => (
                    <tr key={i}>
                      {preview.headers.map((h) => (
                        <td key={h} className="whitespace-nowrap px-4 py-3">
                          {row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <div className="flex justify-end">
            <button
              className="primary-button"
              onClick={execute}
              disabled={pending}
            >
              {pending ? "実行中..." : `${preview.totalRows}件をインポート`}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function guessField(
  objectType: "CONTACT" | "COMPANY" | "DEAL",
  header: string,
  fields: Field[],
) {
  const normalized = normalizeImportKey(header);
  return fields.find((field) => {
    if (normalizeImportKey(field.label) === normalized) return true;
    if (normalizeImportKey(field.value) === normalized) return true;
    return aliases[objectType][field.value]?.some(
      (alias) => normalizeImportKey(alias) === normalized,
    );
  });
}

function normalizeImportKey(value: string) {
  return value.toLowerCase().replace(/[ _\-ー‐‑‒–—―　（）()［\][\].・/]/g, "");
}
