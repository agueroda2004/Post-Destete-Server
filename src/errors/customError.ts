export class CustomError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "CustomError";
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}
