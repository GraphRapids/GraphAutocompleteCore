import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.js'],
  outfile: 'dist/index.js',
  bundle: true,
  format: 'esm',
  target: 'es2020',
  sourcemap: true,
  external: ['js-yaml'],
});
