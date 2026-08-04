import type {
  AppRole,
} from "~/types/ui";

import type {
  Profile,
} from "~/types/profile";

type AuthenticationProfile = Pick<
  Profile,
  "role" | "account_status"
>;

export function getAccountDestination(
  profile: AuthenticationProfile,
): string {
  if (profile.account_status === "pending") {
    return "/account-pending";
  }

  if (
    profile.account_status === "suspended"
    || profile.account_status === "rejected"
  ) {
    return "/account-unavailable";
  }

  switch (profile.role) {
    case "admin":
      return "/admin/dashboard";

    case "instructor":
      return "/instructor/dashboard";

    case "student":
    default:
      return "/student/dashboard";
  }
}

export function resolveRequestedDestination(
  profile: AuthenticationProfile,
  requestedPath: unknown,
): string {
  const fallback = getAccountDestination(profile);

  if (profile.account_status !== "active") {
    return fallback;
  }

  if (
    typeof requestedPath !== "string"
    || !requestedPath.startsWith("/")
    || requestedPath.startsWith("//")
  ) {
    return fallback;
  }

  const allowedPrefix = `/${profile.role}/`;

  if (requestedPath.startsWith(allowedPrefix)) {
    return requestedPath;
  }

  return fallback;
}

export function isAppRole(
  value: string,
): value is AppRole {
  return [
    "admin",
    "instructor",
    "student",
  ].includes(value);
}
