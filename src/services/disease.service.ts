import { CustomError } from "../errors/customError";
import type { IDiseaseRepository } from "../repositories/disease.repository";
import type {
  CreateDiseaseBody,
  UpdateDiseaseBody,
} from "../schemas/disease.schemas";
import type {
  DiseaseListFilter,
  DiseaseListResult,
  DiseasePagination,
} from "../types/disease.types";

export interface IDiseaseService {
  create(input: CreateDiseaseBody): Promise<void>;
  update(id: number, input: UpdateDiseaseBody): Promise<void>;
  deleteById(id: number): Promise<void>;
  getAll(
    filter: DiseaseListFilter,
    pagination: DiseasePagination,
  ): Promise<DiseaseListResult>;
}

export class DiseaseService implements IDiseaseService {
  private readonly diseaseRepository: IDiseaseRepository;

  constructor(diseaseRepository: IDiseaseRepository) {
    this.diseaseRepository = diseaseRepository;
  }

  async create(input: CreateDiseaseBody): Promise<void> {
    const existingDisease = await this.diseaseRepository.findByName(input.name);
    if (existingDisease) {
      throw new CustomError("Ya existe una enfermedad con ese nombre", 409);
    }

    await this.diseaseRepository.create({
      name: input.name,
      ...(input.active !== undefined && { active: input.active }),
    });
  }

  async update(id: number, input: UpdateDiseaseBody): Promise<void> {
    const existingDisease = await this.diseaseRepository.findById(id);
    if (!existingDisease) {
      throw new CustomError("Enfermedad no encontrada", 404);
    }

    if (input.name !== undefined) {
      const diseaseWithSameName = await this.diseaseRepository.findByName(
        input.name,
      );
      if (diseaseWithSameName && diseaseWithSameName.id !== id) {
        throw new CustomError("Ya existe una enfermedad con ese nombre", 409);
      }
    }

    await this.diseaseRepository.update(id, {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.active !== undefined && { active: input.active }),
    });
  }

  async deleteById(id: number): Promise<void> {
    const existingDisease = await this.diseaseRepository.findById(id);
    if (!existingDisease) {
      throw new CustomError("Enfermedad no encontrada", 404);
    }

    const hasDeceaseds = await this.diseaseRepository.hasDeceaseds(id);
    if (hasDeceaseds) {
      throw new CustomError(
        "No se puede eliminar la enfermedad porque tiene registros de muertos enlazados",
        409,
      );
    }

    await this.diseaseRepository.deleteById(id);
  }

  async getAll(
    filter: DiseaseListFilter,
    pagination: DiseasePagination,
  ): Promise<DiseaseListResult> {
    const { items, total } = await this.diseaseRepository.getAll(
      filter,
      pagination,
    );

    const totalPages = Math.ceil(total / pagination.pageSize);

    return {
      items,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages,
    };
  }
}
