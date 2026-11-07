import { build } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

const destination = resolve(process.argv[2] || 'public/email-templates/presets.json');
const output = await build({ configFile: false, logLevel: 'error', build: { ssr: 'src/email/templates.ts', write: false, minify: false } });
const chunk = output.output.find(item => item.type === 'chunk');
const { createEmailPresets } = await import(`data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`);
const locale = JSON.parse(await readFile('src/i18n/locales/zh-CN.json', 'utf8'));
const templates = createEmailPresets(id => locale.emailTemplates.scenes[id]);
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, JSON.stringify(templates, null, 2) + '\n');
console.log(`Exported ${templates.length} templates to ${destination}`);
