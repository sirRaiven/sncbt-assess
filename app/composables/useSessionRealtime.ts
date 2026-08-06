import type {
  RealtimeChannel,
} from "@supabase/supabase-js";

export function useSessionRealtime() {
  const supabase = useSupabaseClient();

  const connectionStatus =
    ref("CLOSED");

  let channel:
    | RealtimeChannel
    | null = null;

  let refreshTimer:
    | ReturnType<typeof setTimeout>
    | null = null;

  let pollTimer:
    | ReturnType<typeof setInterval>
    | null = null;

  function scheduleRefresh(
    callback: () => void | Promise<void>,
  ): void {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }

    refreshTimer = setTimeout(
      () => {
        void callback();
      },
      150,
    );
  }

  async function subscribe(
    sessionId: string,
    onChange: () => void | Promise<void>,
  ): Promise<void> {
    await unsubscribe();

    channel = supabase
      .channel(
        `live-session:${sessionId}:${crypto.randomUUID()}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assessment_sessions",
          filter:
            `id=eq.${sessionId}`,
        },
        () => {
          scheduleRefresh(
            onChange,
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_participants",
          filter:
            `session_id=eq.${sessionId}`,
        },
        () => {
          scheduleRefresh(
            onChange,
          );
        },
      )
      .subscribe(
        (status) => {
          connectionStatus.value =
            status;
        },
      );

    pollTimer = setInterval(
      () => {
        void onChange();
      },
      5000,
    );
  }

  async function unsubscribe(): Promise<void> {
    if (refreshTimer) {
      clearTimeout(
        refreshTimer,
      );

      refreshTimer = null;
    }

    if (pollTimer) {
      clearInterval(
        pollTimer,
      );

      pollTimer = null;
    }

    if (!channel) {
      connectionStatus.value =
        "CLOSED";

      return;
    }

    const currentChannel =
      channel;

    channel = null;

    connectionStatus.value =
      "CLOSED";

    await supabase.removeChannel(
      currentChannel,
    );
  }

  onBeforeUnmount(
    () => {
      void unsubscribe();
    },
  );

  return {
    connectionStatus,
    subscribe,
    unsubscribe,
  };
}
