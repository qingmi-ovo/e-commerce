<template>
  <div class="app">
    <LayoutHeader />
    <main class="main-content">
      <div class="container">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup>
import LayoutHeader from './common/layouts/LayoutHeader.vue'
import './common/assets/styles/base.scss'
</script>

<style lang="scss" scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding-top: calc(var(--header-height) + 20px);
  padding-bottom: 20px;
}
</style>
