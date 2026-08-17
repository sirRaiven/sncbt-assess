<template>
  <div class="app-shell min-h-screen">
    <header class="border-b border-default/70 bg-default/92 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-xl dark:shadow-black/10">
      <UContainer class="flex h-17 items-center justify-between">
        <BrandMark />
        <div class="flex items-center gap-3">
          <UBadge
            color="info"
            variant="soft"
          >
            Examination in progress
          </UBadge>
          <UColorModeButton />
        </div>
      </UContainer>
    </header>
    <main>
      <slot />
    </main>
  </div>
</template>
