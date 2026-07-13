import { z } from "zod";

const MIN_PASSWORD_LENGTH = 8;

export const credentialsBodySchema = z.object({
  email: z.string().email("Email inválido"),
  password: z
    .string()
    .min(
      MIN_PASSWORD_LENGTH,
      "La contraseña debe tener al menos 8 caracteres",
    ),
});

export const credentialsSchema = z.object({
  body: credentialsBodySchema,
});

export type CredentialsInput = z.infer<typeof credentialsSchema>;
export type CredentialsBody = z.infer<typeof credentialsBodySchema>;

export const forgotPasswordBodySchema = z.object({
  email: z.string().email("Email inválido"),
});

export const forgotPasswordSchema = z.object({
  body: forgotPasswordBodySchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;

export const resetPasswordBodySchema = z.object({
  token: z.string().min(1, "Token requerido"),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, "La contraseña debe tener al menos 8 caracteres"),
});

export const resetPasswordSchema = z.object({
  body: resetPasswordBodySchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;
