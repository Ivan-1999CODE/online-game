import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(resolve(root, 'package.json'));

// Compile the production components in memory. Only browser audio and Firebase
// initialization are replaced; React hooks, timers, questions and scoring run as-is.
// QUIZ_TEST_BASELINE=HEAD verifies the regression against committed source without
// overwriting the working tree.
export async function loadQuizComponents() {
    const result = await build({
        stdin: {
            contents: `export { BattleMode, StudyMode, PhraseGroupStudy } from './src/App.jsx';
                export { MistakePractice } from './src/components/MistakeNotebook.jsx';
                export { audioCalls } from './src/utils/audio.js';`,
            resolveDir: root,
            loader: 'js'
        },
        bundle: true,
        write: false,
        platform: 'node',
        format: 'cjs',
        packages: 'external',
        define: { 'import.meta.env.DEV': 'false' },
        plugins: [{
            name: 'quiz-test-boundaries',
            setup(context) {
                context.onLoad({ filter: /[\\/]utils[\\/]audio\.js$/ }, () => ({
                    contents: `export const audioCalls = [];
                        export const speakText = (...args) => audioCalls.push(args);
                        export const playSound = () => {};
                        export const playMusic = () => {};
                        export const stopMusic = () => {};
                        export const setMute = () => {};
                        export const getMuteStatus = () => false;
                        export const setVolume = () => {};
                        export const unlockAudio = () => {};
                        export const getTtsPilotVoice = () => 'cedar';
                        export const setTtsPilotVoice = voice => voice;
                        export { shuffleWith as shuffleArray } from './phrase-library.js';`,
                    loader: 'js', resolveDir: resolve(root, 'src/utils')
                }));
                context.onLoad({ filter: /[\\/]config[\\/]firebase\.(js|jsx)$/ }, () => ({
                    contents: 'export const db = {}; export const auth = {}; export const googleProvider = {};', loader: 'js'
                }));
                context.onLoad({ filter: /[\\/](App|MistakeNotebook)\.jsx$/ }, async ({ path }) => {
                    const source = process.env.QUIZ_TEST_BASELINE
                        ? execFileSync('git', ['show', `${process.env.QUIZ_TEST_BASELINE}:${relative(root, path).replaceAll('\\', '/')}`], { cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 })
                        : await readFile(path, 'utf8');
                    const names = path.endsWith('App.jsx') ? 'BattleMode, StudyMode, PhraseGroupStudy' : 'MistakePractice';
                    return { contents: `${source}\nexport { ${names} };`, loader: 'jsx' };
                });
            }
        }]
    });
    const module = { exports: {} };
    new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports);
    return module.exports;
}
