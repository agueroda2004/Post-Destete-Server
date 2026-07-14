import type { Request, Response } from "express";

import type {
  CreateDiseaseBody,
  DeleteDiseaseParams,
  UpdateDiseaseBody,
  UpdateDiseaseParams,
} from "../schemas/disease.schemas";
import type { IDiseaseService } from "../services/disease.service";
import { ApiResponse } from "../utils/ApiResponse";

export interface IDiseaseController {
  create: (request: Request, response: Response) => Promise<Response>;
  update: (request: Request, response: Response) => Promise<Response>;
  deleteById: (request: Request, response: Response) => Promise<Response>;
}

export class DiseaseController implements IDiseaseController {
  private readonly diseaseService: IDiseaseService;

  constructor(diseaseService: IDiseaseService) {
    this.diseaseService = diseaseService;
  }

  create = async (
    _request: Request,
    response: Response,
  ): Promise<Response> => {
    const { name, active }: CreateDiseaseBody = _request.body;

    await this.diseaseService.create({ name, active });

    return ApiResponse.withoutContent(response, 204);
  };

  update = async (
    request: Request,
    response: Response,
  ): Promise<Response> => {
    const { id } = request.params as unknown as UpdateDiseaseParams;
    const { name, active }: UpdateDiseaseBody = request.body;

    await this.diseaseService.update(id, { name, active });

    return ApiResponse.withoutContent(response, 204);
  };

  deleteById = async (
    request: Request,
    response: Response,
  ): Promise<Response> => {
    const { id } = request.params as unknown as DeleteDiseaseParams;

    await this.diseaseService.deleteById(id);

    return ApiResponse.withoutContent(response, 204);
  };
}