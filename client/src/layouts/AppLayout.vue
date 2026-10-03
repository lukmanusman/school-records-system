<script setup>
import Sidebar from '../components/layout/Sidebar.vue'
import Header from '../components/layout/Header.vue'
</script>

<template>
  <div>
    <Sidebar />

    <div>
      <Header />

      <main>
        <RouterView />
      </main>
    </div>
  </div>
</template>
