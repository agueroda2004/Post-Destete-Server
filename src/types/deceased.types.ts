import type { CorralType, FoodPhase } from "../../generated/prisma/enums";

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
};

export type DeceasedListFilter = {
  dateFrom?: Date;
  dateTo?: Date;
  diseaseId?: number;
  foodPhase?: FoodPhase;
  corralType?: CorralType;
  corralNumber?: string;
  sale?: boolean;
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