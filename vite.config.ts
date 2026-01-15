
import { defineConfig } from 'vite';
import react from '@vitejs/react-swc';

export default defineConfig({
  plugins: [react()],
  define: {
    // Netlify 환경 변수를 전역 process.env 객체로 주입
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  }
});
