import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set environment variables for GitHub Pages build
process.env.VITE_BASE_URL = '/Slay-the-Saturn/';
process.env.VITE_BUILD_DIR = '../../../docs';

// Run vite build
const vite = spawn('vite', ['build'], {
  stdio: 'inherit',
  shell: true,
  env: process.env
});

vite.on('close', (code) => {
  process.exit(code);
});
