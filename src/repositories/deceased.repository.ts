import prisma from "../libs/prisma";
import type {
  DeceasedCreateInput,
  DeceasedRecord,
  DeceasedUpdateInput,
} from "../types/deceased.types";

export interface IDeceasedRepository {
  create(input: DeceasedCreateInput): Promise<void>;
  update(id: number, input: DeceasedUpdateInput): Promise<void>;
  deleteById(id: number): Promise<void>;
  findById(id: number): Promise<DeceasedRecord | null>;
}

export class DeceasedRepository implements IDeceasedRepository {
  async create(input: DeceasedCreateInput): Promise<void> {
    await prisma.deceased.create({
      data: {
        name: input.name,
        weight: input.weight,
        corralNumber: input.corralNumber,
        dateOfDeath: input.dateOfDeath,
        active: input.active ?? true,
        sale: input.sale ?? false,
        diseaseId: input.diseaseId,
        corralType: input.corralType,
        food_phase: input.food_phase,
      },
    });
  }

  async update(id: number, input: DeceasedUpdateInput): Promise<void> {
    const data: DeceasedUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.weight !== undefined) data.weight = input.weight;
    if (input.corralNumber !== undefined) data.corralNumber = input.corralNumber;
    if (input.dateOfDeath !== undefined) data.dateOfDeath = input.dateOfDeath;
    if (input.active !== undefined) data.active = input.active;
    if (input.sale !== undefined) data.sale = input.sale;
    if (input.diseaseId !== undefined) data.diseaseId = input.diseaseId;
    if (input.corralType !== undefined) data.corralType = input.corralType;
    if (input.food_phase !== undefined) data.food_phase = input.food_phase;

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
        name: true,
        weight: true,
        corralNumber: true,
        dateOfDeath: true,
        active: true,
        sale: true,
        diseaseId: true,
        corralType: true,
        food_phase: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return foundDeceased;
  }
}