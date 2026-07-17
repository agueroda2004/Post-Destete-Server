import prisma from "../libs/prisma";
import type {
  DiseaseCreateInput,
  DiseaseDropdownItem,
  DiseaseListFilter,
  DiseaseListItem,
  DiseasePagination,
  DiseaseRecord,
  DiseaseUpdateInput,
} from "../types/disease.types";

export interface IDiseaseRepository {
  create(input: DiseaseCreateInput): Promise<void>;
  update(id: number, input: DiseaseUpdateInput): Promise<void>;
  deleteById(id: number): Promise<void>;
  findById(id: number): Promise<DiseaseRecord | null>;
  findByName(name: string): Promise<DiseaseRecord | null>;
  hasDeceaseds(diseaseId: number): Promise<boolean>;
  getAll(
    filter: DiseaseListFilter,
    pagination: DiseasePagination,
  ): Promise<{ items: DiseaseListItem[]; total: number }>;
  getActiveForDropdown(): Promise<DiseaseDropdownItem[]>;
}

export class DiseaseRepository implements IDiseaseRepository {
  async create(input: DiseaseCreateInput): Promise<void> {
    await prisma.disease.create({
      data: {
        name: input.name,
        active: input.active ?? true,
      },
    });
  }

  async update(id: number, input: DiseaseUpdateInput): Promise<void> {
    const data: DiseaseUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.active !== undefined) data.active = input.active;

    await prisma.disease.update({
      where: { id },
      data,
    });
  }

  async deleteById(id: number): Promise<void> {
    await prisma.disease.delete({
      where: { id },
    });
  }

  async findById(id: number): Promise<DiseaseRecord | null> {
    const foundDisease = await prisma.disease.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return foundDisease;
  }

  async findByName(name: string): Promise<DiseaseRecord | null> {
    const foundDisease = await prisma.disease.findUnique({
      where: { name },
      select: {
        id: true,
        name: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return foundDisease;
  }

  async hasDeceaseds(diseaseId: number): Promise<boolean> {
    const foundDeceased = await prisma.deceased.findFirst({
      where: { diseaseId },
      select: { id: true },
      take: 1,
    });

    return foundDeceased !== null;
  }

  async getAll(
    filter: DiseaseListFilter,
    pagination: DiseasePagination,
  ): Promise<{ items: DiseaseListItem[]; total: number }> {
    const where: {
      name?: { contains: string };
      active?: boolean;
    } = {};

    if (filter.name !== undefined) {
      where.name = { contains: filter.name };
    }
    if (filter.active !== undefined) {
      where.active = filter.active;
    }

    const page = Number(pagination.page) || 1;
    const pageSize = Number(pagination.pageSize) || 10;
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [items, total] = await Promise.all([
      prisma.disease.findMany({
        where,
        skip,
        take,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          active: true,
        },
      }),
      prisma.disease.count({ where }),
    ]);

    return { items, total };
  }

  async getActiveForDropdown(): Promise<DiseaseDropdownItem[]> {
    const diseases = await prisma.disease.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    });

    return diseases;
  }
}
