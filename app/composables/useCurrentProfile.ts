import type { Profile } from "~/types/profile";

interface LoadProfileOptions {
  force?: boolean;
}

export function useCurrentProfile() {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();

  const profile = useState<Profile | null>(
    "current-user-profile",
    () => null,
  );

  const isLoadingProfile = useState<boolean>(
    "current-user-profile-loading",
    () => false,
  );

  const profileError = useState<string | null>(
    "current-user-profile-error",
    () => null,
  );

  async function loadProfile(
    options: LoadProfileOptions = {},
  ): Promise<Profile | null> {
    /*
     * @nuxtjs/supabase v2 returns JWT claims.
     * The authenticated user's UUID is stored in `sub`.
     */
    const userId = user.value?.sub;

    if (!userId) {
      clearProfile();
      return null;
    }

    if (
      !options.force
      && profile.value?.id === userId
    ) {
      return profile.value;
    }

    isLoadingProfile.value = true;
    profileError.value = null;

    try {
      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Unable to load profile:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          userId,
        });

        throw error;
      }

      if (!data) {
        profile.value = null;
        profileError.value =
          "No application profile was found for this account.";

        return null;
      }

      profile.value = data as Profile;

      return profile.value;
    } catch (error) {
      profile.value = null;

      profileError.value =
        error instanceof Error
          ? error.message
          : "Unable to load your account profile.";

      return null;
    } finally {
      isLoadingProfile.value = false;
    }
  }

  function clearProfile(): void {
    profile.value = null;
    profileError.value = null;
    isLoadingProfile.value = false;
  }

  return {
    profile,
    profileError,
    isLoadingProfile,
    loadProfile,
    clearProfile,
  };
}