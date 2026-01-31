// vite.config.ts
import { defineConfig } from "file:///C:/Users/aksha/Downloads/ai%20agent/spinabot-cursor-agent/extension/node_modules/vite/dist/node/index.js";
import { viteStaticCopy } from "file:///C:/Users/aksha/Downloads/ai%20agent/spinabot-cursor-agent/extension/node_modules/vite-plugin-static-copy/dist/index.js";
var vite_config_default = defineConfig({
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        content: "src/content/index.ts",
        background: "src/background/index.ts",
        popup: "src/popup/index.html"
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]"
      }
    }
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: "public/manifest.json",
          dest: "."
        },
        {
          src: "src/content/content.css",
          dest: "."
        }
      ]
    })
  ]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxha3NoYVxcXFxEb3dubG9hZHNcXFxcYWkgYWdlbnRcXFxcc3BpbmFib3QtY3Vyc29yLWFnZW50XFxcXGV4dGVuc2lvblwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcYWtzaGFcXFxcRG93bmxvYWRzXFxcXGFpIGFnZW50XFxcXHNwaW5hYm90LWN1cnNvci1hZ2VudFxcXFxleHRlbnNpb25cXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2Frc2hhL0Rvd25sb2Fkcy9haSUyMGFnZW50L3NwaW5hYm90LWN1cnNvci1hZ2VudC9leHRlbnNpb24vdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcclxuaW1wb3J0IHsgdml0ZVN0YXRpY0NvcHkgfSBmcm9tICd2aXRlLXBsdWdpbi1zdGF0aWMtY29weSc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gICAgYnVpbGQ6IHtcclxuICAgICAgICBvdXREaXI6ICdkaXN0JyxcclxuICAgICAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgICAgICAgIGlucHV0OiB7XHJcbiAgICAgICAgICAgICAgICBjb250ZW50OiAnc3JjL2NvbnRlbnQvaW5kZXgudHMnLFxyXG4gICAgICAgICAgICAgICAgYmFja2dyb3VuZDogJ3NyYy9iYWNrZ3JvdW5kL2luZGV4LnRzJyxcclxuICAgICAgICAgICAgICAgIHBvcHVwOiAnc3JjL3BvcHVwL2luZGV4Lmh0bWwnLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBvdXRwdXQ6IHtcclxuICAgICAgICAgICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnW25hbWVdLmpzJyxcclxuICAgICAgICAgICAgICAgIGNodW5rRmlsZU5hbWVzOiAnW25hbWVdLmpzJyxcclxuICAgICAgICAgICAgICAgIGFzc2V0RmlsZU5hbWVzOiAnW25hbWVdLltleHRdJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgfSxcclxuICAgIHBsdWdpbnM6IFtcclxuICAgICAgICB2aXRlU3RhdGljQ29weSh7XHJcbiAgICAgICAgICAgIHRhcmdldHM6IFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBzcmM6ICdwdWJsaWMvbWFuaWZlc3QuanNvbicsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVzdDogJy4nLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBzcmM6ICdzcmMvY29udGVudC9jb250ZW50LmNzcycsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVzdDogJy4nLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICB9KSxcclxuICAgIF0sXHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXFZLFNBQVMsb0JBQW9CO0FBQ2xhLFNBQVMsc0JBQXNCO0FBRS9CLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQ3hCLE9BQU87QUFBQSxJQUNILFFBQVE7QUFBQSxJQUNSLGVBQWU7QUFBQSxNQUNYLE9BQU87QUFBQSxRQUNILFNBQVM7QUFBQSxRQUNULFlBQVk7QUFBQSxRQUNaLE9BQU87QUFBQSxNQUNYO0FBQUEsTUFDQSxRQUFRO0FBQUEsUUFDSixnQkFBZ0I7QUFBQSxRQUNoQixnQkFBZ0I7QUFBQSxRQUNoQixnQkFBZ0I7QUFBQSxNQUNwQjtBQUFBLElBQ0o7QUFBQSxFQUNKO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDTCxlQUFlO0FBQUEsTUFDWCxTQUFTO0FBQUEsUUFDTDtBQUFBLFVBQ0ksS0FBSztBQUFBLFVBQ0wsTUFBTTtBQUFBLFFBQ1Y7QUFBQSxRQUNBO0FBQUEsVUFDSSxLQUFLO0FBQUEsVUFDTCxNQUFNO0FBQUEsUUFDVjtBQUFBLE1BQ0o7QUFBQSxJQUNKLENBQUM7QUFBQSxFQUNMO0FBQ0osQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
