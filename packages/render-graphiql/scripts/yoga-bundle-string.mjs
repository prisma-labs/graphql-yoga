import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const directoryName = path.dirname(fileURLToPath(import.meta.url));
const inputPath = path.resolve(directoryName, '..', '..', 'graphiql', 'dist');
const jsFile = path.resolve(inputPath, 'yoga-graphiql.umd.js');
const cssFile = path.resolve(inputPath, 'graphiql.css');
const faviconFile = path.resolve(directoryName, '../../../website/src/app/favicon.ico');

const outFile = path.resolve(directoryName, '..', 'src', 'graphiql.ts');

const [jsContents, cssContents, faviconContents] = await Promise.all([
  fs.promises.readFile(jsFile, 'utf-8'),
  fs.promises.readFile(cssFile, 'utf-8'),
  fs.promises.readFile(faviconFile, 'base64'),
]);

await fs.promises.writeFile(
  outFile,
  [
    `export const js: string = ${JSON.stringify(jsContents)}`,
    `export const css: string = ${JSON.stringify(cssContents)}`,
    `export const favicon: string = ${JSON.stringify(
      `data:image/x-icon;base64,${faviconContents}`,
    )}`,
  ].join('\n'),
);
