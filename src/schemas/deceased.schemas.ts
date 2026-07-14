import { z } from "zod";
import { CorralType, FoodPhase } from "../../generated/prisma/enums";

const deceasedNameSchema = z
  .string()
  .min(1, "Nombre requerido")
  .max(255, "Máximo 255 caracteres");

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
  name: deceasedNameSchema,
  weight: deceasedWeightSchema,
  corralNumber: deceasedCorralNumberSchema,
  dateOfDeath: deceasedDateOfDeathSchema,
  active: z.boolean().optional(),
  sale: z.boolean().optional(),
  diseaseId: diseaseIdFieldSchema,
  corralType: z.nativeEnum(CorralType),
  food_phase: z.nativeEnum(FoodPhase),
});

export const createDeceasedSchema = z.object({
  body: createDeceasedBodySchema,
});

export type CreateDeceasedInput = z.infer<typeof createDeceasedSchema>;
export type CreateDeceasedBody = z.infer<typeof createDeceasedBodySchema>;

export const updateDeceasedBodySchema = z
  .object({
    name: deceasedNameSchema.optional(),
    weight: deceasedWeightSchema.optional(),
    corralNumber: deceasedCorralNumberSchema.optional(),
    dateOfDeath: deceasedDateOfDeathSchema.optional(),
    active: z.boolean().optional(),
    sale: z.boolean().optional(),
    diseaseId: diseaseIdFieldSchema.optional(),
    corralType: z.nativeEnum(CorralType).optional(),
    food_phase: z.nativeEnum(FoodPhase).optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
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