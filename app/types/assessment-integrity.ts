export type AssessmentIntegrityEventType =
  | "tab_hidden"
  | "window_blur"
  | "fullscreen_exit"
  | "copy_attempt"
  | "cut_attempt"
  | "paste_attempt"
  | "context_menu_attempt"
  | "focus_mode_started"
  | "focus_mode_unavailable";

export type AssessmentIntegritySeverity =
  | "info"
  | "low"
  | "medium"
  | "high";

export interface AssessmentIntegrityPolicy {
  assignmentId: string;
  attemptId?: string;
  enabled: boolean;
  focusModeEnabled: boolean;
}

export interface AssessmentIntegrityEventInput {
  id: string;
  eventType: AssessmentIntegrityEventType;
  clientOccurredAt: string;
  questionId: string | null;
  questionIndex: number | null;
  metadata: {
    visibilityState?: string;
    fullscreen?: boolean;
    fullscreenSupported?: boolean;
    online?: boolean;
    viewportWidth?: number;
    viewportHeight?: number;
    source?: string;
  };
}

export interface AssessmentIntegrityReportResult {
  accepted: number;
  monitoringEnabled: boolean;
}

export interface InstructorIntegrityEvent {
  eventType: AssessmentIntegrityEventType;
  severity: AssessmentIntegritySeverity;
  receivedAt: string;
  clientOccurredAt: string | null;
  questionIndex: number | null;
}

export interface InstructorIntegritySummary {
  signalCount: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  latestSignalAt: string | null;
  latestEventType: AssessmentIntegrityEventType | null;
  recentEvents: InstructorIntegrityEvent[];
}
