import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve('public/avatars');
const avatars = [
  ['Carmesí', '#7f1d1d', '#d4aa6a', 'M50 24a17 17 0 1 1 0 34 17 17 0 0 1 1 0-34zm-30 67c2-20 15-30 30-30s28 10 30 30'],
  ['Marfil', '#4b3a2c', '#ead8b4', 'M50 23c11 0 19 9 19 20S61 62 50 62 31 54 31 43s8-20 19-20zM17 91c2-21 16-31 33-31s31 10 33 31'],
  ['Obsidiana', '#111827', '#9ca3af', 'M50 22c12 0 20 9 20 21S62 64 50 64 30 55 30 43s8-21 20-21zM14 92c3-22 17-32 36-32s33 10 36 32'],
  ['Ámbar', '#78350f', '#f6c75e', 'M50 22c11 0 20 10 20 21S61 64 50 64 30 55 30 43s9-21 20-21zM15 92c3-21 17-32 35-32s32 11 35 32'],
  ['Ceniza', '#374151', '#d1d5db', 'M50 24c12 0 20 9 20 20S62 63 50 63 30 55 30 44s8-20 20-20zM16 91c3-20 17-30 34-30s31 10 34 30'],
  ['Violeta', '#4c1d95', '#d8b4fe', 'M50 22c12 0 20 9 20 21S62 64 50 64 30 55 30 43s8-21 20-21zM15 92c2-21 16-32 35-32s33 11 35 32'],
];

await mkdir(output, { recursive: true });
await Promise.all(avatars.map(async ([name, background, fill, silhouette], index) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Silueta ${name}"><rect width="100" height="100" fill="${background}"/><circle cx="50" cy="50" r="43" fill="none" stroke="${fill}" stroke-width="2"/><path d="${silhouette}" fill="${fill}"/></svg>`;
  await writeFile(resolve(output, `avatar-${index + 1}.svg`), svg, 'utf8');
}));

console.log(`Created ${avatars.length} profile avatars in ${output}`);
