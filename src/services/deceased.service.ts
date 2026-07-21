import { CustomError } from "../errors/customError";
import type { IDiseaseRepository } from "../repositories/disease.repository";
import type { IDeceasedRepository } from "../repositories/deceased.repository";
import type {
  CreateDeceasedBody,
  UpdateDeceasedBody,
} from "../schemas/deceased.schemas";
import type { DiseaseDropdownItem } from "../types/disease.types";
import type {
  DeceasedListFilter,
  DeceasedListResult,
  DeceasedPagination,
} from "../types/deceased.types";

export interface IDeceasedService {
  create(input: CreateDeceasedBody): Promise<void>;
  update(id: number, input: UpdateDeceasedBody): Promise<void>;
  deleteById(id: number): Promise<void>;
  getDiseasesForDropdown(): Promise<DiseaseDropdownItem[]>;
  getAll(
    filter: DeceasedListFilter,
    pagination: DeceasedPagination,
  ): Promise<DeceasedListResult>;
}

export class DeceasedService implements IDeceasedService {
  private readonly deceasedRepository: IDeceasedRepository;
  private readonly diseaseRepository: IDiseaseRepository;

  constructor(
    deceasedRepository: IDeceasedRepository,
    diseaseRepository: IDiseaseRepository,
  ) {
    this.deceasedRepository = deceasedRepository;
    this.diseaseRepository = diseaseRepository;
  }

  async create(input: CreateDeceasedBody): Promise<void> {
    const diseaseExists = await this.diseaseRepository.findById(input.diseaseId);
    if (!diseaseExists) {
      throw new CustomError("La enfermedad asociada no existe", 404);
    }

    await this.deceasedRepository.create({
      ...(input.note !== undefined && { note: input.note }),
      weight: input.weight,
      corralNumber: input.corralNumber,
      dateOfDeath: input.dateOfDeath,
      ...(input.active !== undefined && { active: input.active }),
      ...(input.sale !== undefined && { sale: input.sale }),
      diseaseId: input.diseaseId,
      corralType: input.corralType,
      food_phase: input.food_phase,
      turn: input.turn,
    });
  }

  async update(id: number, input: UpdateDeceasedBody): Promise<void> {
    const existingDeceased = await this.deceasedRepository.findById(id);
    if (!existingDeceased) {
      throw new CustomError("Muerto no encontrado", 404);
    }

    if (input.diseaseId !== undefined) {
      const diseaseExists = await this.diseaseRepository.findById(
        input.diseaseId,
      );
      if (!diseaseExists) {
        throw new CustomError("La enfermedad asociada no existe", 404);
      }
    }

    await this.deceasedRepository.update(id, {
      ...(input.note !== undefined && { note: input.note }),
      ...(input.weight !== undefined && { weight: input.weight }),
      ...(input.corralNumber !== undefined && {
        corralNumber: input.corralNumber,
      }),
      ...(input.dateOfDeath !== undefined && {
        dateOfDeath: input.dateOfDeath,
      }),
      ...(input.active !== undefined && { active: input.active }),
      ...(input.sale !== undefined && { sale: input.sale }),
      ...(input.diseaseId !== undefined && { diseaseId: input.diseaseId }),
      ...(input.corralType !== undefined && { corralType: input.corralType }),
      ...(input.food_phase !== undefined && { food_phase: input.food_phase }),
      ...(input.turn !== undefined && { turn: input.turn }),
    });
  }

  async deleteById(id: number): Promise<void> {
    const existingDeceased = await this.deceasedRepository.findById(id);
    if (!existingDeceased) {
      throw new CustomError("Muerto no encontrado", 404);
    }

    await this.deceasedRepository.deleteById(id);
  }

  async getDiseasesForDropdown(): Promise<DiseaseDropdownItem[]> {
    return this.diseaseRepository.getActiveForDropdown();
  }

  async getAll(
    filter: DeceasedListFilter,
    pagination: DeceasedPagination,
  ): Promise<DeceasedListResult> {
    const { items, total } = await this.deceasedRepository.getAll(
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