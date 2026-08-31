import type { DeliveryAvailabilityStatus } from "~/types/assessment-delivery";

export interface AssessmentScheduleActionAvailability {
  edit: boolean;
  extend: boolean;
  reopen: boolean;
  close: boolean;
}

export function assessmentScheduleActionAvailability(
  status: DeliveryAvailabilityStatus,
): AssessmentScheduleActionAvailability {
  return {
    edit: status === "upcoming",
    extend: status === "upcoming" || status === "open",
    reopen: status === "closed",
    close: status === "upcoming" || status === "open",
  };
}
