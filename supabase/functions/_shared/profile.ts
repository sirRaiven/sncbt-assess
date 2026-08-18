export interface SplitAccountProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  student_number: string | null;
  employee_number: string | null;
  role: string;
  requested_role: string | null;
  account_status: string;
}

interface AccountRow {
  id: string;
  email: string | null;
  role: string;
  requested_role: string | null;
  account_status: string;
}

interface StudentProfileRow {
  user_id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  student_number: string | null;
}

interface InstructorProfileRow {
  user_id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  employee_number: string | null;
}

interface AdminProfileRow {
  user_id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
}

function effectiveRole(account: AccountRow): string {
  return account.account_status === "active"
    ? account.role
    : account.requested_role ?? account.role;
}

export async function fetchSplitProfiles(
  supabaseAdmin: any,
  userIds: string[],
): Promise<{
  data: SplitAccountProfile[];
  error: unknown | null;
}> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return { data: [], error: null };
  }

  const { data: accountData, error: accountError } = await supabaseAdmin
    .from("accounts")
    .select("id,email,role,requested_role,account_status")
    .in("id", uniqueIds);

  if (accountError) {
    return { data: [], error: accountError };
  }

  const accounts = (accountData ?? []) as AccountRow[];
  const studentIds: string[] = [];
  const instructorIds: string[] = [];
  const adminIds: string[] = [];

  for (const account of accounts) {
    switch (effectiveRole(account)) {
      case "student":
        studentIds.push(account.id);
        break;
      case "instructor":
        instructorIds.push(account.id);
        break;
      case "admin":
        adminIds.push(account.id);
        break;
    }
  }

  const studentPromise = studentIds.length > 0
    ? supabaseAdmin
        .from("student_profiles")
        .select("user_id,first_name,middle_name,last_name,student_number")
        .in("user_id", studentIds)
    : Promise.resolve({ data: [], error: null });

  const instructorPromise = instructorIds.length > 0
    ? supabaseAdmin
        .from("instructor_profiles")
        .select("user_id,first_name,middle_name,last_name,employee_number")
        .in("user_id", instructorIds)
    : Promise.resolve({ data: [], error: null });

  const adminPromise = adminIds.length > 0
    ? supabaseAdmin
        .from("admin_profiles")
        .select("user_id,first_name,middle_name,last_name")
        .in("user_id", adminIds)
    : Promise.resolve({ data: [], error: null });

  const [studentResult, instructorResult, adminResult] = await Promise.all([
    studentPromise,
    instructorPromise,
    adminPromise,
  ]);

  const profileError =
    studentResult.error
    ?? instructorResult.error
    ?? adminResult.error
    ?? null;

  if (profileError) {
    return { data: [], error: profileError };
  }

  const studentMap = new Map(
    ((studentResult.data ?? []) as StudentProfileRow[]).map((row) => [
      row.user_id,
      row,
    ]),
  );

  const instructorMap = new Map(
    ((instructorResult.data ?? []) as InstructorProfileRow[]).map((row) => [
      row.user_id,
      row,
    ]),
  );

  const adminMap = new Map(
    ((adminResult.data ?? []) as AdminProfileRow[]).map((row) => [
      row.user_id,
      row,
    ]),
  );

  const profiles = accounts.map((account): SplitAccountProfile => {
    const role = effectiveRole(account);
    const student = studentMap.get(account.id);
    const instructor = instructorMap.get(account.id);
    const admin = adminMap.get(account.id);
    const roleProfile =
      role === "student"
        ? student
        : role === "instructor"
          ? instructor
          : admin;

    return {
      id: account.id,
      email: account.email,
      first_name: roleProfile?.first_name ?? null,
      middle_name: roleProfile?.middle_name ?? null,
      last_name: roleProfile?.last_name ?? null,
      student_number: student?.student_number ?? null,
      employee_number: instructor?.employee_number ?? null,
      role: account.role,
      requested_role: account.requested_role,
      account_status: account.account_status,
    };
  });

  return { data: profiles, error: null };
}

export async function fetchSplitProfile(
  supabaseAdmin: any,
  userId: string,
): Promise<{
  data: SplitAccountProfile | null;
  error: unknown | null;
}> {
  const result = await fetchSplitProfiles(supabaseAdmin, [userId]);

  return {
    data: result.data[0] ?? null,
    error: result.error,
  };
}
