/**
 * Capture Supabase's recovery-only auth event as early as the Nuxt application
 * can subscribe. This protects the reset route even if the event fires before
 * reset-password.vue finishes mounting.
 */
export default defineNuxtPlugin(() => {
  const supabase = useSupabaseClient();

  const recoveryGate = useCookie<string | null>(
    "sncbt_recovery_gate",
    {
      sameSite: "strict",
      secure: import.meta.env.PROD,
      maxAge: 60 * 60,
    },
  );

  supabase.auth.onAuthStateChange(
    (
      event,
      session,
    ) => {
      if (
        event === "PASSWORD_RECOVERY"
        && session?.user
      ) {
        recoveryGate.value = "1";
      }
    },
  );
});
