export const PG_UNIQUE_VIOLATION = '23505';

const pgErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  const code = (error as { code?: unknown }).code;
  if (typeof code === 'string') return code;
  return pgErrorCode((error as { cause?: unknown }).cause); // DrizzleQueryError → DatabaseError do pg
};

export const isUniqueViolation = (error: unknown): boolean => pgErrorCode(error) === PG_UNIQUE_VIOLATION;