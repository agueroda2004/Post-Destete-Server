import type { Request, Response } from "express";

import type {
  CreateDeceasedBody,
  DeleteDeceasedParams,
  GetDeceasedsQuery,
  UpdateDeceasedBody,
  UpdateDeceasedParams,
} from "../schemas/deceased.schemas";
import type { IDeceasedService } from "../services/deceased.service";
import type { DeceasedListResult } from "../types/deceased.types";
import type { DiseaseDropdownItem } from "../types/disease.types";
import { ApiResponse } from "../utils/ApiResponse";

export interface IDeceasedController {
  create: (request: Request, response: Response) => Promise<Response>;
  update: (request: Request, response: Response) => Promise<Response>;
  deleteById: (request: Request, response: Response) => Promise<Response>;
  getDiseasesForDropdown: (
    request: Request,
    response: Response,
  ) => Promise<Response>;
  getAll: (request: Request, response: Response) => Promise<Response>;
}

export class DeceasedController implements IDeceasedController {
  private readonly deceasedService: IDeceasedService;

  constructor(deceasedService: IDeceasedService) {
    this.deceasedService = deceasedService;
  }

  create = async (
    request: Request,
    response: Response,
  ): Promise<Response> => {
    const {
      note,
      weight,
      corralNumber,
      dateOfDeath,
      active,
      sale,
      diseaseId,
      corralType,
      food_phase,
    }: CreateDeceasedBody = request.body;

    await this.deceasedService.create({
      ...(note !== undefined && { note }),
      weight,
      corralNumber,
      dateOfDeath,
      ...(active !== undefined && { active }),
      ...(sale !== undefined && { sale }),
      diseaseId,
      corralType,
      food_phase,
    });

    return ApiResponse.withoutContent(response, 204);
  };

  update = async (
    request: Request,
    response: Response,
  ): Promise<Response> => {
    const { id } = request.params as unknown as UpdateDeceasedParams;
    const {
      note,
      weight,
      corralNumber,
      dateOfDeath,
      active,
      sale,
      diseaseId,
      corralType,
      food_phase,
    }: UpdateDeceasedBody = request.body;

    await this.deceasedService.update(id, {
      ...(note !== undefined && { note }),
      ...(weight !== undefined && { weight }),
      ...(corralNumber !== undefined && { corralNumber }),
      ...(dateOfDeath !== undefined && { dateOfDeath }),
      ...(active !== undefined && { active }),
      ...(sale !== undefined && { sale }),
      ...(diseaseId !== undefined && { diseaseId }),
      ...(corralType !== undefined && { corralType }),
      ...(food_phase !== undefined && { food_phase }),
    });

    return ApiResponse.withoutContent(response, 204);
  };

  deleteById = async (
    request: Request,
    response: Response,
  ): Promise<Response> => {
    const { id } = request.params as unknown as DeleteDeceasedParams;

    await this.deceasedService.deleteById(id);

    return ApiResponse.withoutContent(response, 204);
  };

  getDiseasesForDropdown = async (
    _request: Request,
    response: Response,
  ): Promise<Response> => {
    const items: DiseaseDropdownItem[] =
      await this.deceasedService.getDiseasesForDropdown();

    return ApiResponse.withContent(response, 200, items);
  };

  getAll = async (
    request: Request,
    response: Response,
  ): Promise<Response> => {
    const {
      dateFrom,
      dateTo,
      diseaseId,
      foodPhase,
      corralType,
      corralNumber,
      sale,
      page,
      pageSize,
    }: GetDeceasedsQuery = request.query as unknown as GetDeceasedsQuery;

    const result: DeceasedListResult = await this.deceasedService.getAll(
      {
        ...(dateFrom !== undefined && { dateFrom }),
        ...(dateTo !== undefined && { dateTo }),
        ...(diseaseId !== undefined && { diseaseId }),
        ...(foodPhase !== undefined && { foodPhase }),
        ...(corralType !== undefined && { corralType }),
        ...(corralNumber !== undefined &&
          corralNumber !== "" && { corralNumber }),
        ...(sale !== undefined && { sale }),
      },
      { page, pageSize },
    );

    return ApiResponse.withContent(response, 200, result);
  };
}