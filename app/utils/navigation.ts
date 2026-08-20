import type {
  AppRole,
  NavigationItem,
} from "~/types/ui";

const items: Record<
  AppRole,
  NavigationItem[]
> = {
  admin: [
    {
      label:
        "Overview",
      icon:
        "i-lucide-layout-dashboard",
      to:
        "/admin/dashboard",
    },
    {
      label:
        "User Accounts",
      icon:
        "i-lucide-users",
      to:
        "/admin/users",
    },
    {
      label:
        "Classes",
      icon:
        "i-lucide-school",
      to:
        "/admin/classes",
    },
    {
      label:
        "Assessments",
      icon:
        "i-lucide-clipboard-check",
      to:
        "/admin/assessments",
    },
    {
      label:
        "Live Sessions",
      icon:
        "i-lucide-radio",
      to:
        "/admin/live-sessions",
    },
    {
      label:
        "Audit Logs",
      icon:
        "i-lucide-scroll-text",
      to:
        "/admin/audit-logs",
    },
    {
      label:
        "System Settings",
      icon:
        "i-lucide-settings",
      to:
        "/admin/settings",
    },
  ],

  instructor: [
    {
      label:
        "Overview",
      icon:
        "i-lucide-layout-dashboard",
      to:
        "/instructor/dashboard",
    },
    {
      label:
        "My Classes",
      icon:
        "i-lucide-school",
      to:
        "/instructor/classes",
    },
    {
      label:
        "Assessments",
      icon:
        "i-lucide-clipboard-list",
      to:
        "/instructor/assessments",
    },
    {
      label:
        "Student Progress",
      icon:
        "i-lucide-users",
      to:
        "/instructor/student-progress",
    },
    {
      label:
        "Live Sessions",
      icon:
        "i-lucide-radio-tower",
      to:
        "/instructor/sessions",
    },
    {
      label:
        "Archive",
      icon:
        "i-lucide-archive",
      to:
        "/instructor/archive",
    },
    {
      label:
        "Reports",
      icon:
        "i-lucide-chart-no-axes-combined",
      to:
        "/instructor/reports",
    },
  ],

  student: [
    {
      label:
        "Overview",
      icon:
        "i-lucide-layout-dashboard",
      to:
        "/student/dashboard",
    },
    {
      label:
        "My Classes",
      icon:
        "i-lucide-book-open",
      to:
        "/student/classes",
    },
    {
      label:
        "Assessments",
      icon:
        "i-lucide-clipboard-list",
      to:
        "/student/assessments",
    },
    {
      label:
        "My Results",
      icon:
        "i-lucide-trophy",
      to:
        "/student/results",
    },
  ],
};

export const getNavigation = (
  role: AppRole,
): NavigationItem[] =>
  items[role];

export const getRoleLabel = (
  role: AppRole,
): string => ({
  admin:
    "System Administrator",
  instructor:
    "Instructor",
  student:
    "Student",
})[role];
