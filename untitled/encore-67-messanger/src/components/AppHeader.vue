<script setup lang="ts">

import { currentTheme, setTheme, themes, type Theme } from "../themes/themes";

import type { User } from "../types/user";


defineProps<{
  status: string;
  currentUser: User;
  busy: boolean;
}>();

const emit = defineEmits<{
  profile: [];
  logout: [];
}>();

</script>

<template>
  <header class="header">
    <div>
      <h1>Encore 67 messenger</h1>

      <p>{{status}}</p>
    </div>

    <div class="header__actions">
      <select class="theme-select" aria-label="Тема оформления" :value="currentTheme"
              @change="setTheme(($event.target as HTMLSelectElement).value as Theme)">
        <option v-for="theme in themes" :key="theme.id" :value="theme.id">{{ theme.title }}</option>
      </select>
      <span class="header__user">{{ currentUser.display_name }}</span>
      <button
        type="button"
        class="profile-open-button"
        @click="emit('profile')"
        >
        Профиль
      </button>
      <button
        type="button"
        class="profile-open-button"
        :disabled="busy"
        @click="emit('logout')"
      >
        Выйти
      </button>
    </div>
    <span class="badge">
        Локально
      </span>
  </header>
</template>

<style scoped>
.header__user{
  font-size: 14px;
  overflow-wrap: anywhere;
}

.profile-open-button:disabled{
  opacity: 0.5;
  cursor: default;
}


.header{
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid var(--hover);
  background: var(--surface);
  
  flex-shrink: 0;
}

.header__actions{
  display: flex;
  align-items: center;
  gap: 12px;
}

.header h1 {
  margin: 0;
  font-size: 18px;
}

.header p{
  margin: 4px 0 0;
  color: var(--muted);
}

.badge{
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--muted);
  background: var(--input);
  font-size: 12px;
}

</style>
