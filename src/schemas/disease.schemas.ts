import { z } from "zod";

const diseaseNameSchema = z
  .string()
  .min(1, "Nombre requerido")
  .max(255, "Máximo 255 caracteres");

const diseaseIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createDiseaseBodySchema = z.object({
  name: diseaseNameSchema,
  active: z.boolean().optional(),
});

export const createDiseaseSchema = z.object({
  body: createDiseaseBodySchema,
});

export type CreateDiseaseInput = z.infer<typeof createDiseaseSchema>;
export type CreateDiseaseBody = z.infer<typeof createDiseaseBodySchema>;

export const updateDiseaseBodySchema = z
  .object({
    name: diseaseNameSchema.optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.active !== undefined,
    { message: "Debes enviar al menos un campo a actualizar" },
  );

export const updateDiseaseSchema = z.object({
  body: updateDiseaseBodySchema,
  params: diseaseIdParamSchema,
});

export type UpdateDiseaseInput = z.infer<typeof updateDiseaseSchema>;
export type UpdateDiseaseBody = z.infer<typeof updateDiseaseBodySchema>;
export type UpdateDiseaseParams = z.infer<typeof diseaseIdParamSchema>;

export const deleteDiseaseSchema = z.object({
  params: diseaseIdParamSchema,
});

export type DeleteDiseaseInput = z.infer<typeof deleteDiseaseSchema>;
export type DeleteDiseaseParams = z.infer<typeof diseaseIdParamSchema>;