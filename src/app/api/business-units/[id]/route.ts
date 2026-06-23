import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getAuthContext } from "@/lib/auth";
import { Permission, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { businessUnitSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

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

export async function PATCH(request: Request, { params }: Params) {
  try {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json(
        { message: "ログインが必要です。" },
        { status: 401 },
      );
    requirePermission(context.membership.role, Permission.MANAGE_ORGANIZATION);
    const { id } = await params;
    const current = await prisma.businessUnit.findFirst({
      where: { id, organizationId: context.organization.id },
    });
    if (!current)
      return NextResponse.json(
        { message: "事業部が見つかりません。" },
        { status: 404 },
      );
    const input = businessUnitSchema.parse(await request.json());
    const duplicate = await prisma.businessUnit.findFirst({
      where: {
        organizationId: context.organization.id,
        id: { not: id },
        OR: [{ name: input.name }, { slug: input.slug }],
      },
      select: { name: true, slug: true },
    });
    if (duplicate?.slug === input.slug)
      return fieldError("slug", "このslugはすでに使用されています。");
    if (duplicate?.name === input.name)
      return fieldError("name", "この事業部名はすでに使用されています。");
    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.businessUnit.update({
        where: { id },
        data: input,
      });
      await tx.auditLog.create({
        data: {
          organizationId: context.organization.id,
          actorUserId: context.user.id,
          action: "business_unit.updated",
          targetType: "business_unit",
          targetId: updated.id,
          before: current,
          after: input,
        },
      });
      return updated;
    });
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const field = p2002Field(error);
      if (field === "slug") return fieldError("slug", "このslugはすでに使用されています。");
      if (field === "name") return fieldError("name", "この事業部名はすでに使用されています。");
    }
    return apiError(error);
  }
}
