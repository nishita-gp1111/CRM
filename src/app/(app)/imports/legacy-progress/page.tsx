import Link from "next/link";
import { redirect } from "next/navigation";
import { LegacyProgressImporter } from "@/components/imports/legacy-progress-importer";
import { PageHeading } from "@/components/ui/page-heading";
import { getAuthContext } from "@/lib/auth";
import {
  canUseLegacyProgressImport,
  isLegacyExcelImportEnabled,
} from "@/lib/feature-flags";

export default async function LegacyProgressImportPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  if (!canUseLegacyProgressImport(context.membership.role)) redirect("/imports");
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeading
        eyebrow="Legacy workbook"
        title="進捗管理Excelインポート"
        description="現行運用理解と将来移行に備えるためのdry runです。通常CRM画面はExcel固有値に依存しません。"
        action={
          <Link href="/imports" className="secondary-button">
            通常インポート
          </Link>
        }
      />
      <LegacyProgressImporter applyEnabled={isLegacyExcelImportEnabled()} />
    </div>
  );
}
