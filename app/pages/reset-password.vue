<script setup lang="ts">
definePageMeta({
    layout: "auth",
});
const done = ref(false);
</script>

<template>
  <div class="mx-auto max-w-lg">
    <UCard>
      <template #header>
        <PageHeader
          title="Set a new password"
          description="Choose a strong password that you do not reuse elsewhere."
         />
      </template>
      <UAlert
        v-if="done"
        color="success"
        variant="soft"
        title="Password updated"
       />
      <form
        v-else
        class="space-y-5"
        @submit.prevent="done=true"
      >
        <UFormField label="New password">
          <UInput
            type="password"
            class="w-full"
           />
        </UFormField>
        <UFormField label="Confirm password">
          <UInput
            type="password"
            class="w-full"
           />
        </UFormField>
        <UButton
          type="submit"
          block
        >
          Update Password
        </UButton>
      </form>
    </UCard>
  </div>
</template>
