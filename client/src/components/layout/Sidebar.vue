<template>
  <aside>
    <h2>School Records</h2>

    <nav>
      <RouterLink :to="{ name: 'dashboard' }"> Dashboard </RouterLink>

      <RouterLink to="/students"> Students </RouterLink>

      <RouterLink to="/teachers"> Teachers </RouterLink>

      <RouterLink to="/classes"> Classes </RouterLink>

      <RouterLink to="/subjects"> Subjects </RouterLink>

      <RouterLink to="/results"> Results </RouterLink>

      <RouterLink to="/promotions"> Promotions </RouterLink>

      <RouterLink to="/academic-sessions"> Academic Sessions </RouterLink>
    </nav>
  </aside>
</template>
