import type { Database } from "./database.types";

export type UserRole =
  Database["public"]["Enums"]["user_role"];

export type AccountStatus =
  Database["public"]["Enums"]["account_status"];

export type Profile =
  Database["public"]["Tables"]["profiles"]["Row"];

export type ProfileInsert =
  Database["public"]["Tables"]["profiles"]["Insert"];

export type ProfileUpdate =
  Database["public"]["Tables"]["profiles"]["Update"];
