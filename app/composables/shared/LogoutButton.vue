
import {
  toUserFacingError,
} from "~/utils/user-facing-error";
<script setup lang="ts">
const supabase = useSupabaseClient();

const isSigningOut = ref(false);
const errorMessage = ref("");

async function signOut(): Promise<void> {
  isSigningOut.value = true;
  errorMessage.value = "";

  try {
    const { error } = await supabase.auth.signOut({
      scope: "local",
    });

    if (error) {
      throw error;
    }

    const { clearProfile } = useCurrentProfile();
    clearProfile();

    await navigateTo("/");
  } catch (error) {
    errorMessage.value =
      toUserFacingError(
        error,
        "We couldn't sign you out right now. Check your connection and try again.",
      );
  } finally {
    isSigningOut.value = false;
  }
}
</script>

<template>
  <div>
    <UButton
      color="neutral"
      variant="outline"
      icon="i-lucide-log-out"
      :loading="isSigningOut"
      @click="signOut"
    >
      Sign Out
    </UButton>

    <p
      v-if="errorMessage"
      class="mt-2 text-sm text-error"
    >
      {{ errorMessage }}
    </p>
  </div>
</template>