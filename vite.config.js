import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Esto asegura que las rutas generadas en el build sean relativas (ideal para subcarpetas o GitHub Pages)
});
