# Phase 2 Authentication, Identity & Account Governance Design

## Goal

Allow both Student and Instructor users to self-register without administrator approval while preventing duplicate SNCBT identities and keeping authorization roles server-controlled.

## Approved Policy

- Student and Instructor registration are self-service.
- New valid Student and Instructor accounts use `account_status = active` immediately after Auth account creation; email confirmation remains required when Supabase Confirm Email is enabled.
- Registration must reject a duplicate normalized email, Student Number, or Employee Number before attempting `auth.signUp`.
- A rejected duplicate attempt must not create a new Auth credential, `accounts` row, or split profile row.
- Public registration may never request or create `admin` or another privileged role.
- Existing active accounts are preserved.
- Existing pending Instructor accounts with a valid Instructor profile are promoted to active because the system no longer has an approval workflow.
- New classes require instructor approval for class-code enrollment by default. Instructors may explicitly turn approval off later.

## Architecture

The browser sends only non-secret identity fields to a new public `auth-register-check` Edge Function before sending a password to Supabase Auth. The Edge Function uses the service role to call a service-role-only PostgreSQL function that checks `auth.users`, `accounts`, `student_profiles`, and `instructor_profiles` for normalized conflicts. If clear, the browser calls normal Supabase `auth.signUp`, preserving built-in confirmation-email behavior and keeping passwords out of the custom Edge Function.

The Auth trigger remains the final server-side authority for role creation. It accepts only `student` or `instructor` from user metadata and treats Admin as trusted only when `raw_app_meta_data.role = 'admin'`. Phase 2 changes Instructor signups from pending/student fallback to active/instructor. Existing unique constraints on Student Number and Employee Number remain the race-condition backstop.

## Duplicate Rules

Normalize email with `lower(btrim(...))`, Student Number with `btrim(...)`, and Employee Number with `upper(btrim(...))`.

A registration is rejected if any of the following is already present:

1. normalized email in `auth.users` or `public.accounts`;
2. Student Number in `public.student_profiles`;
3. Employee Number in `public.instructor_profiles`.

The UI receives one generic conflict response: `An account already exists for the provided registration information. Please sign in or use password recovery.` It does not reveal which identifier matched.

## Race Safety

`student_profiles.student_number` and `instructor_profiles.employee_number` already have unique indexes, while Supabase Auth owns email uniqueness. If two registrations race after both prechecks pass, database/Auth uniqueness must reject the loser. The registration UI must treat duplicate/unique errors as a conflict rather than success.

## Email Confirmation

The browser continues to use `supabase.auth.signUp()` after the precheck. Therefore Supabase's existing Confirm Email project setting continues to control whether a confirmation email is required. The new Edge Function does not receive or store the password.

## Class Enrollment Default

`classrooms.join_requires_approval` changes from `false` to `true`. The Instructor create-class form also starts with `requireApproval = true`, and the create-class Edge Function writes `join_requires_approval: true` directly when creating a class. If joining is disabled, approval is irrelevant and may remain false in UI state.

## Deployment

Phase 2 requires:

- one SQL migration;
- deployment of the new `auth-register-check` Edge Function with JWT verification disabled because registration is public;
- deployment of the modified `classrooms` Edge Function because class creation default behavior changes;
- Cloudflare/Nuxt redeployment for the registration UI and local class-create default.

The production maintenance gate remains enabled throughout deployment and verification.
