<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="home">
    <h1>Договоры ТС</h1>
    <p class="lead">
      Офлайн-заполнение договора аренды и заявления ОСГОП. Данные остаются на этом устройстве.
    </p>
    <div class="home-actions">
      <RouterLink class="tile" to="/lease">
        <strong>Договор аренды ТС</strong>
        <span>Без экипажа · PDF / DOCX</span>
      </RouterLink>
      <RouterLink class="tile" to="/osgop">
        <strong>Заявление ОСГОП</strong>
        <span>Включение / исключение ТС · PDF / DOCX</span>
      </RouterLink>
    </div>
  </section>
</template>
