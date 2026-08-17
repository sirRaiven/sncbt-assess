import type { Database } from "./database.types";

export type UserRole =
  Database["public"]["Enums"]["user_role"];

export type AccountStatus =
  Database["public"]["Enums"]["account_status"];

export type Account =
  Database["public"]["Tables"]["accounts"]["Row"];

export type StudentProfile =
  Database["public"]["Tables"]["student_profiles"]["Row"];

export type InstructorProfile =
  Database["public"]["Tables"]["instructor_profiles"]["Row"];

export type AdminProfile =
  Database["public"]["Tables"]["admin_profiles"]["Row"];

/**
 * Application-facing current profile.
 *
 * The database now stores account/authorization fields separately from
 * role-specific profile fields. This flattened shape keeps existing UI
 * components stable while account and role-specific data remain normalized.
 */
export interface Profile extends Account {
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  student_number: string | null;
  employee_number: string | null;
}
