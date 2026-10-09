<script setup lang="ts">
import { ref } from "vue";

import type { AuthCredentials } from "../types/auth";

const props = defineProps<{
  busy: boolean;
  ready: boolean;
  error: string;
}>();

const emit = defineEmits<{
  submit: [credentials: AuthCredentials];
  clearError: [];
}>();

const registering = ref(false);
const username = ref("");
const password = ref("");
const displayName = ref("");

function switchMode(){
  if (props.busy) return;
  registering.value = !registering.value;
  password.value = "";
  emit("clearError");
}

function submitAuth(){
  if (props.busy || !props.ready) return;

  emit("submit", {
    username: username.value,
    password: password.value,
    displayName: displayName.value,
    registering: registering.value,
  });
}
</script>

<template>
  <section class="auth-screen">
    <div class="auth-card">
      <header class="auth-card__header">
        <h1>Encore 67 messenger</h1>
        <p>{{ registering ? 'Регистрация' : 'Вход в мессенджер' }}</p>
      </header>

      <form class="auth-form" @submit.prevent="submitAuth">
        <label v-if="registering" for="auth-name" class="auth-field">
          <span>Отображаемое имя</span>
          <input id="auth-name" v-model="displayName" maxlength="40" autocomplete="nickname" required :disabled="busy" />
        </label>
        <label for="auth-username" class="auth-field">
          <span>Логин</span>
          <input
            id="auth-username"
            v-model="username"
            minlength="3"
            maxlength="32"
            pattern="[a-zA-Z0-9_]{3,32}"
            title="От 3 до 32 латинских букв, цифр или символов _"
            autocomplete="username"
            autocapitalize="none"
            spellcheck="false"
            required
            :disabled="busy"
          />
        </label>
        <label for="auth-password" class="auth-field">
          <span>Пароль</span>
          <input
            id="auth-password"
            v-model="password"
            type="password"
            :minlength="registering ? 6 : 1"
            maxlength="128"
            :autocomplete="registering ? 'new-password' : 'current-password'"
            required
            :disabled="busy"
          />
        </label>

        <p v-if="error" class="auth-error" role="alert">{{ error }}</p>
        <p v-if="!ready && !error" class="auth-hint" role="status">Подключение к базе...</p>

        <button type="submit" class="auth-button auth-button--primary" :disabled="busy || !ready">
          {{ busy ? 'Подождите...' : registering ? 'Зарегистрироваться' : 'Войти' }}
        </button>
        <button type="button" class="auth-button" :disabled="busy" @click="switchMode">
          {{ registering ? 'Уже есть аккаунт? Войти' : 'Создать аккаунт' }}
        </button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.auth-screen{
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow-y: auto;
}

.auth-card{
  width: 380px;
  max-width: 100%;
  margin: auto;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
}

.auth-card__header{
  padding: 18px 24px;
  border-bottom: 1px solid var(--bubble);
}

.auth-card__header h1{
  margin: 0;
  font-size: 18px;
}

.auth-card__header p{
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 13px;
}

.auth-form{
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px;
}

.auth-field{
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}

.auth-field input{
  min-width: 0;
  padding: 11px 13px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--input);
  color: var(--text);
  font: inherit;
  font-size: 14px;
  outline: none;
}

.auth-field input:focus{
  border-color: var(--accent);
}

.auth-error{
  margin: 0;
  color: var(--danger);
  font-size: 13px;
}

.auth-hint{
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.auth-button{
  padding: 10px 18px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--input);
  color: var(--text);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.auth-button:hover{
  background: var(--hover);
}

.auth-button--primary,
.auth-button--primary:hover{
  border-color: var(--accent);
  background: var(--accent);
  color: var(--accent-text);
  font-weight: 600;
}

.auth-button:disabled{
  opacity: 0.5;
  cursor: default;
}

.auth-button:focus-visible{
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
</style>
