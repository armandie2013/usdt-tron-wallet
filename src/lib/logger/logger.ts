export const logger = {
  info(message: string, meta?: unknown) {
    console.log(`[INFO] ${message}`, meta ?? "");
  },
  error(message: string, meta?: unknown) {
    console.error(`[ERROR] ${message}`, meta ?? "");
  },
};
