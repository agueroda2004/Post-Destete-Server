import { z } from "zod";
import type { CorralType, FoodPhase } from "../../generated/prisma/enums";

const CORRAL_TYPES = [
  "Corral",
  "Hospital",
  "Cuna",
] as const satisfies readonly CorralType[];

const FOOD_PHASES = [
  "Fase1",
  "Fase2",
  "Fase3",
  "InicioMedicado",
  "InicioCorriente",
  "DesarrolloMedicado",
  "DesarrolloCorriente",
  "Engorde",
] as const satisfies readonly FoodPhase[];

const deceasedNoteSchema = z
  .string()
  .max(255, "Máximo 255 caracteres")
  .nullable()
  .optional();

const deceasedWeightSchema = z
  .number()
  .positive("El peso debe ser positivo")
  .finite("El peso debe ser un número válido");

const deceasedCorralNumberSchema = z
  .string()
  .min(1, "Número de corral requerido")
  .max(255, "Máximo 255 caracteres");

const deceasedDateOfDeathSchema = z.coerce.date();

const deceasedIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const diseaseIdFieldSchema = z.coerce
  .number()
  .int()
  .positive("El id de enfermedad debe ser un entero positivo");

export const createDeceasedBodySchema = z.object({
  note: deceasedNoteSchema,
  weight: deceasedWeightSchema,
  corralNumber: deceasedCorralNumberSchema,
  dateOfDeath: deceasedDateOfDeathSchema,
  active: z.boolean().optional(),
  sale: z.boolean().optional(),
  diseaseId: diseaseIdFieldSchema,
  corralType: z.enum(CORRAL_TYPES),
  food_phase: z.enum(FOOD_PHASES),
});

export const createDeceasedSchema = z.object({
  body: createDeceasedBodySchema,
});

export type CreateDeceasedInput = z.infer<typeof createDeceasedSchema>;
export type CreateDeceasedBody = z.infer<typeof createDeceasedBodySchema>;

export const updateDeceasedBodySchema = z
  .object({
    note: deceasedNoteSchema,
    weight: deceasedWeightSchema.optional(),
    corralNumber: deceasedCorralNumberSchema.optional(),
    dateOfDeath: deceasedDateOfDeathSchema.optional(),
    active: z.boolean().optional(),
    sale: z.boolean().optional(),
    diseaseId: diseaseIdFieldSchema.optional(),
    corralType: z.enum(CORRAL_TYPES).optional(),
    food_phase: z.enum(FOOD_PHASES).optional(),
  })
  .refine(
    (data) =>
      data.note !== undefined ||
      data.weight !== undefined ||
      data.corralNumber !== undefined ||
      data.dateOfDeath !== undefined ||
      data.active !== undefined ||
      data.sale !== undefined ||
      data.diseaseId !== undefined ||
      data.corralType !== undefined ||
      data.food_phase !== undefined,
    { message: "Debes enviar al menos un campo a actualizar" },
  );

export const updateDeceasedSchema = z.object({
  body: updateDeceasedBodySchema,
  params: deceasedIdParamSchema,
});

export type UpdateDeceasedInput = z.infer<typeof updateDeceasedSchema>;
export type UpdateDeceasedBody = z.infer<typeof updateDeceasedBodySchema>;
export type UpdateDeceasedParams = z.infer<typeof deceasedIdParamSchema>;

export const deleteDeceasedSchema = z.object({
  params: deceasedIdParamSchema,
});

export type DeleteDeceasedInput = z.infer<typeof deleteDeceasedSchema>;
export type DeleteDeceasedParams = z.infer<typeof deceasedIdParamSchema>;

export const getDeceasedsQuerySchema = z.object({
  dateFrom: deceasedDateOfDeathSchema.optional(),
  dateTo: deceasedDateOfDeathSchema.optional(),
  diseaseId: z.coerce
    .number()
    .int()
    .positive("El id de enfermedad debe ser un entero positivo")
    .optional(),
  foodPhase: z.enum(FOOD_PHASES).optional(),
  corralType: z.enum(CORRAL_TYPES).optional(),
  corralNumber: z
    .string()
    .min(1, "Número de corral requerido")
    .max(255, "Máximo 255 caracteres")
    .optional(),
  sale: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((value) =>
      typeof value === "boolean" ? value : value === "true",
    )
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type GetDeceasedsQuery = z.infer<typeof getDeceasedsQuerySchema>;

export const getDeceasedsSchema = z.object({
  query: getDeceasedsQuerySchema,
});