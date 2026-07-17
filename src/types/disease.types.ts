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

export type DiseaseListFilter = {
  name?: string;
  active?: boolean;
};

export type DiseasePagination = {
  page: number;
  pageSize: number;
};

export type DiseaseListItem = {
  id: number;
  name: string;
  active: boolean;
};

export type DiseaseListResult = {
  items: DiseaseListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type DiseaseDropdownItem = {
  id: number;
  name: string;
};
