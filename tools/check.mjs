#!/usr/bin/env node
/**
 * Verificación estática del proyecto (sin dependencias):
 *   1. Todos los .js de src/, tools/ y tests/ tienen sintaxis válida.
 *   2. Cada import relativo apunta a un archivo que existe (rutas y mayúsculas/minúsculas).
 *   3. index.html referencia archivos que existen.
 *   4. Existen las carpetas y archivos obligatorios de la estructura.
 *
 * Importante: se comprueban las mayúsculas EXACTAS. En Windows/macOS "Menu.js" y
 * "menu.js" parecen lo mismo, pero en GitHub Pages (Linux) fallaría.
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const errors = [];
let jsCount = 0;
let importCount = 0;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** existsSync distingue mayúsculas solo según el sistema; aquí se fuerza la comparación exacta. */
function existsExact(path) {
  const parent = dirname(path);
  if (!existsSync(parent)) return false;
  return readdirSync(parent).includes(path.slice(parent.length + 1));
}

function existsExactDeep(path) {
  const rel = relative(ROOT, path).split(/[\\/]/);
  let cur = ROOT;
  for (const part of rel) {
    if (!readdirSync(cur).includes(part)) return false;
    cur = join(cur, part);
  }
  return true;
}

// 1 y 2: sintaxis e imports
for (const dir of ['src', 'tools', 'tests']) {
  for (const file of walk(join(ROOT, dir)).filter((f) => /\.(m?js)$/.test(f))) {
    jsCount++;
    const rel = relative(ROOT, file);
    try {
      execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    } catch (e) {
      errors.push(`Sintaxis inválida en ${rel}:\n${e.stderr?.toString().split('\n').slice(0, 4).join('\n')}`);
      continue;
    }
    const code = readFileSync(file, 'utf8');
    const re = /(?:^|\n)\s*(?:import|export)\s[^'"\n]*?from\s*['"]([^'"]+)['"]|(?:^|\n)\s*import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
    for (const m of code.matchAll(re)) {
      const spec = m[1] ?? m[2] ?? m[3];
      if (!spec.startsWith('.')) continue; // módulos nativos de Node (node:...) no se comprueban
      importCount++;
      const target = resolve(dirname(file), spec);
      if (!existsSync(target) || !existsExactDeep(target)) errors.push(`${rel}: import roto → "${spec}"`);
    }
  }
}

// 3: index.html
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
for (const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if (/^(https?:)?\/\//.test(m[1]) || m[1].startsWith('data:')) continue; // URLs externas y data: no son archivos del proyecto
  if (!existsExactDeep(resolve(ROOT, m[1]))) errors.push(`index.html: referencia rota → "${m[1]}"`);
}

// 4: estructura obligatoria
const REQUIRED = [
  'README.md',
  'index.html',
  'css/main.css',
  'src/main.js',
  'src/config/config.js',
  'src/engine/Game.js',
  'src/characters/Player.js',
  'src/levels/LevelManager.js',
  'src/ui/Menu.js',
  'src/animation/Animator.js',
  'src/audio/AudioManager.js',
  'src/save/SaveManager.js',
  'assets/graphics/README.md',
  'assets/audio/README.md',
  'docs/ARQUITECTURA.md',
  'docs/DECISIONES.md',
  'docs/GITHUB.md',
];
for (const f of REQUIRED) if (!existsExact(join(ROOT, f)) && !existsExactDeep(join(ROOT, f))) errors.push(`Falta archivo obligatorio: ${f}`);

if (errors.length) {
  console.error(`✘ ${errors.length} problema(s):\n` + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log(`✔ Estructura correcta: ${jsCount} archivos JS con sintaxis válida, ${importCount} imports resueltos, index.html y archivos obligatorios presentes.`);
