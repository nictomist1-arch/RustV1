<script setup lang="ts">
import { ref } from "vue";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { getFileUrl } from "../types/file";

import type {
  ProfileUpdate,
  User,
} from "../types/user";

const props = defineProps<{
  user: User;
}>();

const emit = defineEmits<{
  save: [profile: ProfileUpdate];
  close: [];
}>();

const displayName = ref(props.user.display_name);
const userStatus = ref(props.user.status);
const avatarPath = ref(props.user.avatar_path);
const isSelectingAvatar = ref(false);
const avatarError = ref("");

async function selectAvatar(){
  if (isSelectingAvatar.value) return;
  isSelectingAvatar.value = true;
  avatarError.value = "";

  try {
    const file = await open({
      multiple: false,
      filters: [
        {
          name: "Изображения",
          extensions: ["png", "jpg", "jpeg", "webp", "gif"],
        },
      ],
    });

    if (!file) return;

    const savedPath = await invoke<string>("save_attachment", {
      source: file,
    });
    const image = new Image();
    image.src = getFileUrl(savedPath);
    await image.decode();
    avatarPath.value = savedPath;
  } catch (error) {
    console.error(error);
    avatarError.value = "Не удалось загрузить аватарку. Выберите другое изображение.";
  } finally {
    isSelectingAvatar.value = false;
  }
}

function submitProfile(){
  const cleanDisplayName = displayName.value.trim();

  if (!cleanDisplayName || isSelectingAvatar.value){
    return;
  }

  emit(
    "save",
    {
      displayName: cleanDisplayName,
      status: userStatus.value.trim(),
      avatarPath: avatarPath.value,
    },
  );
}
</script>

<template>
  <Teleport to="body">
    <div
      class="profile-backdrop"
      @click.self="emit('close')"
    >
      <section
        class="profile-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
      >
        <header class="profile-card__header">
          <h2 id="profile-title">
            Профиль
          </h2>
          <button
            type="button"
            class="profile-card__close"
            aria-label="Закрыть профиль"
            @click="emit('close')"
          >
            ×
          </button>
        </header>

        <form
          class="profile-form"
          @submit.prevent="submitProfile"
        >
          <div class="profile-avatar">
            <img
              v-if="avatarPath"
              class="profile-avatar__image"
              :src="getFileUrl(avatarPath)"
              alt="Аватарка профиля"
            />
            <div v-else class="profile-avatar__placeholder" aria-hidden="true">
              {{ (displayName.trim() || user.username).slice(0, 1).toUpperCase() }}
            </div>
            <button
              type="button"
              class="profile-button"
              :disabled="isSelectingAvatar"
              @click="selectAvatar"
            >
              {{ isSelectingAvatar ? "Загрузка..." : "Изменить аватарку" }}
            </button>
          </div>
          <p v-if="avatarError" class="profile-error" role="alert">
            {{ avatarError }}
          </p>
          <label
            for="profile-display-name"
            class="profile-field"
          >
            <span>Отображаемое имя</span>
            <input
              id="profile-display-name"
              v-model="displayName"
              type="text"
              maxlength="40"
              required
            />
          </label>

          <label
            for="profile-status"
            class="profile-field"
          >
            <span>Статус</span>
            <textarea
              id="profile-status"
              v-model="userStatus"
              maxlength="120"
              rows="3"
              aria-describedby="profile-status-count"
            ></textarea>
            <small
              id="profile-status-count"
              class="profile-field__counter"
            >
              {{ userStatus.length }} / 120
            </small>
          </label>

          <div class="profile-username">
            <span>Имя пользователя</span>
            <strong>@{{ user.username }}</strong>
          </div>

          <footer class="profile-actions">
            <button
              type="button"
              class="profile-button"
              @click="emit('close')"
            >
              Отмена
            </button>
            <button
              type="submit"
              class="profile-button profile-button--primary"
              :disabled="!displayName.trim() || isSelectingAvatar"
            >
              Сохранить
            </button>
          </footer>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.profile-backdrop{
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow-y: auto;
  background: rgba(10, 12, 16, 0.45);
}

.profile-card{
  width: 420px;
  max-width: 100%;
  max-height: 100%;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
}

.profile-card__header{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--bubble);
}

.profile-card__header h2{
  margin: 0;
  font-size: 18px;
}

.profile-card__close{
  width: 32px;
  height: 32px;
  padding: 0;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--input);
  color: var(--text);
  cursor: pointer;
  font: inherit;
  font-size: 22px;
  line-height: 1;
}

.profile-form{
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px;
}

.profile-field{
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}

.profile-avatar{
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}

.profile-avatar__image,
.profile-avatar__placeholder{
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: 10px;
  object-fit: cover;
}

.profile-avatar__placeholder{
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--input);
  color: var(--muted);
  font-size: 24px;
}

.profile-error{
  margin: 0;
  color: var(--danger);
  font-size: 13px;
}

.profile-field input,
.profile-field textarea{
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 11px 13px;
  border: 1px solid var(--border);
  border-radius: 7px;
  outline: none;
  color: var(--text);
  background: var(--input);
  font: inherit;
  font-size: 14px;
  line-height: 1.5;
}

.profile-field textarea{
  min-height: 90px;
  resize: vertical;
}

.profile-field input:focus,
.profile-field textarea:focus{
  border-color: var(--accent);
}

.profile-field__counter{
  color: var(--muted);
  font-size: 12px;
  text-align: right;
}

.profile-username{
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--muted);
  font-size: 13px;
}

.profile-username strong{
  color: var(--text);
  font-weight: 600;
  overflow-wrap: anywhere;
}

.profile-actions{
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid var(--bubble);
}

.profile-button{
  padding: 10px 18px;
  border: 1px solid var(--border);
  border-radius: 7px;
  cursor: pointer;
  color: var(--text);
  background: var(--input);
  font: inherit;
  font-size: 14px;
}

.profile-button:hover,
.profile-card__close:hover{
  background: var(--hover);
}

.profile-button--primary{
  border-color: var(--accent);
  color: var(--accent-text);
  background: var(--accent);
  font-weight: 600;
}

.profile-button--primary:hover{
  background: var(--accent);
}

.profile-button:disabled{
  opacity: 0.5;
  cursor: default;
}

.profile-button:focus-visible,
.profile-card__close:focus-visible{
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
</style>
