import 'dotenv/config';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

// En mode watch (dev), on écrit directement dans le HA local si configuré.
// En mode build (prod), on écrit dans dist/ pour les releases.
const isWatch = process.env.ROLLUP_WATCH === 'true';
const haLocalDir = process.env.HA_LOCAL_DIR;
const outputDir = (isWatch && haLocalDir) ? haLocalDir : 'dist';

const isProd = !isWatch;

export default {
  input: 'src/floor-navigator-card.ts',
  output: {
    file: `${outputDir}/floor-navigator.js`,
    format: 'es',
    sourcemap: !isProd,
  },
  plugins: [
    resolve(),
    commonjs(),
    typescript(),
    isProd && terser(),
  ].filter(Boolean),
};
