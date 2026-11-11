import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    define: {
      "process.env.NEXT_PUBLIC_SUPABASE_URL": JSON.stringify(
        env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
      ),
      "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": JSON.stringify(
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
      ),
      "process.env.NEXT_PUBLIC_APP_URL": JSON.stringify(
        env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || ""
      ),
      "process.env.SUPABASE_SERVICE_ROLE_KEY": JSON.stringify(
        env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ""
      ),
      "process.env": "{}",
    },
    plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
    resolve: {
      alias: {
        "@/app": path.resolve(__dirname, "./src/app_views"),
        "next/link": path.resolve(__dirname, "./src/shims/next-link.tsx"),
        "next/image": path.resolve(__dirname, "./src/shims/next-image.tsx"),
        "next/navigation": path.resolve(__dirname, "./src/shims/next-navigation.ts"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: 3000,
    },
  };
});
