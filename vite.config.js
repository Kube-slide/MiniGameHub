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

        "absolute-monopoly": resolve(
          __dirname,
          "features/absolute-monopoly/absolute-monopoly.html"
        ),
        "cookie-clicker": resolve(
          __dirname,
          "features/cookie-clicker/cookie-clicker.html"
        ),
        "main-menu": resolve(__dirname, "features/main-menu/main-menu.html"),
        "the-shop": resolve(__dirname, "features/the-shop/the-shop.html"),
        "generic-fps-shooter": resolve(
          __dirname,
          "features/generic-fps-shooter/lobby.html"
        ),
      },
    },
  },
});
