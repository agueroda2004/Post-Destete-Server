export type DiseaseRecord = {
  id: number;
  name: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type DiseaseCreateInput = {
  name: string;
  active?: boolean;
};

export type DiseaseUpdateInput = {
  name?: string;
  active?: boolean;
};