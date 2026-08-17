import type {
  InstructorSessionDetail,
  InstructorSessionItem,
  LiveSessionMode,
  SessionCreationOptions,
  StudentSessionDetail,
} from "~/types/assessment-session";

import {
  parseUserFacingFunctionError,
} from "~/utils/user-facing-error";

interface FunctionResult<T> {
  data: T | null;
  error: string | null;
  code: string | null;
}

interface MessageResponse {
  message: string;
}

export function useAssessmentSessions() {
  const supabase = useSupabaseClient();

  async function parseFunctionError(
    error: unknown,
  ): Promise<{
    message: string;
    code: string | null;
  }> {
    return await parseUserFacingFunctionError(
      error,
      "We couldn't load or update the live session right now. Please try again.",
    );
  }

  async function invoke<T>(
    action: string,
    payload?: Record<string, unknown>,
  ): Promise<FunctionResult<T>> {
    try {
      const {
        data,
        error,
      } = await supabase.functions.invoke<T>(
        "assessment-sessions",
        {
          body: payload
            ? {
                action,
                payload,
              }
            : {
                action,
              },
        },
      );

      if (error) {
        const parsed =
          await parseFunctionError(error);

        return {
          data: null,
          error: parsed.message,
          code: parsed.code,
        };
      }

      return {
        data,
        error: null,
        code: null,
      };
    } catch (error) {
      const parsed =
        await parseFunctionError(error);

      return {
        data: null,
        error: parsed.message,
        code: parsed.code,
      };
    }
  }

  async function listSessionOptions() {
    return await invoke<SessionCreationOptions>(
      "list-session-options",
    );
  }

  async function listInstructorSessions() {
    return await invoke<{
      sessions: InstructorSessionItem[];
    }>(
      "list-instructor-sessions",
    );
  }

  async function getInstructorSession(
    sessionId: string,
  ) {
    return await invoke<{
      detail: InstructorSessionDetail;
    }>(
      "get-instructor-session",
      {
        sessionId,
      },
    );
  }

  async function createSession(
    input: {
      assessmentId: string;
      classroomId: string;
      sessionMode: LiveSessionMode;
      allowLateJoin: boolean;
      showLeaderboard: boolean;
    },
  ) {
    return await invoke<
      MessageResponse & {
        detail: InstructorSessionDetail;
      }
    >(
      "create-session",
      input,
    );
  }

  async function startSession(
    sessionId: string,
  ) {
    return await invoke<
      MessageResponse & {
        detail: InstructorSessionDetail;
      }
    >(
      "start-session",
      {
        sessionId,
      },
    );
  }

  async function endSession(
    sessionId: string,
  ) {
    return await invoke<
      MessageResponse & {
        detail: InstructorSessionDetail;
      }
    >(
      "end-session",
      {
        sessionId,
      },
    );
  }

  async function cancelSession(
    sessionId: string,
  ) {
    return await invoke<
      MessageResponse & {
        detail: InstructorSessionDetail;
      }
    >(
      "cancel-session",
      {
        sessionId,
      },
    );
  }

  async function removeParticipant(
    sessionId: string,
    participantId: string,
  ) {
    return await invoke<
      MessageResponse & {
        detail: InstructorSessionDetail;
      }
    >(
      "remove-participant",
      {
        sessionId,
        participantId,
      },
    );
  }

  async function joinSession(
    sessionCode: string,
  ) {
    return await invoke<
      MessageResponse & {
        detail: StudentSessionDetail;
      }
    >(
      "join-session",
      {
        sessionCode,
      },
    );
  }

  async function getStudentSession(
    sessionId: string,
  ) {
    return await invoke<{
      detail: StudentSessionDetail;
    }>(
      "get-student-session",
      {
        sessionId,
      },
    );
  }

  async function leaveLobby(
    sessionId: string,
  ) {
    return await invoke<MessageResponse>(
      "leave-lobby",
      {
        sessionId,
      },
    );
  }

  return {
    listSessionOptions,
    listInstructorSessions,
    getInstructorSession,
    createSession,
    startSession,
    endSession,
    cancelSession,
    removeParticipant,
    joinSession,
    getStudentSession,
    leaveLobby,
  };
}
