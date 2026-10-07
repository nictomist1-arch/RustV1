<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";

defineProps<{
  src: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    emit("close");
  }
}

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
  document.body.style.overflow = "hidden";
});

onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
  document.body.style.overflow = "";
});
</script>

<template>
  <Teleport to="body">
    <div
      class="lightbox"
      role="dialog"
      aria-modal="true"
      @click="emit('close')"
    >
      <button
        type="button"
        class="lightbox-close"
        aria-label="Закрыть"
        @click.stop="emit('close')"
      >
        ×
      </button>
      <img
        class="lightbox-image"
        :src="src"
        alt=""
        @click.stop
      />
    </div>
  </Teleport>
</template>

<style scoped>
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: rgba(10, 12, 16, 0.45);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  cursor: zoom-out;
}

.lightbox-image {
  max-width: min(92vw, 1200px);
  max-height: 90vh;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
  cursor: default;
}

.lightbox-close {
  position: absolute;
  top: 18px;
  right: 22px;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(32, 35, 42, 0.85);
  color: var(--text);
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}

.lightbox-close:hover {
  background: rgba(50, 54, 64, 0.95);
}
</style>
