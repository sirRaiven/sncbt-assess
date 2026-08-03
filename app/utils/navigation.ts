import type { AppRole, NavigationItem } from '~/types/ui'
const items: Record<AppRole, NavigationItem[]> = {
  admin: [
    {label:'Overview',icon:'i-lucide-layout-dashboard',to:'/admin/dashboard'},
    {label:'User Accounts',icon:'i-lucide-users',to:'/admin/users'},
    {label:'Classes',icon:'i-lucide-school',to:'/admin/classes'},
    {label:'Assessments',icon:'i-lucide-clipboard-check',to:'/admin/assessments'},
    {label:'Live Sessions',icon:'i-lucide-radio',to:'/admin/live-sessions'},
    {label:'Audit Logs',icon:'i-lucide-scroll-text',to:'/admin/audit-logs'},
    {label:'System Settings',icon:'i-lucide-settings',to:'/admin/settings'}
  ],
  instructor: [
    {label:'Overview',icon:'i-lucide-layout-dashboard',to:'/instructor/dashboard'},
    {label:'My Classes',icon:'i-lucide-school',to:'/instructor/classes'},
    {label:'Assessments',icon:'i-lucide-clipboard-list',to:'/instructor/assessments'},
    {label:'Live Sessions',icon:'i-lucide-radio-tower',to:'/instructor/sessions'},
    {label:'Reports',icon:'i-lucide-chart-no-axes-combined',to:'/instructor/reports'},
    {label:'My Profile',icon:'i-lucide-user-round',to:'/instructor/profile'}
  ],
  student: [
    {label:'Overview',icon:'i-lucide-layout-dashboard',to:'/student/dashboard'},
    {label:'My Classes',icon:'i-lucide-book-open',to:'/student/classes'},
    {label:'Join Session',icon:'i-lucide-log-in',to:'/student/sessions/join'},
    {label:'My Results',icon:'i-lucide-trophy',to:'/student/results'},
    {label:'My Profile',icon:'i-lucide-user-round',to:'/student/profile'}
  ]
}
export const getNavigation=(role:AppRole)=>items[role]
export const getRoleLabel=(role:AppRole)=>({admin:'System Administrator',instructor:'Instructor',student:'Student'}[role])
