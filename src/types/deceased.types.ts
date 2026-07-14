import type { CorralType, FoodPhase } from "../../generated/prisma/enums";

export type DeceasedRecord = {
  id: number;
  name: string;
  weight: number;
  corralNumber: string;
  dateOfDeath: Date;
  active: boolean;
  sale: boolean;
  diseaseId: number;
  corralType: CorralType;
  food_phase: FoodPhase;
  createdAt: Date;
  updatedAt: Date;
};

export type DeceasedCreateInput = {
  name: string;
  weight: number;
  corralNumber: string;
  dateOfDeath: Date;
  active?: boolean;
  sale?: boolean;
  diseaseId: number;
  corralType: CorralType;
  food_phase: FoodPhase;
};

export type DeceasedUpdateInput = {
  name?: string;
  weight?: number;
  corralNumber?: string;
  dateOfDeath?: Date;
  active?: boolean;
  sale?: boolean;
  diseaseId?: number;
  corralType?: CorralType;
  food_phase?: FoodPhase;
};