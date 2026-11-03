<script setup lang="ts">
import { RouterLink } from 'vue-router'
import OsgopForm from '@/features/osgop/OsgopForm.vue'
</script>

<template>
  <section>
    <div class="page-head">
      <RouterLink class="back" to="/">← Назад</RouterLink>
      <h1>Заявление ОСГОП</h1>
    </div>
    <OsgopForm />
  </section>
</template>
