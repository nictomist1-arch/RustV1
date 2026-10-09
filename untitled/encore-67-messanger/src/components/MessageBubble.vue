<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  useTemplateRef,
  watch,
} from "vue";

import ImageLightbox from "./ImageLightbox.vue";

import { getFileUrl } from "../types/file";

import type { Message } from "../types/message";

const props = defineProps<{
  message: Message;
  isOwn: boolean;
  readOnly: boolean;
  isChannel: boolean;
}>();

const emit = defineEmits<{
  edit: [];
  delete: [];
  comment: [];
}>();

const isLightboxOpen = ref(false);
const isMenuOpen = ref(false);
const copyState = ref("Копировать");

const menuPosition = ref({
  left: 0,
  top: 0,
});

const bubble = useTemplateRef<HTMLElement>("bubble");
const menu = useTemplateRef<HTMLDivElement>("menu");

let copyTimeout: ReturnType<typeof setTimeout> | undefined;

const imageSrc = computed(() => {
  if (!props.message.attachment){
    return null;
  }

  return getFileUrl(props.message.attachment);
});

const canCopy = computed(() => {
  return props.message.type === "text" && !!props.message.body;
});

const canEdit = computed(() => {
  return !props.readOnly && props.isOwn && props.message.type === "text";
});

function closeMenu(){
  isMenuOpen.value = false;
}

function closeOutside(event: PointerEvent){
  if (event.target instanceof Node && !menu.value?.contains(event.target)){
    closeMenu();
  }
}

function handleKey(event: KeyboardEvent){
  if (event.key === "Escape"){
    closeMenu();
  }
}

async function openMenu(event: MouseEvent){
  isMenuOpen.value = true;
  copyState.value = "Копировать";

  await nextTick();

  const rect = bubble.value?.getBoundingClientRect();
  const size = menu.value?.getBoundingClientRect();

  if (!rect || !size){
    return;
  }

  const left = rect.right + size.width + 8 <= window.innerWidth
    ? rect.right + 8
    : rect.left - size.width - 8;

  menuPosition.value = {
    left: Math.max(8, Math.min(left, window.innerWidth - size.width - 8)),
    top: Math.max(8, Math.min(event.clientY, window.innerHeight - size.height - 8)),
  };

  menu.value?.querySelector<HTMLButtonElement>("button")?.focus();
}

async function copyMessage(){
  if (!canCopy.value || !props.message.body){
    return;
  }

  clearTimeout(copyTimeout);

  try {
    await navigator.clipboard.writeText(props.message.body);
    copyState.value = "Скопировано";
  } catch {
    copyState.value = "Не удалось скопировать";
  }

  copyTimeout = setTimeout(() => {
    copyState.value = "Копировать";
  }, 1500);
}

function startEdit(){
  if (!canEdit.value){
    return;
  }

  closeMenu();
  emit("edit");
}

function deleteMessage(){
  if (props.readOnly){
    return;
  }
  closeMenu();
  emit("delete");
}

function startComment(){
  if (!props.isChannel){
    return;
  }

  closeMenu();
  emit("comment");
}

watch(
  () => props.isOwn,
  closeMenu,
);

onMounted(() => {
  document.addEventListener("pointerdown", closeOutside);
  document.addEventListener("keydown", handleKey);
  window.addEventListener("resize", closeMenu);
  window.addEventListener("scroll", closeMenu, true);
});

onUnmounted(() => {
  clearTimeout(copyTimeout);

  document.removeEventListener("pointerdown", closeOutside);
  document.removeEventListener("keydown", handleKey);
  window.removeEventListener("resize", closeMenu);
  window.removeEventListener("scroll", closeMenu, true);
});
</script>

<template>
  <div
    class="message-row"
    :class="{
      'message-row--own': isOwn,
      'message-row--other': !isOwn,
    }"
  >
    <img
      v-if="!isOwn && message.author_avatar"
      class="message-avatar"
      :src="getFileUrl(message.author_avatar)"
      alt=""
    />
    <div
      v-else-if="!isOwn"
      class="message-avatar message-avatar--placeholder"
      aria-hidden="true"
    >
      {{ message.author_name.slice(0, 1).toUpperCase() }}
    </div>

    <div class="message-content">
      <header class="message-author">
        {{ message.author_name }}
      </header>

      <article
        ref="bubble"
        class="message"
        :class="{
          'message--own': isOwn,
          'message--other': !isOwn,
        }"
        @contextmenu.prevent.stop="openMenu"
      >
        <p v-if="message.type === 'text'">
          {{ message.body }}
        </p>

        <button
          v-if="message.type === 'image' && imageSrc"
          type="button"
          class="message-image-button"
          @click="isLightboxOpen = true"
        >
          <img
            class="message-image"
            :src="imageSrc"
            alt="Изображение"
          />
        </button>

        <footer>
          <span>{{ message.created_at }}</span>
          <template v-if="message.edited_at">
            <span>|</span>
            <span class="edited-label">изм.</span>
          </template>
        </footer>
      </article>
      <slot name="comments"></slot>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="isMenuOpen"
      ref="menu"
      class="action-menu"
      aria-label="Действия с сообщением"
      :style="{
        left: `${menuPosition.left}px`,
        top: `${menuPosition.top}px`,
      }"
    >
      <button
        v-if="canCopy"
        class="action-btn"
        type="button"
        aria-live="polite"
        @click="copyMessage"
      >
        {{ copyState }}
      </button>
      <button
        v-if="isChannel"
        class="action-btn"
        type="button"
        @click="startComment"
      >
        Комментировать
      </button>
      <button
        v-if="canEdit"
        class="action-btn"
        type="button"
        @click="startEdit"
      >
        Изменить
      </button>
      <button
        v-if="!readOnly"
        class="action-btn action-btn--danger"
        type="button"
        @click="deleteMessage"
      >
        Удалить
      </button>
    </div>
  </Teleport>

  <ImageLightbox
    v-if="isLightboxOpen && imageSrc"
    :src="imageSrc"
    @close="isLightboxOpen = false"
  />
</template>
<style scoped>

.message-image-button{
  display: block;
  padding: 0;
  border: none;
  background: transparent;
  cursor: zoom-in;
}

.message-image{
  display: block;
  max-width: 300px;
  width: 100%;
  max-height: 300px;
  border-radius: 12px;
  object-fit: cover;
}

.message-row{
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 80%;
}

.message-row--own{
  align-self: flex-end;
}

.message-row--other{
  align-self: flex-start;
}

.message-content{
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.message-row--own .message-author{
  text-align: right;
}

.message{
  position: relative;
  min-width: 0;
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
}
.message--own{
  background: var(--accent);
  color: var(--accent-text);
}
.message--other{
  background: var(--bubble);
}

.message-author{
  margin-bottom: 6px;
  color: var(--text);
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.message p{
  margin: 0;
  font-size: 22px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.message footer{
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  margin-top: 6px;
  color: var(--muted);
  font-size: 10px;
}

.edited-label{
  font-style: italic;
}

.message-avatar{
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
}

.message-avatar--placeholder{
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--input);
  color: var(--muted);
  font-size: 22px;
  font-weight: 600;
}

@media (max-width: 600px){
  .message-row{
    max-width: 100%;
  }
}
.action-menu{
  position: fixed;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  width: 180px;
  max-width: calc(100vw - 16px);
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--menu);
  box-shadow: 0 8px 24px #0006;
}

.action-btn{
  padding: 9px 12px;
  border: 0;
  border-radius: 5px;
  background: transparent;  
  color: var(--text);
  text-align: left;
  cursor: pointer;
}

.action-btn:hover,
.action-btn:focus-visible{
  background: var(--border);
}

.action-btn--danger{
  color: var(--danger);
}

.message--own footer{
  color: var(--own-muted);
}
</style>

