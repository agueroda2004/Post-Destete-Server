export type DashboardGranularity = "day" | "week" | "month";

export type DashboardKpisDelta = {
  totalPct: number | null;
  avgWeightPct: number | null;
};

export type DashboardTopDisease = {
  id: number;
  name: string;
  count: number;
} | null;

export type DashboardKpis = {
  total: number;
  avgWeight: number;
  soldPct: number;
  topDisease: DashboardTopDisease;
  deltaVsPrevious: DashboardKpisDelta;
};

export type DashboardTimelineItem = {
  bucket: string;
  count: number;
};

export type DashboardTimeline = {
  granularity: DashboardGranularity;
  items: DashboardTimelineItem[];
};

export type DashboardByDiseaseItem = {
  diseaseId: number;
  name: string;
  count: number;
};

export type DashboardByDisease = {
  items: DashboardByDiseaseItem[];
};

export type DashboardByFoodPhaseItem = {
  foodPhase: string;
  count: number;
};

export type DashboardByFoodPhase = {
  items: DashboardByFoodPhaseItem[];
};

export type DashboardByCorralTypeItem = {
  corralType: string;
  count: number;
};

export type DashboardByCorralType = {
  items: DashboardByCorralTypeItem[];
};