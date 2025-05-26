import { create } from 'zustand'

export const useThemeStore = create((set) => ({
    theme: localStorage.getItem("swf-theme") || "coffee",
    setTheme: (theme) => {
        localStorage.setItem("swf-theme",theme);
        set({ theme })
    },
}));

