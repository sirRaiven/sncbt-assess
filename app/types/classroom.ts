export type ClassroomStatus =
  | "active"
  | "archived";

export type MembershipStatus =
  | "pending"
  | "active"
  | "rejected"
  | "removed"
  | "left";

export interface MembershipCounts {
  pending: number;
  active: number;
  rejected: number;
  removed: number;
  left: number;
}

export interface Classroom {
  id: string;
  instructor_id: string;
  name: string;
  subject_code: string;
  section: string;
  description: string | null;
  school_year: string;
  semester: string;
  join_code: string;
  join_enabled: boolean;
  join_requires_approval?: boolean;
  status: ClassroomStatus;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}


export interface ClassroomEnrollmentSettings {
  joinEnabled: boolean;
  requiresApproval: boolean;
  pendingCount: number;
}

export interface ClassroomEnrollmentApprovalUpdate {
  requiresApproval: boolean;
  pendingCount: number;
}

export interface InstructorClassroom
  extends Classroom {
  memberCounts: MembershipCounts;
}

export interface ClassroomMemberStudent {
  id: string;
  name: string;
  email: string | null;
  studentNumber: string | null;
  avatarUrl: string | null;
  accountStatus: string | null;
}

export interface ClassroomMember {
  id: string;
  classroom_id: string;
  student_id: string;
  membership_status: MembershipStatus;
  requested_at: string;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  removed_at: string | null;
  left_at: string | null;
  created_at: string;
  updated_at: string;
  student: ClassroomMemberStudent;
}

export interface StudentClassMembership {
  id: string;
  classroom_id: string;
  student_id: string;
  membership_status: MembershipStatus;
  requested_at: string;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  removed_at: string | null;
  left_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstructorSummary {
  id: string;
  name: string;
}

export interface StudentClassListItem {
  membership: StudentClassMembership;
  classroom: Classroom;
  instructor: InstructorSummary;
}

export interface ClassroomFormInput {
  name: string;
  subjectCode: string;
  section: string;
  description: string | null;
  schoolYear: string;
  semester:
    | "First Semester"
    | "Second Semester"
    | "Summer";
  joinEnabled: boolean;
}
