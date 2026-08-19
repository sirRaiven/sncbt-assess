import { createClient } from "npm:@supabase/supabase-js@2";

import {
  errorResponse,
  isBrowserOriginAllowed,
  jsonResponse,
  optionsResponse,
} from "../_shared/http.ts";

interface SignInRequest {
  identifier?: unknown;
  password?: unknown;
}

const INVALID_CREDENTIALS_MESSAGE =
  "The username or password is incorrect.";
const RATE_LIMIT_MESSAGE =
  "Too many sign-in attempts were made. Please wait a few minutes and try again.";

function getRequiredEnvironment(name: string): string {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getMappedKey(environmentName: string): string {
  const raw = Deno.env.get(environmentName)?.trim();

  if (!raw) {
    return "";
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return typeof parsed.default === "string"
      ? parsed.default.trim()
      : "";
  } catch {
    console.error(`${environmentName} is not valid JSON.`);
    return "";
  }
}

function getSecretKey(): string {
  return (
    getMappedKey("SUPABASE_SECRET_KEYS")
    || Deno.env.get("SUPABASE_SECRET_KEY")?.trim()
    || ""
  );
}

function getServerKey(): string {
  return (
    getSecretKey()
    || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim()
    || ""
  );
}

function getClientKey(): string {
  return (
    getMappedKey("SUPABASE_PUBLISHABLE_KEYS")
    || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")?.trim()
    || Deno.env.get("SUPABASE_ANON_KEY")?.trim()
    || ""
  );
}

function getForwardedClientIp(req: Request): string {
  const candidate = (
    req.headers.get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim()
    || req.headers.get("cf-connecting-ip")?.trim()
    || ""
  );

  if (
    !candidate
    || candidate.length > 64
    || !/^[0-9a-fA-F:.]+$/.test(candidate)
  ) {
    return "";
  }

  return candidate;
}

async function waitForFailureFloor(startedAt: number): Promise<void> {
  // Unknown usernames previously returned before password verification, while
  // known usernames reached Supabase Auth. A small randomized minimum failure
  // duration reduces that timing difference without delaying successful sign-in.
  const targetMs = 450 + Math.floor(Math.random() * 151);
  const remaining = targetMs - (Date.now() - startedAt);

  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}

function authErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "";
  }

  return String(
    (error as { code?: unknown }).code || "",
  ).toLowerCase();
}

function authErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const raw = Number((error as { status?: unknown }).status);
  return Number.isFinite(raw) ? raw : null;
}

interface PasswordSessionResult {
  session: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
    expires_in: number;
    token_type: string;
  } | null;
  errorCode: string;
  errorStatus: number | null;
}

async function signInWithForwardedIp(
  supabaseUrl: string,
  secretKey: string,
  clientIp: string,
  email: string,
  password: string,
): Promise<PasswordSessionResult> {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        "apikey": secretKey,
        "Content-Type": "application/json",
        "Sb-Forwarded-For": clientIp,
      },
      body: JSON.stringify({
        email,
        password,
      }),
    },
  );

  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;

  if (!response.ok) {
    return {
      session: null,
      errorCode: String(payload.code || payload.error_code || "").toLowerCase(),
      errorStatus: response.status,
    };
  }

  const accessToken = typeof payload.access_token === "string"
    ? payload.access_token
    : "";
  const refreshToken = typeof payload.refresh_token === "string"
    ? payload.refresh_token
    : "";

  if (!accessToken || !refreshToken) {
    return {
      session: null,
      errorCode: "invalid_token_response",
      errorStatus: 502,
    };
  }

  return {
    session: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: typeof payload.expires_at === "number"
        ? payload.expires_at
        : undefined,
      expires_in: Number(payload.expires_in || 0),
      token_type: typeof payload.token_type === "string"
        ? payload.token_type
        : "bearer",
    },
    errorCode: "",
    errorStatus: null,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return optionsResponse(req);
  }

  if (!isBrowserOriginAllowed(req)) {
    return errorResponse(
      req,
      "ORIGIN_NOT_ALLOWED",
      "This request origin is not allowed.",
      403,
    );
  }

  if (req.method !== "POST") {
    return errorResponse(
      req,
      "METHOD_NOT_ALLOWED",
      "This request method is not supported.",
      405,
    );
  }

  const startedAt = Date.now();

  try {
    const supabaseUrl = getRequiredEnvironment("SUPABASE_URL");
    const serverKey = getServerKey();
    const clientKey = getClientKey();

    if (!serverKey || !clientKey) {
      console.error("auth-sign-in is missing a Supabase server/client key.");
      return errorResponse(
        req,
        "SERVICE_UNAVAILABLE",
        "We couldn't sign you in right now. Please try again.",
        503,
      );
    }

    let body: SignInRequest;

    try {
      body = await req.json() as SignInRequest;
    } catch {
      await waitForFailureFloor(startedAt);
      return errorResponse(
        req,
        "INVALID_CREDENTIALS",
        INVALID_CREDENTIALS_MESSAGE,
        401,
      );
    }

    const identifier = typeof body.identifier === "string"
      ? body.identifier.trim()
      : "";
    const password = typeof body.password === "string"
      ? body.password
      : "";
    if (!identifier || identifier.length > 100 || !password || password.length > 512) {
      await waitForFailureFloor(startedAt);
      return errorResponse(
        req,
        "INVALID_CREDENTIALS",
        INVALID_CREDENTIALS_MESSAGE,
        401,
      );
    }

    const adminClient = createClient(supabaseUrl, serverKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    let userId: string | null = null;

    const { data: studentProfile, error: studentLookupError } = await adminClient
      .from("student_profiles")
      .select("user_id")
      .eq("student_number", identifier)
      .maybeSingle();

    if (studentLookupError) {
      console.error("Student identifier lookup failed.", {
        code: studentLookupError.code,
      });
      return errorResponse(
        req,
        "SERVICE_UNAVAILABLE",
        "We couldn't sign you in right now. Please try again.",
        503,
      );
    }

    userId = studentProfile?.user_id ?? null;

    if (!userId) {
      const { data: instructorProfile, error: instructorLookupError } = await adminClient
        .from("instructor_profiles")
        .select("user_id")
        .eq("employee_number", identifier.toUpperCase())
        .maybeSingle();

      if (instructorLookupError) {
        console.error("Employee identifier lookup failed.", {
          code: instructorLookupError.code,
        });
        return errorResponse(
          req,
          "SERVICE_UNAVAILABLE",
          "We couldn't sign you in right now. Please try again.",
          503,
        );
      }

      userId = instructorProfile?.user_id ?? null;
    }

    // Preserve the email fallback for administrator/service accounts while the
    // public UI continues to use Student Number / Employee Number normally.
    if (!userId && identifier.includes("@")) {
      const { data: emailAccount, error: emailLookupError } = await adminClient
        .from("accounts")
        .select("id")
        .eq("email", identifier.toLowerCase())
        .maybeSingle();

      if (emailLookupError) {
        console.error("Email identifier lookup failed.", {
          code: emailLookupError.code,
        });
        return errorResponse(
          req,
          "SERVICE_UNAVAILABLE",
          "We couldn't sign you in right now. Please try again.",
          503,
        );
      }

      userId = emailAccount?.id ?? null;
    }

    if (!userId) {
      await waitForFailureFloor(startedAt);
      return errorResponse(
        req,
        "INVALID_CREDENTIALS",
        INVALID_CREDENTIALS_MESSAGE,
        401,
      );
    }

    const { data: account, error: accountError } = await adminClient
      .from("accounts")
      .select("email")
      .eq("id", userId)
      .maybeSingle();

    if (accountError) {
      console.error("Account lookup failed.", {
        code: accountError.code,
      });
      return errorResponse(
        req,
        "SERVICE_UNAVAILABLE",
        "We couldn't sign you in right now. Please try again.",
        503,
      );
    }

    if (!account?.email) {
      await waitForFailureFloor(startedAt);
      return errorResponse(
        req,
        "INVALID_CREDENTIALS",
        INVALID_CREDENTIALS_MESSAGE,
        401,
      );
    }

    const secretKey = getSecretKey();
    const forwardedClientIp = getForwardedClientIp(req);

    let passwordResult: PasswordSessionResult;

    if (secretKey && forwardedClientIp) {
      passwordResult = await signInWithForwardedIp(
        supabaseUrl,
        secretKey,
        forwardedClientIp,
        account.email,
        password,
      );
    } else {
      const authClient = createClient(supabaseUrl, clientKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      });

      const { data: authData, error: authError } = await authClient.auth
        .signInWithPassword({
          email: account.email,
          password,
        });

      passwordResult = {
        session: authData.session,
        errorCode: authErrorCode(authError),
        errorStatus: authErrorStatus(authError),
      };
    }

    if (!passwordResult.session) {
      const code = passwordResult.errorCode;
      const status = passwordResult.errorStatus;

      if (status === 429 || code === "over_request_rate_limit") {
        return errorResponse(
          req,
          "RATE_LIMITED",
          RATE_LIMIT_MESSAGE,
          429,
        );
      }

      // Do not disclose whether the username exists, whether the email is
      // confirmed, or whether the password alone was incorrect.
      await waitForFailureFloor(startedAt);
      return errorResponse(
        req,
        "INVALID_CREDENTIALS",
        INVALID_CREDENTIALS_MESSAGE,
        401,
      );
    }

    return jsonResponse(req, {
      ok: true,
      accessToken: passwordResult.session.access_token,
      refreshToken: passwordResult.session.refresh_token,
      expiresAt: passwordResult.session.expires_at ?? null,
      expiresIn: passwordResult.session.expires_in,
      tokenType: passwordResult.session.token_type,
    });
  } catch (error) {
    console.error("auth-sign-in failed.", error);
    return errorResponse(
      req,
      "SERVICE_UNAVAILABLE",
      "We couldn't sign you in right now. Please try again.",
      503,
    );
  }
});
