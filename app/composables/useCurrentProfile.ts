import type {
  Profile,
} from "~/types/profile";

import {
  toUserFacingError,
} from "~/utils/user-facing-error";

interface LoadProfileOptions {
  force?: boolean;
  userId?: string;
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
    const userId =
      options.userId
      ?? user.value?.sub;

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
        console.error(
          "Unable to load the authenticated profile.",
          {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            userId,
          },
        );

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
        toUserFacingError(
          error,
          "We couldn't load your account information right now. Please try again.",
        );

      return null;
    } finally {
      isLoadingProfile.value = false;
    }
  }

  function setProfile(
    value: Profile,
  ): void {
    profile.value = value;
    profileError.value = null;
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
    setProfile,
    clearProfile,
  };
}
