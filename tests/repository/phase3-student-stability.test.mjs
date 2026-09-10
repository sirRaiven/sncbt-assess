import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return await readFile(new URL(`../../${path}`, import.meta.url), "utf8");
}

test("Student class joining honors the instructor approval setting", async () => {
  const classrooms = await source("supabase/functions/classrooms/index.ts");

  assert.match(classrooms, /const requiresApproval\s*=\s*Boolean\(\s*classroom\.join_requires_approval,?\s*\)/,
    "join-class must derive its membership state from join_requires_approval");
  assert.match(classrooms, /membership_status:\s*membershipStatus/,
    "join-class must persist the derived membership state");
  assert.match(classrooms, /const membershipStatus:[\s\S]*?requiresApproval\s*\?\s*"pending"\s*:\s*"active"/,
    "join-class must activate the Student immediately when approval is disabled");
  assert.match(classrooms, /approved_at:\s*requiresApproval\s*\?\s*null\s*:\s*now/,
    "automatic enrollment must record when the membership became active");
  assert.match(classrooms, /requiresApproval\s*\?\s*"Your request was sent to the instructor\."\s*:\s*"You joined the class successfully\."/,
    "join-class response copy must reflect pending vs immediate enrollment");
});

test("Student class detail pages do not redirect on temporary request failures", async () => {
  for (const path of [
    "app/pages/student/classes/[id].vue",
    "app/pages/student/classes/[id]/classmates.vue",
  ]) {
    const page = await source(path);

    assert.match(page, /classResult\.code\s*===\s*"ACTIVE_MEMBERSHIP_NOT_FOUND"/,
      `${path} must distinguish missing membership from a temporary failure`);
    assert.match(page, /classResult\.code\s*===\s*"CLASSROOM_NOT_AVAILABLE"/,
      `${path} must distinguish an unavailable class from a temporary failure`);
    assert.match(page, /errorMessage\.value\s*=\s*classResult\.error/,
      `${path} must show the sanitized request error in-place`);
  }
});

test("Student-visible timestamps use Philippine Time consistently", async () => {
  const pages = [
    "app/pages/student/dashboard.vue",
    "app/pages/student/classes/[id].vue",
    "app/pages/student/classes/[id]/classmates.vue",
    "app/pages/student/assessments/index.vue",
    "app/pages/student/assessments/[id]/instructions.vue",
    "app/pages/student/assessments/[id]/completed.vue",
    "app/pages/student/archive.vue",
    "app/pages/student/results/index.vue",
    "app/pages/student/results/[id].vue",
  ];

  for (const path of pages) {
    const page = await source(path);
    assert.match(page, /formatPhilippineDateTime/,
      `${path} must format school timestamps in Asia/Manila`);
    assert.doesNotMatch(page, /new Intl\s*\n?\s*\.DateTimeFormat|new Intl\.DateTimeFormat/,
      `${path} must not silently fall back to the device timezone for school timestamps`);
  }
});

test("shared Student class join links are consumed once", async () => {
  const page = await source("app/pages/student/classes/index.vue");
  assert.match(page, /delete\s+nextQuery\.join/,
    "the shared join query must be removed after opening the modal");
  assert.match(page, /router\.replace\(\{\s*query:\s*nextQuery/s,
    "consuming the shared join code must update the URL without another navigation entry");
});

test("Student load-error surfaces keep a visible retry action on mobile", async () => {
  const dashboard = await source("app/pages/student/dashboard.vue");
  const results = await source("app/pages/student/results/index.vue");
  const instructions = await source("app/pages/student/assessments/[id]/instructions.vue");
  const profile = await source("app/components/student/StudentProfilePage.vue");

  assert.match(dashboard, /title="Overview could not be loaded"[\s\S]*?@click="loadOverview"/,
    "dashboard load error must expose Retry");
  assert.match(results, /title="Results could not be loaded"[\s\S]*?@click="loadResults"/,
    "results load error must expose Retry");
  assert.match(instructions, /title="Assessment could not be loaded"[\s\S]*?@click="loadDelivery"/,
    "assessment instructions load error must expose Retry");
  assert.match(profile, /title="Profile could not be loaded"[\s\S]*?@click="\(\) => loadProfile\(\)"/,
    "Student profile Retry must call loadProfile without forwarding the MouseEvent as load options");
});

test("Student join and attempt-start actions reject duplicate in-flight submissions", async () => {
  const classes = await source("app/pages/student/classes/index.vue");
  const instructions = await source("app/pages/student/assessments/[id]/instructions.vue");

  assert.match(classes, /async function submitJoin[\s\S]*?if \(isJoining\.value\) \{\s*return;\s*\}/,
    "class join must not send a second request while the first is in flight");
  assert.match(instructions, /async function startAttempt[\s\S]*?if \(isStarting\.value\) \{\s*return;\s*\}/,
    "assessment start must not send a second begin-attempt request while one is in flight");
});

test("Student refresh failures preserve already-loaded canonical data", async () => {
  const classPage = await source("app/pages/student/classes/[id].vue");
  const resultPage = await source("app/pages/student/results/[id].vue");
  const archivePage = await source("app/pages/student/archive.vue");

  assert.doesNotMatch(
    classPage,
    /if \(\s*result\.error[\s\S]*?\) \{[\s\S]*?classmates\.value\s*=\s*\[\]/,
    "refreshing classmates must not erase previously loaded classmates on a temporary failure",
  );
  assert.doesNotMatch(
    resultPage,
    /delivery\.value\s*=\s*null;/,
    "retrying a result must not erase an already-loaded result solely because the refresh failed",
  );
  assert.match(
    archivePage,
    /if \(classResult\.data\) \{[\s\S]*?archivedClasses\.value\s*=\s*classResult\.data\.classes/,
    "archive refresh must replace class data only when that request succeeds",
  );
  assert.match(
    archivePage,
    /if \(assessmentResult\.data\) \{[\s\S]*?deliveries\.value\s*=\s*assessmentResult\.data\.deliveries/,
    "archive refresh must replace assessment data only when that request succeeds",
  );
});

test("Student enrollment copy does not promise the wrong approval behavior", async () => {
  const classes = await source("app/pages/student/classes/index.vue");
  const classPage = await source("app/pages/student/classes/[id].vue");
  const classmatesPage = await source("app/pages/student/classes/[id]/classmates.vue");

  assert.doesNotMatch(
    classes,
    /Most classes let you join immediately/,
    "join modal copy must not claim immediate enrollment is the common behavior",
  );
  for (const [path, page] of [
    ["app/pages/student/classes/[id].vue", classPage],
    ["app/pages/student/classes/[id]/classmates.vue", classmatesPage],
  ]) {
    assert.match(
      page,
      /classroom\.join_requires_approval[\s\S]*?rejoin/,
      `${path} must describe rejoining according to the class approval setting`,
    );
  }
});

test("Student class details remain usable when only assessment loading fails", async () => {
  const page = await source("app/pages/student/classes/[id].vue");
  const classAssignment = page.indexOf("classroom.value =\n    classResult.data.classroom");
  const deliveryRequest = page.indexOf("listStudentDeliveries(\n      classroomId.value");

  assert.ok(classAssignment >= 0, "class detail must assign the confirmed classroom payload");
  assert.ok(deliveryRequest >= 0, "class detail must load its assessment deliveries");
  assert.ok(
    classAssignment < deliveryRequest,
    "confirmed class data must be committed before the independent assessment list request",
  );
});
