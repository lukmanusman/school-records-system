<script setup>
import { computed } from 'vue'

const props = defineProps({
  imageUrl: {
    type: String,
    default: null,
  },
  name: {
    type: String,
    default: '',
  },
  size: {
    type: Number,
    default: 40,
  },
})

const initials = computed(() => {
  const parts = props.name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) return '?'

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
})
</script>

<template>
  <img
    v-if="imageUrl"
    :src="imageUrl"
    :alt="`${name || 'User'} profile picture`"
    class="avatar"
    :style="{ width: `${size}px`, height: `${size}px` }"
  />

  <span
    v-else
    class="avatar avatar--placeholder"
    role="img"
    :aria-label="`${name || 'User'} initials`"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    {{ initials }}
  </span>
</template>

<style scoped>
.avatar {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  object-fit: cover;
  background-color: #e5e7eb;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 600;
}
</style>
