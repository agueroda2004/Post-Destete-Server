import type { CorralType, FoodPhase, Turn } from "../../generated/prisma/enums";

export type DeceasedRecord = {
  id: number;
  note: string | null;
  weight: number;
  corralNumber: string;
  dateOfDeath: Date;
  active: boolean;
  sale: boolean;
  diseaseId: number;
  corralType: CorralType;
  food_phase: FoodPhase;
  turn: Turn;
  createdAt: Date;
  updatedAt: Date;
};

export type DeceasedCreateInput = {
  note?: string | null;
  weight: number;
  corralNumber: string;
  dateOfDeath: Date;
  active?: boolean;
  sale?: boolean;
  diseaseId: number;
  corralType: CorralType;
  food_phase: FoodPhase;
  turn: Turn;
};

export type DeceasedUpdateInput = {
  note?: string | null;
  weight?: number;
  corralNumber?: string;
  dateOfDeath?: Date;
  active?: boolean;
  sale?: boolean;
  diseaseId?: number;
  corralType?: CorralType;
  food_phase?: FoodPhase;
  turn?: Turn;
};

export type DeceasedListFilter = {
  dateFrom?: Date;
  dateTo?: Date;
  diseaseId?: number;
  foodPhase?: FoodPhase;
  corralType?: CorralType;
  corralNumber?: string;
  sale?: boolean;
  turn?: Turn;
};

export type DeceasedPagination = {
  page: number;
  pageSize: number;
};

export type DeceasedListItem = {
  id: number;
  note: string | null;
  weight: number;
  corralNumber: string;
  dateOfDeath: Date;
  active: boolean;
  sale: boolean;
  corralType: CorralType;
  food_phase: FoodPhase;
  turn: Turn;
  disease: {
    id: number;
    name: string;
  };
};

export type DeceasedListResult = {
  items: DeceasedListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};