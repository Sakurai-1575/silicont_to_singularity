import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/silicon-to-singularity/",
  plugins: [react()],
});