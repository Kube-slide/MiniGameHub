import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "/MiniGameHub/",

  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),

        "character-selection": resolve(
          __dirname,
          "features/character-selection/character-selection.html"
        ),
      },
    },
  },
});
