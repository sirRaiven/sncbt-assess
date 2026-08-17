interface FunctionErrorBody {
  code?: string;
  message?: string;
}

interface FunctionLikeError {
  context?: {
    status?: number;
    json?: () => Promise<unknown>;
  };
}

export interface UserFacingFunctionError {
  message: string;
  code: string | null;
}

const DEFAULT_ERROR_MESSAGE =
  "We couldn't complete that request right now. Please try again.";

const CONNECTION_MESSAGE =
  "We couldn't connect to SNCBT Assess. Check your internet connection and try again.";

const TIMEOUT_MESSAGE =
  "The request is taking longer than expected. Check your connection and try again.";

const SESSION_MESSAGE =
  "Your session has expired. Please sign in again to continue.";

const PERMISSION_MESSAGE =
  "This action is not available for your account. If you think this is a mistake, contact your instructor or system administrator.";

const RATE_LIMIT_MESSAGE =
  "There have been too many requests in a short time. Please wait a moment and try again.";

const SERVICE_MESSAGE =
  "SNCBT Assess couldn't complete that request right now. Please try again in a moment.";

const technicalPatterns = [
  "edge function",
  "functions/v1",
  "supabase",
  "postgrest",
  "postgres",
  "sqlstate",
  "rpc",
  "foreign key constraint",
  "unique constraint",
  "violates constraint",
  "relation ",
  "column ",
  "schema ",
  "failed to send a request",
  "failed to fetch",
  "fetch failed",
  "networkerror",
  "network request failed",
  "load failed",
  "cors",
  "non-2xx",
  "relay error",
  "jwt",
  "status code",
  "internal server error",
  "unexpected token",
  "json parse",
  "typeerror:",
  "referenceerror:",
  "stack trace",
];

function normalize(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value instanceof Error) {
    return value.message.trim();
  }

  return "";
}

function includesAny(
  message: string,
  patterns: string[],
): boolean {
  const normalized = message.toLowerCase();
  return patterns.some((pattern) => normalized.includes(pattern));
}

function looksTechnical(message: string): boolean {
  if (!message) {
    return false;
  }

  if (
    message.startsWith("<")
    || message.includes("\n    at ")
    || message.includes(" at http")
  ) {
    return true;
  }

  return includesAny(message, technicalPatterns);
}

export function toUserFacingError(
  errorOrMessage: unknown,
  fallback = DEFAULT_ERROR_MESSAGE,
  code?: string | null,
  status?: number | null,
): string {
  const raw = normalize(errorOrMessage);
  const normalized = raw.toLowerCase();
  const errorName =
    errorOrMessage instanceof Error
      ? errorOrMessage.name.toLowerCase()
      : "";
  const normalizedCode = String(code || "").toUpperCase();

  if (
    normalizedCode === "INVALID_CREDENTIALS"
    || normalized.includes("invalid login credentials")
    || normalized.includes("invalid credentials")
  ) {
    return "The username or password is incorrect.";
  }

  if (
    normalized.includes("user already registered")
    || normalized.includes("already been registered")
    || normalizedCode === "USER_ALREADY_EXISTS"
  ) {
    return "An account already exists with this information. Try signing in or use Forgot password if you need access help.";
  }

  if (
    normalized.includes("email rate limit")
    || normalized.includes("too many requests")
    || normalized.includes("rate limit")
    || normalizedCode.includes("RATE_LIMIT")
    || status === 429
  ) {
    return RATE_LIMIT_MESSAGE;
  }

  if (
    normalized.includes("request timeout")
    || normalized.includes("timed out")
    || normalized.includes("timeout")
    || normalizedCode === "REQUEST_TIMEOUT"
  ) {
    return TIMEOUT_MESSAGE;
  }

  if (
    errorName.includes("functionsfetcherror")
    || errorName.includes("authretryablefetcherror")
    || includesAny(normalized, [
      "failed to send a request",
      "failed to fetch",
      "fetch failed",
      "networkerror",
      "network request failed",
      "load failed",
      "connection refused",
      "connection reset",
      "dns",
      "cors",
      "relay error",
    ])
  ) {
    return CONNECTION_MESSAGE;
  }

  if (
    status === 401
    || normalizedCode === "UNAUTHORIZED"
    || normalizedCode === "SESSION_EXPIRED"
    || includesAny(normalized, [
      "jwt expired",
      "invalid jwt",
      "session not found",
      "refresh token",
      "not authenticated",
      "missing authorization",
      "authentication required",
    ])
  ) {
    return SESSION_MESSAGE;
  }

  if (
    status === 403
    || normalizedCode === "FORBIDDEN"
    || includesAny(normalized, [
      "permission denied",
      "not permitted",
      "not allowed",
      "only active instructors",
      "only active students",
      "only instructors",
      "only students",
    ])
  ) {
    return PERMISSION_MESSAGE;
  }

  if (
    errorName.includes("functionsrelayerror")
    || (
      status !== null
      && status !== undefined
      && status >= 500
    )
  ) {
    return SERVICE_MESSAGE;
  }

  if (looksTechnical(raw)) {
    return includesAny(normalized, [
      "failed to send a request",
      "failed to fetch",
      "fetch failed",
      "network",
      "cors",
      "relay",
    ])
      ? CONNECTION_MESSAGE
      : fallback;
  }

  // Domain-specific validation messages returned by the application are useful
  // to the user and are kept when they do not contain backend implementation
  // details. Examples include invalid class codes, closed assessments, or an
  // incorrect current password.
  return raw || fallback;
}

export async function parseUserFacingFunctionError(
  error: unknown,
  fallback = DEFAULT_ERROR_MESSAGE,
): Promise<UserFacingFunctionError> {
  const rawFallback = normalize(error);
  const functionError = error as FunctionLikeError;
  const context = functionError?.context;
  const status =
    typeof context?.status === "number"
      ? context.status
      : null;

  let code: string | null = null;
  let serverMessage = "";

  if (typeof context?.json === "function") {
    try {
      const body = await context.json() as FunctionErrorBody;
      code = body?.code || null;
      serverMessage = body?.message || "";
    } catch {
      // A non-JSON response is deliberately not shown to end users.
    }
  }

  const rawMessage = serverMessage || rawFallback;

  return {
    message: toUserFacingError(
      rawMessage,
      fallback,
      code,
      status,
    ),
    code,
  };
}

export const USER_FACING_ERROR_MESSAGES = {
  connection: CONNECTION_MESSAGE,
  timeout: TIMEOUT_MESSAGE,
  session: SESSION_MESSAGE,
  permission: PERMISSION_MESSAGE,
  service: SERVICE_MESSAGE,
} as const;
