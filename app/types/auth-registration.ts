export type RegistrationAccountType =
  | "student"
  | "instructor";

export interface RegistrationCheckResponse {
  ok: true;
}

export interface RegistrationCheckResult {
  allowed: boolean;
  error: string | null;
  code: string | null;
}
