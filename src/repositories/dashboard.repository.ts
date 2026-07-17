import prisma from "../libs/prisma";
import type { Prisma } from "../../generated/prisma/client";

export interface DashboardDateRange {
  dateFrom?: Date;
  dateTo?: Date;
}

function buildWhere(
  range: DashboardDateRange,
): Prisma.DeceasedWhereInput {
  const where: Prisma.DeceasedWhereInput = {};
  if (range.dateFrom !== undefined || range.dateTo !== undefined) {
    where.dateOfDeath = {};
    if (range.dateFrom !== undefined) {
      where.dateOfDeath.gte = range.dateFrom;
    }
    if (range.dateTo !== undefined) {
      const endOfDay = new Date(range.dateTo);
      endOfDay.setUTCHours(23, 59, 59, 999);
      where.dateOfDeath.lte = endOfDay;
    }
  }
  return where;
}

export type DashboardKpisAggregate = {
  total: number;
  avgWeight: number;
  soldCount: number;
  topDiseaseId: number | null;
  topDiseaseCount: number;
};

export async function getKpisAggregate(
  range: DashboardDateRange,
): Promise<DashboardKpisAggregate> {
  const where = buildWhere(range);

  const [aggregate, soldCount, topGroup] = await Promise.all([
    prisma.deceased.aggregate({
      where,
      _count: { _all: true },
      _avg: { weight: true },
    }),
    prisma.deceased.count({
      where: { ...where, sale: true },
    }),
    prisma.deceased.groupBy({
      by: ["diseaseId"],
      where,
      _count: { _all: true },
      orderBy: { _count: { diseaseId: "desc" } },
      take: 1,
    }),
  ]);

  const topEntry = topGroup[0];
  return {
    total: aggregate._count._all,
    avgWeight: aggregate._avg.weight ?? 0,
    soldCount,
    topDiseaseId: topEntry?.diseaseId ?? null,
    topDiseaseCount: topEntry?._count._all ?? 0,
  };
}

export async function getTopDiseaseName(
  diseaseId: number,
): Promise<string | null> {
  const disease = await prisma.disease.findUnique({
    where: { id: diseaseId },
    select: { name: true },
  });
  return disease?.name ?? null;
}

export type DashboardTimelineRawItem = {
  date: Date;
  count: number;
};

export async function getTimelineRaw(
  range: DashboardDateRange,
): Promise<DashboardTimelineRawItem[]> {
  const where = buildWhere(range);

  const groups = await prisma.deceased.groupBy({
    by: ["dateOfDeath"],
    where,
    _count: { _all: true },
    orderBy: { dateOfDeath: "asc" },
  });

  return groups.map((g) => ({
    date: g.dateOfDeath,
    count: g._count._all,
  }));
}

export type DashboardByDiseaseRawItem = {
  diseaseId: number;
  count: number;
};

export async function getByDiseaseRaw(
  range: DashboardDateRange,
): Promise<DashboardByDiseaseRawItem[]> {
  const where = buildWhere(range);

  const groups = await prisma.deceased.groupBy({
    by: ["diseaseId"],
    where,
    _count: { _all: true },
    orderBy: { _count: { diseaseId: "desc" } },
    take: 10,
  });

  return groups.map((g) => ({
    diseaseId: g.diseaseId,
    count: g._count._all,
  }));
}

export async function getDiseasesMapByIds(
  diseaseIds: number[],
): Promise<Map<number, string>> {
  if (diseaseIds.length === 0) return new Map();
  const diseases = await prisma.disease.findMany({
    where: { id: { in: diseaseIds } },
    select: { id: true, name: true },
  });
  return new Map(diseases.map((d) => [d.id, d.name]));
}

export type DashboardByEnumRawItem<K extends string> = {
  key: K;
  count: number;
};

export async function getByFoodPhaseRaw(
  range: DashboardDateRange,
): Promise<DashboardByEnumRawItem<string>[]> {
  const where = buildWhere(range);
  const groups = await prisma.deceased.groupBy({
    by: ["food_phase"],
    where,
    _count: { _all: true },
  });
  return groups.map((g) => ({
    key: g.food_phase,
    count: g._count._all,
  }));
}

export async function getByCorralTypeRaw(
  range: DashboardDateRange,
): Promise<DashboardByEnumRawItem<string>[]> {
  const where = buildWhere(range);
  const groups = await prisma.deceased.groupBy({
    by: ["corralType"],
    where,
    _count: { _all: true },
  });
  return groups.map((g) => ({
    key: g.corralType,
    count: g._count._all,
  }));
}