<script setup lang="ts">
definePageMeta({
    layout: "admin",
});
</script>

<template>
  <FeaturePage
    eyebrow="Account governance"
    title="User accounts"
    description="Manage user accounts and account access."
    action-label="Add User"
    action-to="/admin/users/new"
    action-icon="i-lucide-user-plus"
   />
</template>
