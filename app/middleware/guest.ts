import { getAccountDestination } from "~/utils/auth-navigation";

export default defineNuxtRouteMiddleware(async () => {
  const user = useSupabaseUser();

  if (!user.value) {
    return;
  }

  const { loadProfile } = useCurrentProfile();
  const profile = await loadProfile();

  if (profile) {
    return navigateTo(getAccountDestination(profile));
  }
});