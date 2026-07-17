import {
  getByCorralTypeRaw,
  getByDiseaseRaw,
  getByFoodPhaseRaw,
  getDiseasesMapByIds,
  getKpisAggregate,
  getTimelineRaw,
  getTopDiseaseName,
  type DashboardDateRange,
} from "../repositories/dashboard.repository";

const CORRAL_TYPES = [
  "Corral",
  "Hospital",
  "Cuna",
] as const;

const FOOD_PHASES = [
  "Fase1",
  "Fase2",
  "Fase3",
  "InicioMedicado",
  "InicioCorriente",
  "DesarrolloMedicado",
  "DesarrolloCorriente",
  "Engorde",
] as const;
import type {
  DashboardByCorralType,
  DashboardByCorralTypeItem,
  DashboardByDisease,
  DashboardByDiseaseItem,
  DashboardByFoodPhase,
  DashboardByFoodPhaseItem,
  DashboardGranularity,
  DashboardKpis,
  DashboardKpisDelta,
  DashboardTimeline,
  DashboardTimelineItem,
} from "../types/dashboard.types";

function computeRange(
  current: DashboardDateRange,
): DashboardDateRange {
  if (current.dateFrom === undefined || current.dateTo === undefined) {
    return current;
  }
  const durationMs = current.dateTo.getTime() - current.dateFrom.getTime();
  const prevTo = new Date(current.dateFrom.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - durationMs);
  return { dateFrom: prevFrom, dateTo: prevTo };
}

function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return 0;
    return null;
  }
  return ((current - previous) / previous) * 100;
}

function determineDefaultGranularity(
  range: DashboardDateRange,
): DashboardGranularity {
  if (range.dateFrom === undefined || range.dateTo === undefined) {
    return "day";
  }
  const days =
    (range.dateTo.getTime() - range.dateFrom.getTime()) / 86400000;
  if (days <= 31) return "day";
  if (days <= 365) return "week";
  return "month";
}

function bucketKey(date: Date, granularity: DashboardGranularity): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const yyyy = String(y);
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  if (granularity === "day") return `${yyyy}-${mm}-${dd}`;
  if (granularity === "month") return `${yyyy}-${mm}`;
  const tmp = new Date(Date.UTC(y, m, d));
  const dayNum = (tmp.getUTCDay() + 6) % 7;
  tmp.setUTCDate(tmp.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
  const diffDays =
    (tmp.getTime() - firstThursday.getTime()) / 86400000;
  const weekNum =
    1 +
    Math.round(
      (diffDays - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7,
    );
  return `${tmp.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export async function getKpis(
  range: DashboardDateRange,
): Promise<DashboardKpis> {
  const [current, previous] = await Promise.all([
    getKpisAggregate(range),
    getKpisAggregate(computeRange(range)),
  ]);

  const topDiseaseName =
    current.topDiseaseId !== null
      ? await getTopDiseaseName(current.topDiseaseId)
      : null;

  const soldPct =
    current.total === 0 ? 0 : (current.soldCount / current.total) * 100;

  const deltaVsPrevious: DashboardKpisDelta = {
    totalPct: deltaPct(current.total, previous.total),
    avgWeightPct: deltaPct(current.avgWeight, previous.avgWeight),
  };

  const topDisease =
    current.topDiseaseId !== null
      ? {
          id: current.topDiseaseId,
          name: topDiseaseName ?? "",
          count: current.topDiseaseCount,
        }
      : null;

  return {
    total: current.total,
    avgWeight: current.avgWeight,
    soldPct,
    topDisease,
    deltaVsPrevious,
  };
}

export async function getTimeline(
  range: DashboardDateRange,
  granularity?: DashboardGranularity,
): Promise<DashboardTimeline> {
  const effectiveGranularity: DashboardGranularity =
    granularity ?? determineDefaultGranularity(range);

  const raw = await getTimelineRaw(range);
  const counts = new Map<string, number>();
  for (const item of raw) {
    const key = bucketKey(item.date, effectiveGranularity);
    counts.set(key, (counts.get(key) ?? 0) + item.count);
  }

  const items: DashboardTimelineItem[] = Array.from(counts.entries())
    .map(([bucket, count]) => ({ bucket, count }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket));

  return { granularity: effectiveGranularity, items };
}

export async function getByDisease(
  range: DashboardDateRange,
): Promise<DashboardByDisease> {
  const raw = await getByDiseaseRaw(range);
  const ids = raw.map((r) => r.diseaseId);
  const names = await getDiseasesMapByIds(ids);

  const items: DashboardByDiseaseItem[] = raw
    .map((r) => ({
      diseaseId: r.diseaseId,
      name: names.get(r.diseaseId) ?? "",
      count: r.count,
    }))
    .sort((a, b) => b.count - a.count);

  return { items };
}

export async function getByFoodPhase(
  range: DashboardDateRange,
): Promise<DashboardByFoodPhase> {
  const raw = await getByFoodPhaseRaw(range);
  const counts = new Map<string, number>(
    raw.map((r) => [r.key, r.count]),
  );

  const items: DashboardByFoodPhaseItem[] = FOOD_PHASES.map((phase) => ({
    foodPhase: phase,
    count: counts.get(phase) ?? 0,
  }));

  return { items };
}

export async function getByCorralType(
  range: DashboardDateRange,
): Promise<DashboardByCorralType> {
  const raw = await getByCorralTypeRaw(range);
  const counts = new Map<string, number>(
    raw.map((r) => [r.key, r.count]),
  );

  const items: DashboardByCorralTypeItem[] = CORRAL_TYPES.map((type) => ({
    corralType: type,
    count: counts.get(type) ?? 0,
  }));

  return { items };
}