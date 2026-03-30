export async function firestoreRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
      }
    }
  }
  throw lastError;
}
