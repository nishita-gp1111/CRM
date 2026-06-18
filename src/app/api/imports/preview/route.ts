import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getAuthContext } from "@/lib/auth";
import { decodeCsv, parseCsv } from "@/lib/csv";
import { Permission, requirePermission } from "@/lib/permissions";
import { isXlsxFile, parseSpreadsheetText, parseXlsx } from "@/lib/spreadsheet";

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json(
        { message: "ログインが必要です。" },
        { status: 401 },
      );
    requirePermission(context.membership.role, Permission.IMPORT_DATA);
    const form = await request.formData();
    const file = form.get("file");
    const pastedTable = String(form.get("pastedTable") ?? "").trim();

    if (pastedTable) {
      const parsed = parseSpreadsheetText(pastedTable);
      if (!parsed.headers.length)
        return NextResponse.json(
          { message: "ヘッダー行が見つかりません。" },
          { status: 400 },
        );

      return NextResponse.json({
        ...parsed,
        encoding: "貼り付け",
        sourceName: "貼り付けデータ",
        sample: parsed.rows.slice(0, 5),
        totalRows: parsed.rows.length,
      });
    }

    if (!(file instanceof File))
      return NextResponse.json(
        { message: "ファイルを選択するか、表データを貼り付けてください。" },
        { status: 400 },
      );
    if (file.size > 10 * 1024 * 1024)
      return NextResponse.json(
        { message: "ファイルサイズは10MB以内にしてください。" },
        { status: 400 },
      );

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = isXlsxFile(file)
      ? parseXlsx(buffer)
      : (() => {
          const { text, encoding } = decodeCsv(buffer);
          return { ...parseCsv(text), encoding };
        })();

    if (!parsed.headers.length)
      return NextResponse.json(
        { message: "ヘッダー行が見つかりません。" },
        { status: 400 },
      );
    return NextResponse.json({
      ...parsed,
      encoding: "encoding" in parsed ? parsed.encoding : "XLSX",
      sourceName: file.name,
      sample: parsed.rows.slice(0, 5),
      totalRows: parsed.rows.length,
    });
  } catch (error) {
    return apiError(error);
  }
}
