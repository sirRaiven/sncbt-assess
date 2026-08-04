import type {
  AppRole,
} from "~/types/ui";

import {
  getAccountDestination,
  isAppRole,
} from "~/utils/auth-navigation";

const protectedPrefixes: Record<AppRole, string> = {
  admin: "/admin",
  instructor: "/instructor",
  student: "/student",
};

const guestOnlyPaths = new Set([
  "/",
  "/register",
  "/forgot-password",
]);

const callbackAndStatusPaths = new Set([
  "/confirm",
  "/reset-password",
  "/account-pending",
  "/account-unavailable",
]);

function getRequiredRole(
  path: string,
): AppRole | null {
  for (
    const [
      role,
      prefix,
    ] of Object.entries(protectedPrefixes)
  ) {
    if (
      path === prefix
      || path.startsWith(`${prefix}/`)
    ) {
      return isAppRole(role)
        ? role
        : null;
    }
  }

  return null;
}

export default defineNuxtRouteMiddleware(
  async (to) => {
    const user = useSupabaseUser();
    const requiredRole = getRequiredRole(to.path);

    if (
      requiredRole
      && !user.value
    ) {
      return navigateTo({
        path: "/",
        query: {
          redirect: to.fullPath,
        },
      });
    }

    if (!user.value) {
      return;
    }

    const {
      loadProfile,
    } = useCurrentProfile();

    const profile = await loadProfile();

    if (!profile) {
      const supabase = useSupabaseClient();

      await supabase.auth.signOut({
        scope: "local",
      });

      return navigateTo({
        path: "/",
        query: {
          reason: "profile-not-found",
        },
      });
    }

    const destination =
      getAccountDestination(profile);

    if (
      profile.account_status !== "active"
      && to.path !== destination
    ) {
      return navigateTo(destination);
    }

    if (
      requiredRole
      && profile.role !== requiredRole
    ) {
      return navigateTo(destination);
    }

    if (
      guestOnlyPaths.has(to.path)
      && profile.account_status === "active"
    ) {
      return navigateTo(destination);
    }

    if (
      callbackAndStatusPaths.has(to.path)
      && profile.account_status === "active"
      && to.path !== "/reset-password"
      && to.path !== "/confirm"
    ) {
      return navigateTo(destination);
    }
  },
);
