import Link from "next/link";
import { redirect } from "next/navigation";
import { LegacyProgressImporter } from "@/components/imports/legacy-progress-importer";
import { PageHeading } from "@/components/ui/page-heading";
import { getAuthContext } from "@/lib/auth";

export default async function LegacyProgressImportPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeading
        eyebrow="Legacy workbook"
        title="進捗管理Excelインポート"
        description="dry runで候補とエラーを確認し、マッピング確認用のImportJobを保存します。"
        action={
          <Link href="/imports" className="secondary-button">
            通常インポート
          </Link>
        }
      />
      <LegacyProgressImporter />
    </div>
  );
}
