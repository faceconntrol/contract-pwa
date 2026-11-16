<script setup lang="ts">
import { VEHICLE_MAKE_MODEL_LIST_ID } from '@/features/shared/constants/vehicle-models'

defineProps<{
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <input
    :value="modelValue"
    type="text"
    autocomplete="off"
    :list="VEHICLE_MAKE_MODEL_LIST_ID"
    placeholder="Выберите или введите"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
