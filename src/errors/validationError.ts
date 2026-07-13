import type { ZodIssue } from "zod";

import { CustomError } from "./customError";

export class ValidationError extends CustomError {
  public readonly issues: ZodIssue[];

  constructor(issues: ZodIssue[]) {
    super("Datos inválidos", 400);
    this.name = "ValidationError";
    this.issues = issues;
  }
}
