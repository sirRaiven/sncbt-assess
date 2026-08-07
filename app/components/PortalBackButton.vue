<script setup lang="ts">
interface PortalHistoryState {
  back?: unknown;
}

const props = withDefaults(
  defineProps<{
    fallbackTo: string;
    label?: string;
    useHistory?: boolean;
  }>(),
  {
    label:
      "Back",
    useHistory:
      true,
  },
);

const route =
  useRoute();

const router =
  useRouter();

const accessibleLabel =
  computed(
    () =>
      props.label
      === "Back"
        ? "Go back to the previous page"
        : props.label,
  );

function safePortalBackPath():
  string | null {
  if (
    !import.meta.client
    || !props.useHistory
  ) {
    return null;
  }

  const historyState =
    window.history.state as PortalHistoryState | null;

  const back =
    typeof historyState?.back
      === "string"
      ? historyState.back
      : null;

  if (
    !back
    || back === route.fullPath
    || back === route.path
  ) {
    return null;
  }

  const portal =
    route.path
      .split("/")
      .filter(Boolean)[0];

  if (
    !portal
    || ![
      "admin",
      "instructor",
      "student",
    ].includes(
      portal,
    )
  ) {
    return null;
  }

  const portalRoot =
    `/${portal}`;

  if (
    back !== portalRoot
    && !back.startsWith(
      `${portalRoot}/`,
    )
  ) {
    return null;
  }

  return back;
}

async function goBack():
  Promise<void> {
  if (
    safePortalBackPath()
  ) {
    router.back();

    return;
  }

  await navigateTo(
    props.fallbackTo,
  );
}
</script>

<template>
  <nav
    class="no-print flex min-h-10 items-center"
    aria-label="Page navigation"
  >
    <UButton
      type="button"
      color="neutral"
      variant="ghost"
      size="sm"
      icon="i-lucide-arrow-left"
      class="-ml-2 min-h-10 px-2.5 font-bold"
      :aria-label="accessibleLabel"
      @click="goBack"
    >
      {{ label }}
    </UButton>
  </nav>
</template>
