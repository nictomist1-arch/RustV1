<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from "vue";
import { getFileUrl } from "../types/file";
import type { Message } from "../types/message";
import ImageLightbox from "./ImageLightbox.vue";
const props = defineProps<{ message: Message; isOwn: boolean }>();
const emit = defineEmits<{ edit: []; delete: [] }>();
const isLightboxOpen = ref(false);
const isMenuOpen = ref(false);
const copyState = ref("Копировать");
const menuPosition = ref({left: 0, top: 0});
const bubble = useTemplateRef<HTMLElement>("bubble");
const menu = useTemplateRef<HTMLDivElement>("menu");
let copyTimeout: ReturnType<typeof setTimeout> | undefined;
const imageSrc = computed(() => props.message.attachment ? getFileUrl(props.message.attachment) : null);
const canCopy = computed(() => props.message.type === "text" && !!props.message.body);
const canEdit = computed(() => props.isOwn && props.message.type === "text");
function closeMenu() { isMenuOpen.value = false; }
function closeOutside(event: PointerEvent) {
  if (event.target instanceof Node && !menu.value?.contains(event.target)) closeMenu();
}
function handleKey(event: KeyboardEvent) { if (event.key === "Escape") closeMenu(); }
async function openMenu(event: MouseEvent) {
  isMenuOpen.value = true;
  copyState.value = "Копировать";
  await nextTick();
  const rect = bubble.value?.getBoundingClientRect();
  const size = menu.value?.getBoundingClientRect();
  if (!rect || !size) return;
  const left = rect.right + size.width + 8 <= window.innerWidth ? rect.right + 8 : rect.left - size.width - 8;
  menuPosition.value = {
    left: Math.max(8, Math.min(left, window.innerWidth - size.width - 8)),
    top: Math.max(8, Math.min(event.clientY, window.innerHeight - size.height - 8)),
  };
  menu.value?.querySelector<HTMLButtonElement>("button")?.focus();
}
async function copyMessage() {
  if (!canCopy.value || !props.message.body) return;
  clearTimeout(copyTimeout);
  try {
    await navigator.clipboard.writeText(props.message.body);
    copyState.value = "Скопировано";
  } catch { copyState.value = "Не удалось скопировать"; }
  copyTimeout = setTimeout(() => { copyState.value = "Копировать"; }, 1500);
}
function startEdit() { if (canEdit.value) { closeMenu(); emit("edit"); } }
function deleteMessage() { closeMenu(); emit("delete"); }
watch(() => props.isOwn, closeMenu);
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
  <article ref="bubble" class="message" :class="isOwn ? 'message--own' : 'message--other'"
           @contextmenu.prevent.stop="openMenu">
    <p v-if="message.type === 'text'">{{ message.body }}</p>
    <button v-if="message.type === 'image' && imageSrc" type="button" class="message-image-button" @click="isLightboxOpen = true">
      <img class="message-image" :src="imageSrc" alt="Изображение" />
    </button>
    <footer>
      <span>{{ message.author_name }}</span><span>|</span><span>{{ message.created_at }}</span>
      <template v-if="message.edited_at"><span>|</span><span class="edited-label">изм.</span></template>
    </footer>
  </article>
  <Teleport to="body">
    <div v-if="isMenuOpen" ref="menu" class="action-menu" aria-label="Действия с сообщением"
         :style="{left: `${menuPosition.left}px`, top: `${menuPosition.top}px`}">
      <button v-if="canCopy" class="action-btn" type="button" aria-live="polite" @click="copyMessage">{{ copyState }}</button>
      <button v-if="canEdit" class="action-btn" type="button" @click="startEdit">Изменить</button>
      <button class="action-btn action-btn--danger" type="button" @click="deleteMessage">Удалить</button>
    </div>
  </Teleport>
  <ImageLightbox v-if="isLightboxOpen && imageSrc" :src="imageSrc" @close="isLightboxOpen = false" />
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
  max-height: 300px;
  border-radius: 12px;
  object-fit: cover;
}

.message{
  position: relative;
  max-width: 70%;
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
}
.message--own{
  align-self: flex-end;
  background: var(--accent);
  color: var(--accent-text);
}
.message--other{
  align-self: flex-start;
  background: var(--bubble);
}

.message p{
  margin: 0;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.message footer{
  display: flex;
  justify-content: flex-end;
  gap: 5px;
  margin-top: 6px;
  color: var(--muted);
  font-size: 10px;
}

.edited-label{
  font-style: italic;
}

 .action-menu{position:fixed;z-index:1000;display:flex;flex-direction:column;gap:4px;padding:6px;width:180px;max-width:calc(100vw - 16px);border:1px solid var(--border);border-radius:8px;background:var(--menu);box-shadow:0 8px 24px #0006}
.action-btn{padding:9px 12px;border:0;border-radius:5px;background:transparent;color:var(--text);text-align:left;cursor:pointer}
.action-btn:hover,.action-btn:focus-visible{background:var(--border)}
.action-btn--danger{color:var(--danger)}
.message--own footer{color:var(--own-muted)}
</style>
