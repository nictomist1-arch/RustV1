<script setup lang="ts">
import {
  nextTick,
  onMounted,
  useTemplateRef,
  watch,
} from "vue";

import MessageBubble from "./MessageBubble.vue";
import PostComments from "./PostComments.vue";
import type { PostComment } from "../types/comment";

import type {Message} from "../types/message.ts";

const props = defineProps<{
  messages: Message[];
  currentUserId: number;
  readOnly: boolean;
  isChannel: boolean;
  comments: PostComment[];
  commentingPostId: number | null;
}>();

const emit = defineEmits<{
  edit: [message: Message];
  delete: [messageId: number];
  comment: [message: Message];
}>();

const bottomAnchor = useTemplateRef<HTMLDivElement>("bottom-anchor");

async function scrollToBottom(){
  await nextTick();

  bottomAnchor.value?.scrollIntoView({
    behavior: "smooth",
    block: "end",
  });
}

function getMessageCount(){
  return props.messages.length;
}

watch(
    getMessageCount,
    scrollToBottom,
);

onMounted(scrollToBottom);
</script>

<template>
  <div class="messages">
    <div class="messages-inner">
      <div
          v-if="messages.length === 0"
          class="empty"
      >
        <strong> Здесь пока пусто </strong>
        <span>{{ readOnly ? 'Постов пока нет' : 'Напишите первое сообщение' }}</span>
      </div>
      <MessageBubble
          v-for="message in messages"
          :key="message.id"
          :message="message"
          :is-own="message.author_id === currentUserId"
          :read-only="readOnly"
          :is-channel="isChannel"
          @edit="emit('edit', message)"
          @delete="emit('delete', message.id)"
          @comment="emit('comment', message)"
      >
        <template v-if="isChannel" #comments>
          <PostComments
            :comments="comments.filter(comment => comment.message_id === message.id)"
            :selected="commentingPostId === message.id"
          />
        </template>
      </MessageBubble>
      <div
        ref="bottom-anchor"
        class="bottom-anchor"
        aria-hidden="true"
      >
      </div>
    </div>
  </div>
</template>

<style scoped>
.bottom-anchor{
  height: 1px;
  flex-shrink: 0;
}

.messages{
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.messages-inner{
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 10px;
}

.empty{
  margin: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: center;
  color: var(--muted);
}

</style>
