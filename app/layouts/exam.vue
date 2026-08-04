<template>
  <div class="min-h-screen bg-muted/30">
    <header class="border-b border-default bg-default">
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
