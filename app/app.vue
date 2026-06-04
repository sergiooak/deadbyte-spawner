<template>
  <UApp>
    <div class="min-h-screen bg-gray-50 text-gray-950 dark:bg-gray-950 dark:text-gray-50">
      <div class="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
        <LayoutSidebar />
        <main class="min-w-0">
          <LayoutHeader />
          <div class="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
            <NuxtPage />
          </div>
        </main>
      </div>
    </div>
  </UApp>
</template>
