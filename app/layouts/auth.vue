<template>
  <div class="academic-grid min-h-screen bg-muted/30">
    <header class="border-b border-default bg-default/90 backdrop-blur">
      <UContainer class="flex h-16 items-center justify-between">
        <NuxtLink to="/">
          <BrandMark />
        </NuxtLink>
        <UColorModeButton />
      </UContainer>
    </header>
    <main class="flex min-h-[calc(100vh-4rem)] items-center">
      <UContainer class="py-8 sm:py-12">
        <slot />
      </UContainer>
    </main>
  </div>
</template>
