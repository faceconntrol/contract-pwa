<script setup lang="ts">
import {
  VEHICLE_MAKE_MODEL_LIST_ID,
  VEHICLE_MAKE_MODELS,
} from '@/features/shared/constants/vehicle-models'
</script>

<template>
  <datalist :id="VEHICLE_MAKE_MODEL_LIST_ID">
    <option v-for="item in VEHICLE_MAKE_MODELS" :key="item" :value="item" />
  </datalist>
</template>
