import { SalesPerformanceEventType } from "@prisma/client";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getAuthContext } from "@/lib/auth";
import { Permission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { fieldVisitSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
    requirePermission(context.membership.role, Permission.CRM_WRITE);
    const input = fieldVisitSchema.parse(await request.json());
    const item = await prisma.$transaction(async (tx) => {
      const fieldVisit = await tx.fieldVisit.create({
        data: {
          organizationId: context.organization.id,
          businessUnitId: input.businessUnitId ?? null,
          ownerUserId: input.ownerUserId ?? context.user.id,
          companyName: input.companyName,
          contactName: input.contactName,
          address: input.address,
          status: input.status,
          visitedAt: input.visitedAt ?? new Date(),
          sameDayWon: input.sameDayWon,
        },
      });
      await tx.salesPerformanceEvent.create({
        data: {
          organizationId: context.organization.id,
          businessUnitId: fieldVisit.businessUnitId,
          fieldVisitId: fieldVisit.id,
          creditedUserId: fieldVisit.ownerUserId,
          creditedRole: "WALK_IN_OWNER",
          eventType: SalesPerformanceEventType.FIELD_VISIT,
          source: "SYSTEM",
          occurredAt: fieldVisit.visitedAt,
          quantity: 1,
          idempotencyKey: `field-visit:${fieldVisit.id}:visited`,
        },
      });
      return fieldVisit;
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
