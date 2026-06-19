import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { getAuthContext } from "@/lib/auth";
import { Permission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const calendarSchema = z.object({
  businessUnitId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(160),
  timezone: z.string().trim().min(1).max(80).default("Asia/Tokyo"),
  workingWeekdays: z.array(z.number().int().min(0).max(6)).default([1, 2, 3, 4, 5]),
  isDefault: z.boolean().default(false),
});

export async function GET() {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
    requirePermission(context.membership.role, Permission.CRM_READ);
    const items = await prisma.businessCalendar.findMany({
      where: { organizationId: context.organization.id },
      include: { exceptions: { orderBy: { targetDate: "asc" } } },
      orderBy: [{ businessUnitId: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ items });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json({ message: "ログインが必要です。" }, { status: 401 });
    requirePermission(context.membership.role, Permission.MANAGE_BUSINESS_CALENDAR);
    const input = calendarSchema.parse(await request.json());
    const item = await prisma.businessCalendar.create({
      data: {
        organizationId: context.organization.id,
        businessUnitId: input.businessUnitId ?? null,
        name: input.name,
        timezone: input.timezone,
        workWeekDefinition: { workingWeekdays: input.workingWeekdays },
        isDefault: input.isDefault,
      },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
