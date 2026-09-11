export class AppError extends Error {
  constructor(
    message: string,
    public readonly code = "APP_ERROR",
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}
