import type {
  Account,
  AdminProfile,
  InstructorProfile,
  Profile,
  ProfileLoadIssue,
  StudentProfile,
  UserRole,
} from "~/types/profile";

import {
  toUserFacingError,
} from "~/utils/user-facing-error";

interface LoadProfileOptions {
  force?: boolean;
  userId?: string;
}

type RoleProfile =
  | StudentProfile
  | InstructorProfile
  | AdminProfile;

function resolveProfileRole(
  account: Account,
): UserRole {
  return account.account_status === "active"
    ? account.role
    : account.requested_role;
}

function flattenProfile(
  account: Account,
  roleProfile: RoleProfile | null,
): Profile {
  const base: Profile = {
    ...account,
    first_name:
      roleProfile?.first_name
      ?? null,
    middle_name:
      roleProfile?.middle_name
      ?? null,
    last_name:
      roleProfile?.last_name
      ?? null,
    avatar_url:
      roleProfile?.avatar_url
      ?? null,
    student_number:
      null,
    employee_number:
      null,
  };

  if (
    roleProfile
    && "student_number" in roleProfile
  ) {
    base.student_number =
      roleProfile.student_number;
  }

  if (
    roleProfile
    && "employee_number" in roleProfile
  ) {
    base.employee_number =
      roleProfile.employee_number;
  }

  return base;
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

  const profileLoadIssue = useState<ProfileLoadIssue>(
    "current-user-profile-load-issue",
    () => null,
  );

  async function loadRoleProfile(
    account: Account,
  ): Promise<RoleProfile | null> {
    const role = resolveProfileRole(account);

    if (role === "student") {
      const {
        data,
        error,
      } = await supabase
        .from("student_profiles")
        .select("*")
        .eq("user_id", account.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    }

    if (role === "instructor") {
      const {
        data,
        error,
      } = await supabase
        .from("instructor_profiles")
        .select("*")
        .eq("user_id", account.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    }

    const {
      data,
      error,
    } = await supabase
      .from("admin_profiles")
      .select("*")
      .eq("user_id", account.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

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
    profileLoadIssue.value = null;

    try {
      const {
        data: account,
        error: accountError,
      } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (accountError) {
        profileLoadIssue.value =
          "temporary-error";

        throw accountError;
      }

      if (!account) {
        profile.value = null;
        profileLoadIssue.value =
          "account-missing";
        profileError.value =
          "Your SNCBT Assess account setup is incomplete.";

        return null;
      }

      const roleProfile =
        await loadRoleProfile(account);

      if (!roleProfile) {
        profile.value = null;
        profileLoadIssue.value =
          "role-profile-missing";
        profileError.value =
          "Your SNCBT Assess profile setup is incomplete.";

        return null;
      }

      profile.value = flattenProfile(
        account,
        roleProfile,
      );
      profileLoadIssue.value = null;

      return profile.value;
    } catch (error) {
      profile.value = null;

      if (!profileLoadIssue.value) {
        profileLoadIssue.value =
          "temporary-error";
      }

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
    profileLoadIssue.value = null;
  }

  function clearProfile(): void {
    profile.value = null;
    profileError.value = null;
    profileLoadIssue.value = null;
    isLoadingProfile.value = false;
  }

  return {
    profile,
    profileError,
    profileLoadIssue,
    isLoadingProfile,
    loadProfile,
    setProfile,
    clearProfile,
  };
}
