import { SalesPerformanceEventType } from "@prisma/client";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getAuthContext } from "@/lib/auth";
import { Permission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { referralSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
    requirePermission(context.membership.role, Permission.CRM_WRITE);
    const input = referralSchema.parse(await request.json());
    const item = await prisma.$transaction(async (tx) => {
      const referral = await tx.referral.create({
        data: {
          organizationId: context.organization.id,
          businessUnitId: input.businessUnitId ?? null,
          referrerUserId: input.referrerUserId ?? context.user.id,
          ownerUserId: input.ownerUserId ?? context.user.id,
          referredCompanyName: input.referredCompanyName,
          referredContactName: input.referredContactName,
          referredEmail: input.referredEmail,
          referredPhone: input.referredPhone,
          status: input.status,
          referredAt: input.referredAt ?? new Date(),
        },
      });
      await tx.salesPerformanceEvent.create({
        data: {
          organizationId: context.organization.id,
          businessUnitId: referral.businessUnitId,
          referralId: referral.id,
          creditedUserId: referral.referrerUserId,
          creditedRole: "REFERRER",
          eventType: SalesPerformanceEventType.REFERRAL_CREATED,
          source: "SYSTEM",
          occurredAt: referral.referredAt,
          quantity: 1,
          idempotencyKey: `referral:${referral.id}:created`,
        },
      });
      return referral;
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
