import { z } from "zod";

const GRANULARITY = ["day", "week", "month"] as const;

const dateRangeQuerySchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const dashboardKpisQuerySchema = dateRangeQuerySchema;
export type DashboardKpisQuery = z.infer<typeof dashboardKpisQuerySchema>;

export const dashboardTimelineQuerySchema = dateRangeQuerySchema.extend({
  granularity: z.enum(GRANULARITY).optional(),
});
export type DashboardTimelineQuery = z.infer<typeof dashboardTimelineQuerySchema>;

export const dashboardByDiseaseQuerySchema = dateRangeQuerySchema;
export type DashboardByDiseaseQuery = z.infer<typeof dashboardByDiseaseQuerySchema>;

export const dashboardByFoodPhaseQuerySchema = dateRangeQuerySchema;
export type DashboardByFoodPhaseQuery = z.infer<
  typeof dashboardByFoodPhaseQuerySchema
>;

export const dashboardByCorralTypeQuerySchema = dateRangeQuerySchema;
export type DashboardByCorralTypeQuery = z.infer<
  typeof dashboardByCorralTypeQuerySchema
>;

export const dashboardKpisSchema = z.object({
  query: dashboardKpisQuerySchema,
});
export const dashboardTimelineSchema = z.object({
  query: dashboardTimelineQuerySchema,
});
export const dashboardByDiseaseSchema = z.object({
  query: dashboardByDiseaseQuerySchema,
});
export const dashboardByFoodPhaseSchema = z.object({
  query: dashboardByFoodPhaseQuerySchema,
});
export const dashboardByCorralTypeSchema = z.object({
  query: dashboardByCorralTypeQuerySchema,
});