import { createClient } from "npm:@supabase/supabase-js@2";

import {
  errorResponse,
  isBrowserOriginAllowed,
  jsonResponse,
  optionsResponse,
} from "../_shared/http.ts";

type RegistrationAccountType =
  | "student"
  | "instructor";

interface RegistrationCheckRequest {
  accountType?: unknown;
  email?: unknown;
  accountNumber?: unknown;
}

const STUDENT_NUMBER_FORMAT = /^\d{2,}-\d{3,}$/;
const EMPLOYEE_NUMBER_FORMAT = /^[A-Za-z]+\d{2,}-\d{2,}$/;
const ACCOUNT_EXISTS_MESSAGE =
  "An account already exists for the provided registration information. Please sign in or use password recovery.";

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

function getServerKey(): string {
  return (
    getMappedKey("SUPABASE_SECRET_KEYS")
    || Deno.env.get("SUPABASE_SECRET_KEY")?.trim()
    || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim()
    || ""
  );
}

function normalizeEmail(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

function normalizeAccountType(
  value: unknown,
): RegistrationAccountType | null {
  if (value === "student" || value === "instructor") {
    return value;
  }

  return null;
}

function normalizeAccountNumber(
  accountType: RegistrationAccountType,
  value: unknown,
): string {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.trim();

  return accountType === "instructor"
    ? normalized.toUpperCase()
    : normalized;
}

function validEmail(value: string): boolean {
  return value.length >= 3
    && value.length <= 320
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validAccountNumber(
  accountType: RegistrationAccountType,
  value: string,
): boolean {
  if (value.length < 1 || value.length > 50) {
    return false;
  }

  return accountType === "student"
    ? STUDENT_NUMBER_FORMAT.test(value)
    : EMPLOYEE_NUMBER_FORMAT.test(value);
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

  try {
    let body: RegistrationCheckRequest;

    try {
      body = await req.json() as RegistrationCheckRequest;
    } catch {
      return errorResponse(
        req,
        "INVALID_REGISTRATION",
        "Check your registration information and try again.",
        400,
      );
    }

    const accountType = normalizeAccountType(body.accountType);
    const email = normalizeEmail(body.email);

    if (!accountType) {
      return errorResponse(
        req,
        "INVALID_REGISTRATION",
        "Check your registration information and try again.",
        400,
      );
    }

    const accountNumber = normalizeAccountNumber(
      accountType,
      body.accountNumber,
    );

    if (
      !validEmail(email)
      || !validAccountNumber(accountType, accountNumber)
    ) {
      return errorResponse(
        req,
        "INVALID_REGISTRATION",
        "Check your registration information and try again.",
        400,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
    const serverKey = getServerKey();

    if (!supabaseUrl || !serverKey) {
      console.error("auth-register-check is missing its Supabase server configuration.");
      return errorResponse(
        req,
        "SERVICE_UNAVAILABLE",
        "We couldn't verify your registration information right now. Please try again.",
        503,
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serverKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      },
    );

    const {
      data: conflict,
      error,
    } = await supabaseAdmin.rpc(
      "registration_identity_conflict",
      {
        p_email: email,
        p_student_number:
          accountType === "student"
            ? accountNumber
            : null,
        p_employee_number:
          accountType === "instructor"
            ? accountNumber
            : null,
      },
    );

    if (error) {
      console.error("Registration identity check failed.", {
        code: error.code,
      });

      return errorResponse(
        req,
        "SERVICE_UNAVAILABLE",
        "We couldn't verify your registration information right now. Please try again.",
        503,
      );
    }

    if (conflict === true) {
      return errorResponse(
        req,
        "ACCOUNT_EXISTS",
        ACCOUNT_EXISTS_MESSAGE,
        409,
      );
    }

    return jsonResponse(
      req,
      {
        ok: true,
      },
    );
  } catch (error) {
    console.error("auth-register-check failed.", error);

    return errorResponse(
      req,
      "SERVICE_UNAVAILABLE",
      "We couldn't verify your registration information right now. Please try again.",
      503,
    );
  }
});
