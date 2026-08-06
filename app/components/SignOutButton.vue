<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    block?: boolean;
    compact?: boolean;
    variant?:
      | "solid"
      | "outline"
      | "soft"
      | "ghost";
  }>(),
  {
    block:
      false,
    compact:
      false,
    variant:
      "ghost",
  },
);

const supabase =
  useSupabaseClient();

const modalOpen =
  ref(false);

const isSigningOut =
  ref(false);

const errorMessage =
  ref("");

async function signOut(): Promise<void> {
  isSigningOut.value =
    true;

  errorMessage.value =
    "";

  try {
    const {
      error,
    } = await supabase.auth.signOut({
      scope:
        "local",
    });

    if (error) {
      throw error;
    }

    const {
      clearProfile,
    } = useCurrentProfile();

    clearProfile();

    modalOpen.value =
      false;

    await navigateTo("/");
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : "Unable to sign out.";
  } finally {
    isSigningOut.value =
      false;
  }
}
</script>

<template>
  <div>
    <UTooltip
      :text="
        compact
          ? 'Sign out'
          : undefined
      "
      :disabled="
        !compact
      "
    >
      <UButton
        color="neutral"
        :variant="variant"
        icon="i-lucide-log-out"
        :block="block"
        :square="compact"
        :aria-label="
          compact
            ? 'Sign out'
            : undefined
        "
        @click="
          modalOpen = true
        "
      >
        <span v-if="!compact">
          Sign out
        </span>
      </UButton>
    </UTooltip>

    <ConfirmationModal
      v-model:open="modalOpen"
      title="Sign out of SNCBT Assess?"
      description="You will return to the sign-in page. Unsaved information on the current page may be lost."
      confirm-label="Yes, Sign Out"
      confirm-color="error"
      icon="i-lucide-log-out"
      :loading="isSigningOut"
      :dismissible="
        !isSigningOut
      "
      @confirm="signOut"
    >
      <UAlert
        v-if="errorMessage"
        class="mt-4"
        color="error"
        variant="soft"
        title="Sign-out unsuccessful"
        :description="errorMessage"
      />
    </ConfirmationModal>
  </div>
</template>
