<template>
  <div class="academic-grid flex min-h-screen flex-col">
    <header class="safe-area-top border-b border-default/70 bg-default/88 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-xl dark:shadow-black/10">
      <UContainer class="flex min-h-16 items-center justify-between px-3 sm:px-6">
        <NuxtLink
          to="/"
          class="min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20"
          aria-label="Go to SNCBT Assess sign in"
        >
          <BrandMark />
        </NuxtLink>

        <div class="flex items-center gap-1 sm:gap-2">
          <ClientOnly>
            <PwaInstallButton />
          </ClientOnly>

          <UColorModeButton
            size="lg"
            variant="ghost"
          />
        </div>
      </UContainer>
    </header>

    <main class="flex flex-1 items-center py-5 sm:py-10">
      <UContainer class="w-full px-3 sm:px-6">
        <slot />
      </UContainer>
    </main>

    <footer class="safe-area-bottom border-t border-default/70 bg-default/82 shadow-[0_-8px_24px_rgba(15,23,42,0.025)] backdrop-blur-xl dark:shadow-black/10">
      <UContainer class="flex min-h-12 items-center justify-center px-3 sm:px-6">
        <AppVersion class="max-w-40" />
      </UContainer>
    </footer>
  </div>
</template>
