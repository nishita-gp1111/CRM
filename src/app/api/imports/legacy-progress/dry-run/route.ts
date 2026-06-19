import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getAuthContext } from "@/lib/auth";
import { canUseLegacyProgressImport } from "@/lib/feature-flags";
import { dryRunLegacyProgressWorkbook } from "@/lib/legacy-progress-import";
import { Permission, requirePermission } from "@/lib/permissions";
import { isXlsxFile } from "@/lib/spreadsheet";

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
    requirePermission(context.membership.role, Permission.IMPORT_DATA);
    if (!canUseLegacyProgressImport(context.membership.role)) {
      return NextResponse.json(
        { message: "進捗管理Excelの解析は管理者のみ実行できます。" },
        { status: 403 },
      );
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      return NextResponse.json({ message: "Excelファイルを選択してください。" }, { status: 400 });
    if (!isXlsxFile(file))
      return NextResponse.json({ message: "進捗管理シートは.xlsxで取り込んでください。" }, { status: 400 });
    const maxBytes = Number(process.env.LEGACY_PROGRESS_IMPORT_MAX_BYTES ?? 10 * 1024 * 1024);
    if (file.size > maxBytes)
      return NextResponse.json(
        { message: "ファイルサイズが上限を超えています。" },
        { status: 400 },
      );
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = dryRunLegacyProgressWorkbook(buffer, file.name);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
