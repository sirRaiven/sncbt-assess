import { getAccountDestination } from "~/utils/auth-navigation";

export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser();

  if (!user.value) {
    return navigateTo({
      path: "/",
      query: {
        redirect: to.fullPath,
      },
    });
  }

  const { loadProfile } = useCurrentProfile();
  const profile = await loadProfile();

  if (!profile) {
    return navigateTo({
      path: "/",
      query: {
        reason: "account-incomplete",
      },
    });
  }

  if (profile.account_status !== "active") {
    const destination = getAccountDestination(profile);

    if (to.path !== destination) {
      return navigateTo(destination);
    }
  }
});