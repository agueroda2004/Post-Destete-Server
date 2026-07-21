import prisma from "../libs/prisma";
import type { Prisma } from "../../generated/prisma/client";
import type {
  DeceasedCreateInput,
  DeceasedListFilter,
  DeceasedListItem,
  DeceasedPagination,
  DeceasedRecord,
  DeceasedUpdateInput,
} from "../types/deceased.types";

export interface IDeceasedRepository {
  create(input: DeceasedCreateInput): Promise<void>;
  update(id: number, input: DeceasedUpdateInput): Promise<void>;
  deleteById(id: number): Promise<void>;
  findById(id: number): Promise<DeceasedRecord | null>;
  getAll(
    filter: DeceasedListFilter,
    pagination: DeceasedPagination,
  ): Promise<{ items: DeceasedListItem[]; total: number }>;
}

export class DeceasedRepository implements IDeceasedRepository {
  async create(input: DeceasedCreateInput): Promise<void> {
    await prisma.deceased.create({
      data: {
        note: input.note ?? null,
        weight: input.weight,
        corralNumber: input.corralNumber,
        dateOfDeath: input.dateOfDeath,
        active: input.active ?? true,
        sale: input.sale ?? false,
        diseaseId: input.diseaseId,
        corralType: input.corralType,
        food_phase: input.food_phase,
        turn: input.turn,
      },
    });
  }

  async update(id: number, input: DeceasedUpdateInput): Promise<void> {
    const data: DeceasedUpdateInput = {};
    if (input.note !== undefined) data.note = input.note;
    if (input.weight !== undefined) data.weight = input.weight;
    if (input.corralNumber !== undefined) data.corralNumber = input.corralNumber;
    if (input.dateOfDeath !== undefined) data.dateOfDeath = input.dateOfDeath;
    if (input.active !== undefined) data.active = input.active;
    if (input.sale !== undefined) data.sale = input.sale;
    if (input.diseaseId !== undefined) data.diseaseId = input.diseaseId;
    if (input.corralType !== undefined) data.corralType = input.corralType;
    if (input.food_phase !== undefined) data.food_phase = input.food_phase;
    if (input.turn !== undefined) data.turn = input.turn;

    await prisma.deceased.update({
      where: { id },
      data,
    });
  }

  async deleteById(id: number): Promise<void> {
    await prisma.deceased.delete({
      where: { id },
    });
  }

  async findById(id: number): Promise<DeceasedRecord | null> {
    const foundDeceased = await prisma.deceased.findUnique({
      where: { id },
      select: {
        id: true,
        note: true,
        weight: true,
        corralNumber: true,
        dateOfDeath: true,
        active: true,
        sale: true,
        diseaseId: true,
        corralType: true,
        food_phase: true,
        turn: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return foundDeceased;
  }

  async getAll(
    filter: DeceasedListFilter,
    pagination: DeceasedPagination,
  ): Promise<{ items: DeceasedListItem[]; total: number }> {
    const where: Prisma.DeceasedWhereInput = {};

    if (filter.dateFrom !== undefined || filter.dateTo !== undefined) {
      where.dateOfDeath = {};
      if (filter.dateFrom !== undefined) {
        where.dateOfDeath.gte = filter.dateFrom;
      }
      if (filter.dateTo !== undefined) {
        const endOfDay = new Date(filter.dateTo);
        endOfDay.setUTCHours(23, 59, 59, 999);
        where.dateOfDeath.lte = endOfDay;
      }
    }
    if (filter.diseaseId !== undefined) {
      where.diseaseId = filter.diseaseId;
    }
    if (filter.foodPhase !== undefined) {
      where.food_phase = filter.foodPhase;
    }
    if (filter.corralType !== undefined) {
      where.corralType = filter.corralType;
    }
    if (filter.corralNumber !== undefined && filter.corralNumber !== "") {
      where.corralNumber = { contains: filter.corralNumber };
    }
    if (filter.sale !== undefined) {
      where.sale = filter.sale;
    }
    if (filter.turn !== undefined) {
      where.turn = filter.turn;
    }

    const page = Number(pagination.page) || 1;
    const pageSize = Number(pagination.pageSize) || 20;
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [items, total] = await Promise.all([
      prisma.deceased.findMany({
        where,
        skip,
        take,
        orderBy: [{ dateOfDeath: "desc" }, { id: "desc" }],
        select: {
          id: true,
          note: true,
          weight: true,
          corralNumber: true,
          dateOfDeath: true,
          active: true,
          sale: true,
          corralType: true,
          food_phase: true,
          turn: true,
          disease: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.deceased.count({ where }),
    ]);

    return { items: items as DeceasedListItem[], total };
  }
}