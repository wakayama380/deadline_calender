export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;

    if (typeof value.message === "string" && value.message.trim().length > 0) {
      return value.message;
    }

    if (typeof value.error === "string" && value.error.trim().length > 0) {
      return value.error;
    }

    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== "{}") {
        return serialized;
      }
    } catch {
      // ignore stringify failure and use fallback
    }
  }

  return fallback;
}