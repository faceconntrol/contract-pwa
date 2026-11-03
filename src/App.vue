<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <RouterLink class="brand" to="/">Договоры ТС</RouterLink>
      <nav>
        <RouterLink to="/lease">Договор</RouterLink>
        <RouterLink to="/osgop">ОСГОП</RouterLink>
      </nav>
    </header>
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>
