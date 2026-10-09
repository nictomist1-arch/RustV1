<script setup lang="ts">
import { nextTick, onMounted, ref, useTemplateRef, watch } from "vue";

import { open } from "@tauri-apps/plugin-dialog";

import { invoke } from "@tauri-apps/api/core";

import EmojiPanel from "../emoji/EmojiPanel.vue";

import type { Message } from "../types/message";
const props = defineProps<{
  editingMessage: Message | null;
  commentMessage: Message | null;
  commentError: string;
  saving: boolean;
}>();
const emit = defineEmits<{
  edit: [messageId: number, body: string];
  cancelEdit: [];
  cancelComment: [];
  send: [body: string];
  sendImage: [path: string];
  sendSticker: [src: string];
}>();

const draft = ref("");
const isEmojiPanelOpen = ref(false);
const cursorPos = ref(0);
const inputEl = useTemplateRef<HTMLInputElement>("draft-input");

onMounted(() => {
  if (props.commentMessage){
    inputEl.value?.focus();
  }
});

watch(() => props.saving, (saving, previous) => {
  if (props.commentMessage && previous && !saving && !props.commentError){
    draft.value = "";
    cursorPos.value = 0;
    nextTick(() => inputEl.value?.focus());
  }
});

function cancelMode(){
  if (props.saving) return;
  if (props.commentMessage){
    emit("cancelComment");
  } else {
    emit("cancelEdit");
  }
}

let savedDraft = "";
watch(() => props.editingMessage, async (message, previous) => {
  if (message) {
    if (!previous) savedDraft = draft.value;
    draft.value = message.body ?? "";
    isEmojiPanelOpen.value = false;
  } else { draft.value = savedDraft; }
  cursorPos.value = draft.value.length;
  await nextTick();
  inputEl.value?.focus();
});

function rememberCursor() {
  const el = inputEl.value;
  if (!el) return;
  cursorPos.value = el.selectionStart ?? draft.value.length;
}

function addEmoji(emoji: string) {
  const pos = cursorPos.value;
  draft.value = draft.value.slice(0, pos) + emoji + draft.value.slice(pos);
  cursorPos.value = pos + emoji.length;

  nextTick(() => {
    const el = inputEl.value;
    if (!el) return;
    el.focus();
    el.setSelectionRange(cursorPos.value, cursorPos.value);
  });
}

function sendSticker(src: string) {
  if (props.editingMessage || props.commentMessage) return;
  emit("sendSticker", src);
  isEmojiPanelOpen.value = false;
}

function submitMessage() {
  if (props.saving) return;
  const body = draft.value.trim();

  if (!body) return;

  if (props.commentMessage){
    if (body.length > 1000) return;
    emit("send", body);
    return;
  }

  if (props.editingMessage) { emit("edit", props.editingMessage.id, body); return; }
  emit("send", body);

  draft.value = "";
  cursorPos.value = 0;
}

function toggleEmojiPanel() {
  rememberCursor();
  isEmojiPanelOpen.value = !isEmojiPanelOpen.value;
}

async function selectImage() {
  if (props.editingMessage || props.commentMessage) return;
  const file = await open({
    multiple: false,
    filters: [
      {
        name: "Image",
        extensions: ["png", "jpg", "jpeg", "webp", "gif"],
      },
    ],
  });

  if (!file) {
    return;
  }

  const savedPath = await invoke<string>("save_attachment", {
    source: file,
  });

  emit("sendImage", savedPath);
}
</script>

<template>
  <form class="composer" @submit.prevent="submitMessage">
    <div v-if="commentMessage" class="comment-banner">
      <span class="comment-banner__text">
        Комментарий к посту: {{ commentMessage.type === 'image' ? 'Изображение' : commentMessage.body }}
      </span>
      <button type="button" :disabled="saving" @click="emit('cancelComment')">Отмена</button>
    </div>
    <p v-if="commentError" class="comment-error" role="alert">{{ commentError }}</p>
    <div v-if="editingMessage" class="editing-banner">
      <span>Редактирование сообщения</span>
      <button type="button" :disabled="saving" @click="emit('cancelEdit')">Отмена</button>
    </div>
    <div class="input-group">
      <button
        v-if="!commentMessage"
        type="button"
        class="icon-btn"
        title="Прикрепить файл"
        :disabled="!!editingMessage"
        @mousedown.prevent
        @click="selectImage"
      >
        📎
      </button>
      <input
        ref="draft-input"
        v-model="draft"
        type="text"
        :placeholder="commentMessage ? 'Написать комментарий' : 'Ну пиши уже че нить'"
        :aria-label="commentMessage ? 'Комментарий к посту' : 'Сообщение'"
        :maxlength="commentMessage ? 1000 : undefined"
        autocomplete="off"
        :disabled="saving"
        @keydown.esc.prevent="cancelMode"
        @click="rememberCursor"
        @keyup="rememberCursor"
        @select="rememberCursor"
        @blur="rememberCursor"
      />
      <button
        type="button"
        class="icon-btn"
        title="Эмодзи и стикеры"
        @mousedown.prevent
        @click="toggleEmojiPanel"
      >
        😊
      </button>
      <button type="submit" :disabled="saving || !draft.trim()">{{ editingMessage ? "Сохранить" : commentMessage ? "Комментировать" : "Отправить" }}</button>
    </div>

    <EmojiPanel
      v-if="isEmojiPanelOpen"
      class="composer-emoji-panel"
      prevent-mouse-down
      :show-stickers="!editingMessage && !commentMessage"
      @select="addEmoji"
      @select-sticker="sendSticker"
    />
  </form>
</template>

<style scoped>
.comment-banner{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--muted);
  font-size: 13px;
}

.comment-banner__text{
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comment-banner button{
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font: inherit;
}

.comment-error{
  margin: 0;
  color: var(--danger);
  font-size: 13px;
}

.editing-banner{display:flex;align-items:center;justify-content:space-between;color:var(--muted)}
.editing-banner button{border:0;background:transparent;color:var(--muted);cursor:pointer}
.composer button:disabled{opacity:0.5;cursor:default}
.composer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 15px 20px;
  border-top: 1px solid var(--bubble);
  background: var(--surface);
  flex-shrink: 0;
  position: relative;
}

.input-group {
  display: flex;
  gap: 10px;
}

.composer input {
  flex: 1;
  min-width: 0;
  padding: 11px 13px;
  border: 1px solid var(--border);
  border-radius: 7px;
  outline: none;
  color: var(--text);
  background: var(--input);
  font: inherit;
}

.composer input:focus {
  border-color: var(--accent);
}

.composer button[type="submit"] {
  padding: 0 18px;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  color: var(--accent-text);
  background: var(--accent);
  font: inherit;
  font-weight: 600;
}

.icon-btn {
  width: 42px;
  height: 42px;
  padding: 0;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--input);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  color: var(--text);
}

.icon-btn:hover {
  background: var(--hover);
}

.composer-emoji-panel {
  position: absolute;
  bottom: calc(100% + 8px);
  right: 20px;
  left: auto;
}
</style>
