<script setup lang="ts">
import { ref } from "vue";
import { UNIQUE_EMOJIS } from "./emojis.ts";
import { STICKERS } from "./stickers.ts";

const props = withDefaults(
  defineProps<{
    emojis?: readonly string[];
    preventMouseDown?: boolean;
    showStickers?: boolean;
  }>(),
  {
    emojis: () => UNIQUE_EMOJIS,
    preventMouseDown: false,
    showStickers: true,
  },
);

const emit = defineEmits<{
  select: [emoji: string];
  selectSticker: [src: string];
}>();

const activeTab = ref<"emoji" | "stickers">("emoji");

function onMouseDown(event: MouseEvent) {
  if (props.preventMouseDown) event.preventDefault();
}
</script>

<template>
  <div class="emoji-panel" @click.stop>
    <div v-if="props.showStickers" class="emoji-tabs">
      <button
        type="button"
        class="tab-btn"
        :class="{ 'tab-btn--active': activeTab === 'emoji' }"
        @mousedown="onMouseDown"
        @click="activeTab = 'emoji'"
      >
        Эмодзи
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ 'tab-btn--active': activeTab === 'stickers' }"
        @mousedown="onMouseDown"
        @click="activeTab = 'stickers'"
      >
        Стикеры
      </button>
    </div>

    <div v-if="!props.showStickers || activeTab === 'emoji'" class="emoji-bar">
      <button
        v-for="emoji in props.emojis"
        :key="emoji"
        type="button"
        class="emoji-btn"
        @mousedown="onMouseDown"
        @click="emit('select', emoji)"
      >
        {{ emoji }}
      </button>
    </div>

    <div v-else class="sticker-bar">
      <button
        v-for="src in STICKERS"
        :key="src"
        type="button"
        class="sticker-btn"
        @mousedown="onMouseDown"
        @click="emit('selectSticker', src)"
      >
        <img :src="src" alt="" class="sticker-img" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.emoji-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(320px, 80vw);
  max-height: 280px;
  background: var(--menu);
  border: 1px solid var(--hover);
  border-radius: 10px;
  padding: 10px;
  z-index: 10;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.emoji-tabs {
  display: flex;
  gap: 4px;
}

.tab-btn {
  flex: 1;
  padding: 6px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.tab-btn--active {
  background: var(--hover);
  color: var(--text);
}

.emoji-bar {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
  overflow-y: auto;
  max-height: 220px;
}

.emoji-btn {
  padding: 4px 6px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
  font-size: 18px;
}

.emoji-btn:hover {
  background: var(--hover);
}

.sticker-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  overflow-y: auto;
  max-height: 220px;
}

.sticker-btn {
  width: 56px;
  height: 56px;
  padding: 4px;
  border: 1px solid var(--hover);
  border-radius: 8px;
  background: var(--surface);
  cursor: pointer;
}

.sticker-btn:hover {
  border-color: var(--accent);
}

.sticker-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
</style>
