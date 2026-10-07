<script setup lang="ts">
import type { Chat } from "../types/chats";

defineProps<{
  chats: Chat[];

  activeChatId: number;
}>();

const emit = defineEmits<{
  select: [chat: Chat];
  create: [];
}>();

function selectChat(chat: Chat){
  emit("select", chat);
}
</script>

<template>
<aside class="sidebar">
  <div class="sidebar__header">
    <span>Чаты</span>
    <button type="button" class="sidebar__create" @click="emit('create')">
      Новый чат
    </button>
  </div>

  <div class="sidebar__list">
    <button
      v-for="chat in chats"
      :key="chat.id"
      type="button"
      class="chat-button"
      :class="{
        'chat-button--active':
        chat.id === activeChatId
      }"
      @click="selectChat(chat)"
    >
      <div class="chat-button__top"><strong class="chat-button__title">
        {{ chat.title }}
      </strong><span v-if="chat.unread_count > 0" class="chat-button__badge">{{ chat.unread_count }}</span></div>

      <span class="chat-button__subtitle">
        {{ chat.subtitle }}
      </span>
    </button>
  </div>
</aside>
</template>

<style scoped>
.chat-button__top{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px}
.chat-button__badge{min-width:20px;padding:3px 6px;border-radius:10px;background:var(--accent);color:var(--accent-text);font-size:11px}
.sidebar{
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;

  min-height: 0;

  border-right: 1px solid var(--bubble);

  background: var(--sidebar);
}

.sidebar__header{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
  padding: 18px;
  border-bottom: 1px solid var(--bubble);
  font-weight: 600;
}

.sidebar__create{
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--input);
  color: var(--text);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.sidebar__create:hover{
  background: var(--hover);
}

.sidebar__list{
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.chat-button{
  width: 100%;

  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.chat-button:hover{
  background: var(--input);
}

.chat-button--active{
  background: var(--hover);
}
.chat-button__title{
  font-size: 14px;
}
.chat-button__subtitle{
  color: var(--muted);
  font-size: 12px;
}


</style>
