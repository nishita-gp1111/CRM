import { OrganizationRole, Prisma } from "@prisma/client";
import { AuthContext } from "./auth";
import { prisma } from "./prisma";

export type BusinessUnitOption = {
  id: string;
  name: string;
  slug: string;
};

export function canSelectAllBusinessUnits(role: OrganizationRole) {
  return Boolean(role);
}

export async function getAccessibleBusinessUnits(context: AuthContext) {
  return prisma.businessUnit.findMany({
    where: { organizationId: context.organization.id, status: "ACTIVE" },
    select: { id: true, name: true, slug: true },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function getBusinessUnitSelection(context: AuthContext) {
  const units = await getAccessibleBusinessUnits(context);
  const canSelectAll = canSelectAllBusinessUnits(context.membership.role);
  const selectedIsAccessible = units.some(
    (unit) => unit.id === context.membership.selectedBusinessUnitId,
  );
  const selectedBusinessUnitId = selectedIsAccessible
    ? context.membership.selectedBusinessUnitId
    : null;

  return {
    units,
    canSelectAll,
    selectedBusinessUnitId,
    selectedBusinessUnitName:
      units.find((unit) => unit.id === selectedBusinessUnitId)?.name ??
      "全事業部",
  };
}

export async function assertBusinessUnitAccess(
  context: AuthContext,
  businessUnitId: string | null | undefined,
) {
  if (!businessUnitId) return true;
  const unit = await prisma.businessUnit.findFirst({
    where: {
      id: businessUnitId,
      organizationId: context.organization.id,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  return Boolean(unit);
}

export function businessUnitWhere(
  selectedBusinessUnitId: string | null,
): Pick<Prisma.DealWhereInput, "businessUnitId"> {
  return selectedBusinessUnitId
    ? { businessUnitId: selectedBusinessUnitId }
    : {};
}
