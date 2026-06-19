import { prisma } from "./prisma";

export type BusinessCalendarSummary = {
  periodStart: Date;
  periodEnd: Date;
  asOf: Date;
  workingDays: number;
  elapsedWorkingDays: number;
  remainingWorkingDays: number;
  progressRate: number | null;
};

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function dateOnly(value: Date | string) {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00Z`) : value;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function eachDate(start: Date, end: Date) {
  const dates: Date[] = [];
  for (let date = dateOnly(start); date <= dateOnly(end); date = addDays(date, 1)) {
    dates.push(date);
  }
  return dates;
}

function workingWeekdaysFromDefinition(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "workingWeekdays" in value &&
    Array.isArray((value as { workingWeekdays: unknown }).workingWeekdays)
  ) {
    return new Set(
      (value as { workingWeekdays: unknown[] }).workingWeekdays
        .map(Number)
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
    );
  }
  return new Set([1, 2, 3, 4, 5]);
}

export async function getBusinessCalendarSummary(input: {
  organizationId: string;
  businessUnitId?: string | null;
  periodStart: Date;
  periodEnd: Date;
  asOf?: Date;
}): Promise<BusinessCalendarSummary> {
  const periodStart = dateOnly(input.periodStart);
  const periodEnd = dateOnly(input.periodEnd);
  const asOf = dateOnly(input.asOf ?? new Date());
  const calendar =
    (await prisma.businessCalendar.findFirst({
      where: {
        organizationId: input.organizationId,
        businessUnitId: input.businessUnitId ?? null,
        isDefault: true,
      },
      include: {
        exceptions: {
          where: { targetDate: { gte: periodStart, lte: periodEnd } },
        },
      },
    })) ??
    (await prisma.businessCalendar.findFirst({
      where: {
        organizationId: input.organizationId,
        businessUnitId: null,
        isDefault: true,
      },
      include: {
        exceptions: {
          where: { targetDate: { gte: periodStart, lte: periodEnd } },
        },
      },
    }));

  const workingWeekdays = workingWeekdaysFromDefinition(
    calendar?.workWeekDefinition,
  );
  const exceptions = new Map(
    (calendar?.exceptions ?? []).map((exception) => [
      dateKey(exception.targetDate),
      exception.isWorkingDay,
    ]),
  );
  const isWorkingDay = (date: Date) => {
    const exception = exceptions.get(dateKey(date));
    if (exception !== undefined) return exception;
    return workingWeekdays.has(date.getUTCDay());
  };
  const allDays = eachDate(periodStart, periodEnd);
  const workingDays = allDays.filter(isWorkingDay).length;
  const elapsedWorkingDays = allDays.filter(
    (date) => date <= asOf && isWorkingDay(date),
  ).length;
  const remainingWorkingDays = allDays.filter(
    (date) => date > asOf && isWorkingDay(date),
  ).length;

  return {
    periodStart,
    periodEnd,
    asOf,
    workingDays,
    elapsedWorkingDays,
    remainingWorkingDays,
    progressRate: workingDays > 0 ? elapsedWorkingDays / workingDays : null,
  };
}
