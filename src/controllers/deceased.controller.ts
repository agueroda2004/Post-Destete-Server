import type { Request, Response } from "express";

import type {
  CreateDeceasedBody,
  DeleteDeceasedParams,
  UpdateDeceasedBody,
  UpdateDeceasedParams,
} from "../schemas/deceased.schemas";
import type { IDeceasedService } from "../services/deceased.service";
import { ApiResponse } from "../utils/ApiResponse";

export interface IDeceasedController {
  create: (request: Request, response: Response) => Promise<Response>;
  update: (request: Request, response: Response) => Promise<Response>;
  deleteById: (request: Request, response: Response) => Promise<Response>;
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
      name,
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
      name,
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
      name,
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
      ...(name !== undefined && { name }),
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
}