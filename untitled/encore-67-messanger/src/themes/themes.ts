import { ref } from "vue";
import "./themes.css";
export type Theme = "dark" | "pink" | "light";
export const themes: { id: Theme; title: string }[] = [
  { id: "dark", title: "Тёмная" },
  { id: "pink", title: "Розовая" },
  { id: "light", title: "Светлая" },
];
function readTheme(): Theme {
  try {
    const stored = localStorage.getItem("messenger-theme");
    if (stored === "pink" || stored === "light") return stored;
  } catch {}
  return "dark";
}
export const currentTheme = ref<Theme>(readTheme());
document.documentElement.dataset.theme = currentTheme.value;
export function setTheme(theme: Theme) {
  currentTheme.value = theme;
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem("messenger-theme", theme); } catch {}
}
