<script setup lang="ts">
withDefaults(
  defineProps<{
    block?: boolean;
    variant?: "solid" | "outline" | "soft" | "ghost";
  }>(),
  {
    block: false,
    variant: "outline",
  },
);

const supabase = useSupabaseClient();

const isSigningOut = ref(false);
const errorMessage = ref("");

async function signOut(): Promise<void> {
  isSigningOut.value = true;
  errorMessage.value = "";

  try {
    const {
      error,
    } = await supabase.auth.signOut({
      scope: "local",
    });

    if (error) {
      throw error;
    }

    const {
      clearProfile,
    } = useCurrentProfile();

    clearProfile();

    await navigateTo("/");
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : "Unable to sign out.";
  } finally {
    isSigningOut.value = false;
  }
}
</script>

<template>
  <div>
    <UButton
      color="neutral"
      :variant="variant"
      icon="i-lucide-log-out"
      :block="block"
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
