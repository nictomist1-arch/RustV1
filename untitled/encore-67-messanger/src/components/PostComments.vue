<script setup lang="ts">
import { ref, watch } from "vue";

import { getFileUrl } from "../types/file";

import type { PostComment } from "../types/comment";

const props = defineProps<{
  comments: PostComment[];
  selected: boolean;
}>();

const isOpen = ref(false);
watch(() => props.selected, selected => {
  if (selected){
    isOpen.value = true;
  }
}, { immediate: true });
</script>

<template>
  <section class="post-comments" aria-label="Комментарии к посту">
    <button
      type="button"
      class="post-comments__toggle"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      Комментарии · {{ comments.length }}
    </button>

    <div v-if="isOpen" class="post-comments__content">
      <p v-if="comments.length === 0" class="post-comments__empty">
        Пока нет комментариев.
      </p>

      <article v-for="comment in comments" :key="comment.id" class="comment">
        <img
          v-if="comment.author_avatar"
          class="comment__avatar"
          :src="getFileUrl(comment.author_avatar)"
          alt=""
        />
        <div class="comment__content">
          <strong>{{ comment.author_name }}</strong>
          <p>{{ comment.body }}</p>
          <time>{{ comment.created_at }}</time>
        </div>
      </article>

    </div>
  </section>
</template>

<style scoped>
.post-comments{
  margin-top: 8px;
  min-width: 0;
}

.post-comments__toggle{
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--input);
  color: var(--text);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.post-comments__toggle:hover{
  background: var(--hover);
}

.post-comments__content{
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
}

.post-comments__empty{
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.comment{
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.comment__avatar{
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
}

.comment__content{
  min-width: 0;
  font-size: 14px;
  overflow-wrap: anywhere;
}

.comment__content p{
  margin: 4px 0;
  line-height: 1.45;
  white-space: pre-wrap;
}

.comment__content time{
  color: var(--muted);
  font-size: 11px;
}


button:focus-visible{
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
</style>

