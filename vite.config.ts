import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({base:'./',plugins:[react(),VitePWA({registerType:'prompt',includeAssets:['apple-touch-icon.png'],manifest:{name:'こもれび鍛錬記',short_name:'こもれび',description:'モクと育てる、日々の鍛錬手帳',lang:'ja',theme_color:'#284d3e',background_color:'#f6f1e5',display:'standalone',start_url:'./',scope:'./',icons:[{src:'icon-192.png',sizes:'192x192',type:'image/png'},{src:'icon-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}]},workbox:{globPatterns:['**/*.{js,css,html,png,svg,woff2}'],navigateFallback:'index.html'}})]});
