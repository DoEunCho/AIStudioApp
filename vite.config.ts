
import { defineConfig } from 'vite';
import react from '@vitejs/react-swc';

export default defineConfig({
  plugins: [react()],
  define: {
    // Netlify 환경 변수를 process.env.API_KEY로 사용할 수 있게 주입
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
  },
  build: {
    outDir: 'dist',
  }
});
