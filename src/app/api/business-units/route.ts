import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getAuthContext } from "@/lib/auth";
import { Permission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { businessUnitSchema } from "@/lib/validation";

function fieldError(field: "name" | "slug", message: string, status = 400) {
  return NextResponse.json(
    {
      message: "入力内容を確認してください。",
      fieldErrors: { [field]: message },
    },
    { status },
  );
}

function p2002Field(error: Prisma.PrismaClientKnownRequestError) {
  const target = error.meta?.target;
  const values = Array.isArray(target) ? target.map(String) : [String(target ?? "")];
  if (values.some((value) => value.includes("slug"))) return "slug";
  if (values.some((value) => value.includes("name"))) return "name";
  return null;
}

export async function GET() {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json(
        { message: "ログインが必要です。" },
        { status: 401 },
      );
    requirePermission(context.membership.role, Permission.MANAGE_ORGANIZATION);
    const items = await prisma.businessUnit.findMany({
      where: { organizationId: context.organization.id },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
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
      return NextResponse.json(
        { message: "ログインが必要です。" },
        { status: 401 },
      );
    requirePermission(context.membership.role, Permission.MANAGE_ORGANIZATION);
    const input = businessUnitSchema.parse(await request.json());
    const duplicate = await prisma.businessUnit.findFirst({
      where: {
        organizationId: context.organization.id,
        OR: [{ name: input.name }, { slug: input.slug }],
      },
      select: { name: true, slug: true },
    });
    if (duplicate?.slug === input.slug)
      return fieldError("slug", "このslugはすでに使用されています。");
    if (duplicate?.name === input.name)
      return fieldError("name", "この事業部名はすでに使用されています。");
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.businessUnit.create({
        data: { organizationId: context.organization.id, ...input },
      });
      await tx.auditLog.create({
        data: {
          organizationId: context.organization.id,
          actorUserId: context.user.id,
          action: "business_unit.created",
          targetType: "business_unit",
          targetId: created.id,
          after: input,
        },
      });
      return created;
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const field = p2002Field(error);
      if (field === "slug") return fieldError("slug", "このslugはすでに使用されています。");
      if (field === "name") return fieldError("name", "この事業部名はすでに使用されています。");
    }
    return apiError(error);
  }
}
