<script setup lang="ts">
import type { AppRole } from "~/types/ui";
import { getNavigation, getRoleLabel, } from "~/utils/navigation";
const props = defineProps<{
    role: AppRole;
}>();
const route = useRoute();
const mobileOpen = ref(false);
const navigation = computed(() => getNavigation(props.role));
const roleLabel = computed(() => getRoleLabel(props.role));
const accounts = {
    admin: {
        name: "Raiven Supan",
        detail: "System Administrator",
        initials: "RS",
    },
    instructor: {
        name: "Prof. Raiven Supan",
        detail: "IT Instructor",
        initials: "RS",
    },
    student: {
        name: "Angela Cruz",
        detail: "BSIT 2A",
        initials: "AC",
    },
};
const account = computed(() => accounts[props.role]);
function isActive(path: string): boolean {
    if (route.path === path) {
        return true;
    }
    const dashboardPath = `/${props.role}/dashboard`;
    return path !== dashboardPath
        && route.path.startsWith(`${path}/`);
}
watch(() => route.fullPath, () => {
    mobileOpen.value = false;
});
</script>

<template>
  <div class="min-h-screen bg-muted/30">
    <button
      v-if="mobileOpen"
      type="button"
      class="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm lg:hidden"
      aria-label="Close navigation"
      @click="mobileOpen = false"
     />
    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-68 flex-col border-r border-white/10 bg-slate-950 text-white shadow-xl transition-transform duration-200 lg:translate-x-0"
      :class="mobileOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="border-b border-white/10 px-5 py-5">
        <BrandMark inverse />
      </div>
      <div class="px-4 pt-4">
        <div class="rounded-xl border border-white/10 bg-white/5 p-3">
          <div class="flex items-center gap-3">
            <UAvatar
              :text="account.initials"
              size="md"
             />
            <div class="min-w-0">
              <p class="truncate text-sm font-bold text-white">
                {{ account.name }}
              </p>
              <p class="truncate text-xs text-slate-400">
                {{ account.detail }}
              </p>
            </div>
          </div>
        </div>
      </div>
      <nav class="flex-1 overflow-y-auto px-4 py-5">
        <p class="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          {{ roleLabel }}
        </p>
        <div class="space-y-1">
          <NuxtLink
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition"
            :class="
              isActive(item.to)
                ? 'bg-brand-600 text-white'
                : 'text-slate-300 hover:bg-white/8 hover:text-white'
            "
          >
            <UIcon
              :name="item.icon"
              class="size-5 shrink-0"
             />
            <span class="truncate">
              {{ item.label }}
            </span>
          </NuxtLink>
        </div>
      </nav>
      <div class="border-t border-white/10 p-4">
        <NuxtLink
          to="/"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/8 hover:text-white"
        >
          <UIcon
            name="i-lucide-log-out"
            class="size-5"
           />
          Sign out
        </NuxtLink>
      </div>
    </aside>
    <div class="min-h-screen lg:pl-68">
      <header class="sticky top-0 z-30 border-b border-default bg-default/90 backdrop-blur-xl">
        <div class="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-menu"
            class="lg:hidden"
            aria-label="Open navigation"
            @click="mobileOpen = true"
           />
          <div class="hidden min-w-0 flex-1 md:block">
            <div class="relative max-w-lg">
              <UIcon
                name="i-lucide-search"
                class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
               />
              <input
                class="h-10 w-full rounded-lg border border-default bg-elevated/60 pl-10 pr-4 text-sm outline-none transition placeholder:text-dimmed focus:border-primary focus:ring-3 focus:ring-primary/10"
                placeholder="Search classes, assessments, or students"
              >
            </div>
          </div>
          <div class="ml-auto flex items-center gap-2">
            <UColorModeButton />
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-bell"
              aria-label="Notifications"
             />
            <UAvatar
              :text="account.initials"
              size="sm"
             />
          </div>
        </div>
      </header>
      <main class="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <slot />
      </main>
    </div>
  </div>
</template>
