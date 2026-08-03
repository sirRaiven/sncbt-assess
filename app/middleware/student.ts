import { getAccountDestination } from "~/utils/auth-navigation";

export default defineNuxtRouteMiddleware(async () => {
  const { loadProfile } = useCurrentProfile();
  const profile = await loadProfile();

  if (!profile) {
    return navigateTo("/login");
  }

  if (
    profile.account_status !== "active"
    || profile.role !== "student"
  ) {
    return navigateTo(getAccountDestination(profile));
  }
});