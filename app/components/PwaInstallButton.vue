<script setup lang="ts">
const route =
  useRoute();

const nuxtApp =
  useNuxtApp();

const installHelpOpen =
  ref(false);

const installing =
  ref(false);

const updating =
  ref(false);

const browserStandalone =
  ref(false);

const isIos =
  ref(false);

const isMac =
  ref(false);

function reactiveBoolean(
  value: unknown,
): boolean {
  if (
    value
    && typeof value
      === "object"
    && "value" in value
  ) {
    return Boolean(
      (
        value as {
          value?: unknown;
        }
      ).value,
    );
  }

  return Boolean(value);
}

const pwa =
  computed(
    () =>
      nuxtApp.$pwa,
  );

const installed =
  computed(
    () =>
      browserStandalone.value
      || reactiveBoolean(
        pwa.value
          ?.isPWAInstalled,
      ),
  );

const installPromptAvailable =
  computed(
    () =>
      reactiveBoolean(
        pwa.value
          ?.showInstallPrompt,
      ),
  );

const updateAvailable =
  computed(
    () =>
      reactiveBoolean(
        pwa.value
          ?.needRefresh,
      ),
  );

const isAssessmentInProgress =
  computed(
    () =>
      /^\/student\/assessments\/[^/]+\/play\/?$/
        .test(
          route.path,
        ),
  );

const showAction =
  computed(
    () =>
      Boolean(
        pwa.value,
      )
      && !isAssessmentInProgress.value
      && (
        updateAvailable.value
        || !installed.value
      ),
  );

const buttonLabel =
  computed(
    () =>
      updateAvailable.value
        ? "Update app"
        : "Install app",
  );

const buttonIcon =
  computed(
    () =>
      updateAvailable.value
        ? "i-lucide-refresh-cw"
        : "i-lucide-download",
  );

const instructionTitle =
  computed(
    () => {
      if (isIos.value) {
        return "Install on iPhone or iPad";
      }

      if (isMac.value) {
        return "Install on this Mac";
      }

      return "Install on this device";
    },
  );

const instructionSteps =
  computed(
    () => {
      if (isIos.value) {
        return [
          "Open SNCBT Assess in Safari.",
          "Tap the Share button.",
          "Choose Add to Home Screen, then tap Add.",
        ];
      }

      if (isMac.value) {
        return [
          "Open your browser menu.",
          "Choose Install App or Add to Dock if it is available.",
          "Confirm the installation.",
        ];
      }

      return [
        "Open your browser menu.",
        "Choose Install App or Add to Home screen.",
        "Confirm the installation.",
      ];
    },
  );

async function handleAction():
  Promise<void> {
  if (!pwa.value) {
    return;
  }

  if (updateAvailable.value) {
    updating.value =
      true;

    try {
      await pwa.value
        .updateServiceWorker(
          true,
        );
    } finally {
      updating.value =
        false;
    }

    return;
  }

  if (installed.value) {
    return;
  }

  if (
    installPromptAvailable.value
  ) {
    installing.value =
      true;

    try {
      await pwa.value
        .install();
    } catch {
      installHelpOpen.value =
        true;
    } finally {
      installing.value =
        false;
    }

    return;
  }

  installHelpOpen.value =
    true;
}

onMounted(
  () => {
    browserStandalone.value =
      window.matchMedia(
        "(display-mode: standalone)",
      ).matches
      || Boolean(
        (
          navigator as Navigator & {
            standalone?: boolean;
          }
        ).standalone,
      );

    const userAgent =
      navigator.userAgent
        .toLowerCase();

    isIos.value =
      /iphone|ipad|ipod/
        .test(userAgent);

    isMac.value =
      /macintosh|mac os x/
        .test(userAgent)
      && !isIos.value;
  },
);
</script>

<template>
  <template v-if="showAction">
    <UButton
      type="button"
      color="neutral"
      variant="ghost"
      :icon="buttonIcon"
      size="lg"
      :loading="installing || updating"
      :aria-label="buttonLabel"
      class="!px-2.5 sm:!px-3"
      @click="handleAction"
    >
      <span class="hidden text-sm font-semibold sm:inline">
        {{ buttonLabel }}
      </span>
    </UButton>

    <UModal
      v-model:open="installHelpOpen"
      :ui="{
        content:
          'w-[calc(100%-1rem)] sm:max-w-md',
      }"
    >
      <template #content>
        <section class="p-5 sm:p-6">
          <div class="flex items-start gap-4 pr-8">
            <div class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UIcon
                name="i-lucide-smartphone"
                class="size-6"
              />
            </div>

            <div class="min-w-0">
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                SNCBT Assess
              </p>

              <h2 class="mt-1 text-xl font-black text-highlighted">
                {{ instructionTitle }}
              </h2>

              <p class="mt-2 text-sm leading-6 text-muted">
                Installing the app gives you a convenient shortcut and opens SNCBT Assess in its own app window.
              </p>
            </div>
          </div>

          <ol class="mt-5 space-y-3">
            <li
              v-for="(step, index) in instructionSteps"
              :key="step"
              class="flex items-start gap-3 rounded-xl border border-default bg-elevated/30 p-3"
            >
              <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
                {{ index + 1 }}
              </span>

              <p class="pt-0.5 text-sm leading-5 text-muted">
                {{ step }}
              </p>
            </li>
          </ol>

          <UAlert
            class="mt-4"
            color="info"
            variant="soft"
            icon="i-lucide-wifi"
            title="Internet connection is still required"
            description="Signing in, taking assessments, saving answers, and loading current records still use the online SNCBT Assess service."
          />

          <p class="mt-4 text-xs leading-5 text-muted">
            Installation options depend on the browser and device. If no install option is shown, you can continue using SNCBT Assess normally in your browser.
          </p>

          <div class="mt-5 flex justify-end">
            <UButton
              type="button"
              color="neutral"
              variant="soft"
              @click="installHelpOpen = false"
            >
              Done
            </UButton>
          </div>
        </section>
      </template>
    </UModal>
  </template>
</template>
