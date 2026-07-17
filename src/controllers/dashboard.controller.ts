import type { Request, Response } from "express";

import type {
  DashboardByCorralTypeQuery,
  DashboardByDiseaseQuery,
  DashboardByFoodPhaseQuery,
  DashboardKpisQuery,
  DashboardTimelineQuery,
} from "../schemas/dashboard.schemas";
import {
  getByCorralType,
  getByDisease,
  getByFoodPhase,
  getKpis,
  getTimeline,
} from "../services/dashboard.service";
import { ApiResponse } from "../utils/ApiResponse";

export interface IDashboardController {
  getKpis: (request: Request, response: Response) => Promise<Response>;
  getTimeline: (request: Request, response: Response) => Promise<Response>;
  getByDisease: (request: Request, response: Response) => Promise<Response>;
  getByFoodPhase: (request: Request, response: Response) => Promise<Response>;
  getByCorralType: (request: Request, response: Response) => Promise<Response>;
}

function normalizeRange(
  dateFrom: Date | undefined,
  dateTo: Date | undefined,
): { dateFrom?: Date; dateTo?: Date } {
  const result: { dateFrom?: Date; dateTo?: Date } = {};
  if (dateFrom !== undefined) result.dateFrom = dateFrom;
  if (dateTo !== undefined) result.dateTo = dateTo;
  return result;
}

export class DashboardController implements IDashboardController {
  getKpis = async (
    request: Request,
    response: Response,
  ): Promise<Response> => {
    const { dateFrom, dateTo }: DashboardKpisQuery = request.query as unknown as DashboardKpisQuery;

    const data = await getKpis(normalizeRange(dateFrom, dateTo));

    return ApiResponse.withContent(response, 200, data);
  };

  getTimeline = async (
    request: Request,
    response: Response,
  ): Promise<Response> => {
    const { dateFrom, dateTo, granularity }: DashboardTimelineQuery =
      request.query as unknown as DashboardTimelineQuery;

    const data = await getTimeline(
      normalizeRange(dateFrom, dateTo),
      granularity,
    );

    return ApiResponse.withContent(response, 200, data);
  };

  getByDisease = async (
    request: Request,
    response: Response,
  ): Promise<Response> => {
    const { dateFrom, dateTo }: DashboardByDiseaseQuery =
      request.query as unknown as DashboardByDiseaseQuery;

    const data = await getByDisease(normalizeRange(dateFrom, dateTo));

    return ApiResponse.withContent(response, 200, data);
  };

  getByFoodPhase = async (
    request: Request,
    response: Response,
  ): Promise<Response> => {
    const { dateFrom, dateTo }: DashboardByFoodPhaseQuery =
      request.query as unknown as DashboardByFoodPhaseQuery;

    const data = await getByFoodPhase(normalizeRange(dateFrom, dateTo));

    return ApiResponse.withContent(response, 200, data);
  };

  getByCorralType = async (
    request: Request,
    response: Response,
  ): Promise<Response> => {
    const { dateFrom, dateTo }: DashboardByCorralTypeQuery =
      request.query as unknown as DashboardByCorralTypeQuery;

    const data = await getByCorralType(normalizeRange(dateFrom, dateTo));

    return ApiResponse.withContent(response, 200, data);
  };
}