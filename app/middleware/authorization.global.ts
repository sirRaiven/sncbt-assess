import type {
  AppRole,
} from "~/types/ui";

import {
  getAccountDestination,
  isAppRole,
} from "~/utils/auth-navigation";

import {
  isMaintenanceModeEnabled,
} from "~/utils/maintenance-mode";

const protectedPrefixes: Record<AppRole, string> = {
  admin: "/admin",
  instructor: "/instructor",
  student: "/student",
};

const allowedPortalLayouts: Record<AppRole, Set<string>> = {
  admin: new Set(["admin"]),
  instructor: new Set(["instructor"]),
  student: new Set(["student", "exam"]),
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

const profileIndependentPaths = new Set([
  "/confirm",
  "/reset-password",
]);

const profileIndependentAuthenticatedPaths = new Set([
  "/account-access-error",
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
    const runtimeConfig = useRuntimeConfig();
    const maintenanceModeEnabled =
      isMaintenanceModeEnabled(
        runtimeConfig.public.maintenanceMode,
      );

    if (maintenanceModeEnabled) {
      if (to.path !== "/maintenance") {
        return navigateTo("/maintenance", {
          replace: true,
        });
      }

      return;
    }

    if (to.path === "/maintenance") {
      return navigateTo("/", {
        replace: true,
      });
    }

    const user = useSupabaseUser();
    const requiredRole = getRequiredRole(to.path);

    if (requiredRole) {
      const routeLayout =
        typeof to.meta.layout === "string"
          ? to.meta.layout
          : null;

      if (
        routeLayout
        && !allowedPortalLayouts[requiredRole]
          .has(routeLayout)
      ) {
        console.error(
          `[route-integrity] ${to.path} resolved with unexpected layout "${routeLayout}" for ${requiredRole}.`,
        );

        const safeDestination =
          requiredRole === "student"
            ? "/student/dashboard"
            : requiredRole === "instructor"
              ? "/instructor/dashboard"
              : "/admin/dashboard";

        if (to.path !== safeDestination) {
          return navigateTo({
            path: safeDestination,
            query: {
              reason: "route-integrity",
            },
          });
        }

        return abortNavigation(
          createError({
            statusCode: 500,
            statusMessage: "Portal route configuration mismatch.",
          }),
        );
      }
    }

    if (!user.value) {
      if (
        requiredRole
        || profileIndependentAuthenticatedPaths.has(to.path)
      ) {
        return navigateTo({
          path: "/",
          query: {
            redirect: to.fullPath,
          },
        });
      }

      return;
    }

    const recoveryGate = useCookie<string | null>(
      "sncbt_recovery_gate",
      {
        sameSite: "strict",
        secure: import.meta.env.PROD,
        maxAge: 60 * 60,
      },
    );

    if (
      recoveryGate.value === "1"
      && to.path !== "/reset-password"
    ) {
      return navigateTo({
        path: "/reset-password",
        query: {
          mode: "recovery",
        },
      });
    }

    if (
      profileIndependentPaths.has(to.path)
      || profileIndependentAuthenticatedPaths.has(to.path)
    ) {
      return;
    }

    const {
      loadProfile,
      profileLoadIssue,
    } = useCurrentProfile();

    const profile = await loadProfile();

    if (!profile) {
      if (
        profileLoadIssue.value
        === "temporary-error"
      ) {
        return navigateTo({
          path: "/account-access-error",
          query: {
            redirect: to.fullPath,
          },
        }, {
          replace: true,
        });
      }

      const supabase = useSupabaseClient();

      await supabase.auth.signOut({
        scope: "local",
      });

      return navigateTo({
        path: "/",
        query: {
          reason: "account-incomplete",
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
