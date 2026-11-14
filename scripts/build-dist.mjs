/* Kopiert die Web-App in dist/ fuer den Tauri-Build (nur noetige Dateien). */
import { cpSync, rmSync, mkdirSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });

const files = ['index.html', 'wiki.html', 'manifest.webmanifest', 'sw.js', 'altes_Papier.png'];
for (const f of files) cpSync(f, `dist/${f}`);
for (const d of ['css', 'js', 'icons']) cpSync(d, `dist/${d}`, { recursive: true });

console.log('dist/ erstellt');
