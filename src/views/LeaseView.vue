<script setup lang="ts">
import { RouterLink } from 'vue-router'
import LeaseForm from '@/features/lease/LeaseForm.vue'
</script>

<template>
  <section>
    <div class="page-head">
      <RouterLink class="back" to="/">← Назад</RouterLink>
      <h1>Договор аренды ТС</h1>
    </div>
    <LeaseForm />
  </section>
</template>
