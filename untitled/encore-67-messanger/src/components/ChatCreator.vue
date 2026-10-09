<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

import { getFileUrl } from "../types/file";

import type { User } from "../types/user";
import type { ChatCreate, ChatKind } from "../types/chats";

const props = defineProps<{
  users: User[];
  currentUserId: number;
  saving: boolean;
  error: string;
  kind: ChatKind;
}>();

const emit = defineEmits<{
  create: [chat: ChatCreate];
  close: [];
}>();

const title = ref("");
const participantIds = ref<number[]>([]);

const availableUsers = computed(() => {
  return props.users.filter(user => user.id !== props.currentUserId);
});

function closeCreator(){
  if (!props.saving){
    emit("close");
  }
}

function handleKey(event: KeyboardEvent){
  if (event.key === "Escape"){
    closeCreator();
  }
}

function submitChat(){
  if (props.saving || !title.value.trim() || (props.kind === "chat" && participantIds.value.length === 0)){
    return;
  }

  emit("create", {
    kind: props.kind,
    title: title.value.trim(),
    participantIds: [...participantIds.value],
  });
}

onMounted(() => {
  document.addEventListener("keydown", handleKey);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKey);
});
</script>

<template>
  <Teleport to="body">
    <div class="chat-backdrop" @click.self="closeCreator">
      <section
        class="chat-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-create-title"
      >
        <header class="chat-card__header">
          <h2 id="chat-create-title">{{ kind === "channel" ? "Новый канал" : "Новый чат" }}</h2>
          <button
            type="button"
            class="chat-card__close"
            aria-label="Закрыть"
            :disabled="saving"
            @click="closeCreator"
          >
            ×
          </button>
        </header>

        <form class="chat-form" @submit.prevent="submitChat">
          <label for="chat-title" class="chat-field">
            <span>{{ kind === "channel" ? "Название канала" : "Название чата" }}</span>
            <input
              id="chat-title"
              v-model="title"
              type="text"
              maxlength="60"
              required
              :disabled="saving"
            />
          </label>

          <fieldset class="chat-participants" :disabled="saving">
            <legend>{{ kind === "channel" ? "Читатели" : "Участники" }}</legend>
            <p class="chat-hint">
              {{ kind === "channel"
                ? "Вы — владелец канала. Только вы сможете публиковать посты, выбранные пользователи смогут их читать."
                : "Вы будете добавлены автоматически." }}
            </p>
            <div class="chat-participants__list">
              <label
                v-for="user in availableUsers"
                :key="user.id"
                class="chat-participant"
              >
                <input v-model="participantIds" type="checkbox" :value="user.id" />
                <img
                  v-if="user.avatar_path"
                  class="chat-participant__avatar"
                  :src="getFileUrl(user.avatar_path)"
                  alt=""
                />
                <div class="chat-participant__name">
                  <strong>{{ user.display_name }}</strong>
                  <span>@{{ user.username }}</span>
                </div>
              </label>
            </div>
            <p v-if="availableUsers.length === 0" class="chat-hint">
              Других пользователей пока нет.
            </p>
          </fieldset>

          <p v-if="error" class="chat-error" role="alert">{{ error }}</p>

          <footer class="chat-actions">
            <button type="button" class="chat-button" :disabled="saving" @click="closeCreator">
              Отмена
            </button>
            <button
              type="submit"
              class="chat-button chat-button--primary"
              :disabled="saving || !title.trim() || (kind === 'chat' && participantIds.length === 0)"
            >
              {{ saving ? "Создание..." : kind === "channel" ? "Создать канал" : "Создать чат" }}
            </button>
          </footer>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.chat-backdrop{
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(10, 12, 16, 0.45);
}

.chat-card{
  width: 420px;
  max-width: 100%;
  max-height: 100%;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
}

.chat-card__header{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--bubble);
}

.chat-card__header h2{
  margin: 0;
  font-size: 18px;
}

.chat-card__close{
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--input);
  color: var(--text);
  font: inherit;
  font-size: 22px;
  cursor: pointer;
}

.chat-form{
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px;
}

.chat-field{
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}

.chat-field input{
  padding: 11px 13px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--input);
  color: var(--text);
  font: inherit;
  font-size: 14px;
  outline: none;
}

.chat-field input:focus{
  border-color: var(--accent);
}

.chat-participants{
  min-width: 0;
  margin: 0;
  padding: 0;
  border: none;
}

.chat-participants legend{
  padding: 0;
  font-size: 13px;
}

.chat-hint{
  margin: 8px 0;
  color: var(--muted);
  font-size: 12px;
}

.chat-participants__list{
  max-height: 240px;
  overflow-y: auto;
}

.chat-participant{
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 7px;
  cursor: pointer;
}

.chat-participant:hover{
  background: var(--input);
}

.chat-participant input{
  accent-color: var(--accent);
}

.chat-participant__avatar{
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
}

.chat-participant__name{
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  font-size: 14px;
  overflow-wrap: anywhere;
}

.chat-participant__name span{
  color: var(--muted);
  font-size: 12px;
}

.chat-error{
  margin: 0;
  color: var(--danger);
  font-size: 13px;
}

.chat-actions{
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid var(--bubble);
}

.chat-button{
  padding: 10px 18px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--input);
  color: var(--text);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.chat-button:hover,
.chat-card__close:hover{
  background: var(--hover);
}

.chat-button--primary{
  border-color: var(--accent);
  background: var(--accent);
  color: var(--accent-text);
  font-weight: 600;
}

.chat-button--primary:hover{
  background: var(--accent);
}

button:disabled{
  opacity: 0.5;
  cursor: default;
}

button:focus-visible{
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
</style>
