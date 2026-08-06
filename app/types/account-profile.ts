import type {
  Profile,
  UserRole,
} from "~/types/profile";

export interface AccountProfileUpdateInput {
  firstName: string;
  middleName: string | null;
  lastName: string;
  avatarUrl: string | null;
}

export interface AccountProfileUpdateResponse {
  message: string;
  profile: Profile;
}

export interface ProfileRolePresentation {
  role: UserRole;
  label: string;
  description: string;
  icon: string;
}
