import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { apiError, getRequestMetadata } from "@/lib/api";
import { getAuthContext } from "@/lib/auth";
import { Permission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { legacyProgressApplySchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
    requirePermission(context.membership.role, Permission.IMPORT_DATA);
    const input = legacyProgressApplySchema.parse(await request.json());
    const metadata = getRequestMetadata(request);
    const job = await prisma.$transaction(async (tx) => {
      const item = await tx.importJob.create({
        data: {
          organizationId: context.organization.id,
          uploadedByUserId: context.user.id,
          objectType: "LEGACY_PROGRESS_WORKBOOK",
          status: "READY",
          totalRows:
            typeof input.dryRunSummary.totals === "object" &&
            input.dryRunSummary.totals &&
            "readRows" in input.dryRunSummary.totals
              ? Number((input.dryRunSummary.totals as { readRows: unknown }).readRows)
              : 0,
          mapping: {
            workbookFingerprint: input.workbookFingerprint,
            sourceName: input.sourceName,
            dryRunSummary: input.dryRunSummary,
            nextStep: "mapping_confirmation_required",
          } as Prisma.InputJsonValue,
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: context.organization.id,
          actorUserId: context.user.id,
          action: "legacy_progress.apply_prepared",
          targetType: "import_job",
          targetId: item.id,
          after: {
            workbookFingerprint: input.workbookFingerprint,
            sourceName: input.sourceName,
            status: "READY",
          },
          ...metadata,
        },
      });
      return item;
    });
    return NextResponse.json({
      id: job.id,
      status: job.status,
      message: "dry run結果を保存しました。マッピング確認後に登録処理へ進めます。",
    });
  } catch (error) {
    return apiError(error);
  }
}
