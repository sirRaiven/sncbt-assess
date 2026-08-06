<template>
  <div class="academic-grid min-h-screen bg-muted/30">
    <header class="safe-area-top border-b border-default bg-default/90 backdrop-blur-xl">
      <UContainer class="flex min-h-16 items-center justify-between px-3 sm:px-6">
        <NuxtLink
          to="/"
          class="min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20"
          aria-label="Go to SNCBT Assess sign in"
        >
          <BrandMark />
        </NuxtLink>

        <UColorModeButton
          size="lg"
          variant="ghost"
        />
      </UContainer>
    </header>

    <main class="safe-area-bottom flex min-h-[calc(100vh-4rem)] items-center py-5 sm:py-10">
      <UContainer class="w-full px-3 sm:px-6">
        <slot />
      </UContainer>
    </main>
  </div>
</template>
