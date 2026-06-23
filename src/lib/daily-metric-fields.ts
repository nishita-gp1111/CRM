import { MetricUnit, WorkFunction } from "@prisma/client";
import { AuthContext } from "./auth";
import { hasPermission, Permission } from "./permissions";
import { prisma } from "./prisma";

export const WORK_FUNCTIONS = ["IS", "FS", "CS"] as const;

export type DailyMetricWorkFunction = (typeof WORK_FUNCTIONS)[number];

export function isDailyMetricWorkFunction(value: string | null | undefined): value is DailyMetricWorkFunction {
  return WORK_FUNCTIONS.includes(value as DailyMetricWorkFunction);
}

export function canManageDailyMetricEntries(context: AuthContext) {
  return hasPermission(context.membership.role, Permission.MANAGE_TARGETS);
}

export async function getDailyMetricScope(input: {
  context: AuthContext;
  requestedBusinessUnitId?: string | null;
  requestedWorkFunction?: string | null;
  canManage: boolean;
}) {
  const requestedWorkFunction = isDailyMetricWorkFunction(input.requestedWorkFunction)
    ? input.requestedWorkFunction
    : "IS";

  if (input.canManage) {
    const businessUnits = await prisma.businessUnit.findMany({
      where: { organizationId: input.context.organization.id, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });
    const selectedBusinessUnitId =
      businessUnits.find((unit) => unit.id === input.requestedBusinessUnitId)?.id ??
      businessUnits.find((unit) => unit.id === input.context.membership.selectedBusinessUnitId)?.id ??
      businessUnits[0]?.id ??
      "";
    return {
      businessUnits,
      selectedBusinessUnitId,
      selectedWorkFunction: requestedWorkFunction,
      userMemberships: [],
    };
  }

  const memberships = await prisma.businessUnitMembership.findMany({
    where: {
      organizationId: input.context.organization.id,
      userId: input.context.user.id,
      status: "ACTIVE",
      businessUnit: { status: "ACTIVE" },
    },
    select: {
      businessUnitId: true,
      workFunction: true,
      businessUnit: { select: { id: true, name: true, displayOrder: true } },
    },
    orderBy: [
      { businessUnit: { displayOrder: "asc" } },
      { businessUnit: { name: "asc" } },
      { workFunction: "asc" },
    ],
  });
  const businessUnits = Array.from(
    new Map(
      memberships.map((membership) => [
        membership.businessUnit.id,
        {
          id: membership.businessUnit.id,
          name: membership.businessUnit.name,
          displayOrder: membership.businessUnit.displayOrder,
        },
      ]),
    ).values(),
  ).sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));

  const exact = memberships.find(
    (membership) =>
      membership.businessUnitId === input.requestedBusinessUnitId &&
      membership.workFunction === requestedWorkFunction,
  );
  const selectedMembership =
    exact ??
    memberships.find(
      (membership) =>
        membership.businessUnitId === input.context.membership.selectedBusinessUnitId,
    ) ??
    memberships[0];

  return {
    businessUnits: businessUnits.map(({ id, name }) => ({ id, name })),
    selectedBusinessUnitId: selectedMembership?.businessUnitId ?? "",
    selectedWorkFunction: (selectedMembership?.workFunction ?? "IS") as DailyMetricWorkFunction,
    userMemberships: memberships,
  };
}

export async function getDailyMetricUserOptions(input: {
  organizationId: string;
  businessUnitId: string;
  workFunction: WorkFunction;
}) {
  const memberships = await prisma.businessUnitMembership.findMany({
    where: {
      organizationId: input.organizationId,
      businessUnitId: input.businessUnitId,
      workFunction: input.workFunction,
      status: "ACTIVE",
      user: {
        memberships: {
          some: { organizationId: input.organizationId, status: "ACTIVE" },
        },
      },
    },
    select: { user: { select: { id: true, name: true, email: true } } },
    orderBy: [{ createdAt: "asc" }],
  });
  return memberships.map((membership) => membership.user);
}

export async function assertDailyMetricEntryAccess(input: {
  context: AuthContext;
  businessUnitId: string;
  workFunction: WorkFunction;
  targetUserId: string;
  canManage: boolean;
}) {
  const membership = await prisma.businessUnitMembership.findFirst({
    where: {
      organizationId: input.context.organization.id,
      businessUnitId: input.businessUnitId,
      workFunction: input.workFunction,
      userId: input.targetUserId,
      status: "ACTIVE",
      businessUnit: { status: "ACTIVE" },
      user: {
        memberships: {
          some: { organizationId: input.context.organization.id, status: "ACTIVE" },
        },
      },
    },
    select: { id: true },
  });
  if (!membership) return false;
  if (input.canManage) return true;
  return input.targetUserId === input.context.user.id;
}

export async function getEnabledDailyMetricFieldConfigs(input: {
  organizationId: string;
  businessUnitId: string;
  workFunction: WorkFunction;
}) {
  return prisma.dailyMetricFieldConfig.findMany({
    where: {
      organizationId: input.organizationId,
      businessUnitId: input.businessUnitId,
      workFunction: input.workFunction,
      isEnabled: true,
      metricDefinition: {
        sourceType: "MANUAL_DAILY",
        isActive: true,
      },
    },
    include: {
      metricDefinition: {
        select: {
          id: true,
          displayName: true,
          description: true,
          unit: true,
          sourceType: true,
          isActive: true,
          displayOrder: true,
        },
      },
    },
    orderBy: [{ displayOrder: "asc" }, { metricDefinition: { displayOrder: "asc" } }],
  });
}

export function unitLabel(unit: MetricUnit) {
  return (
    {
      COUNT: "件数",
      NUMBER: "数値",
      CURRENCY: "金額",
      PERCENT: "パーセント",
      DAYS: "日数",
    } as Record<MetricUnit, string>
  )[unit];
}
