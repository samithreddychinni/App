import {rspack, SwcJsMinimizerRspackPlugin} from '@rspack/core';
/** Runs the actual preview component through the native compiler, inline loader and locked Rspack version. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {transformSync} from 'oxc-transform-react';

import loader from '../../../config/repack/cjs-inline-requires-loader.mjs';
import annotate from '../../../config/rsbuild/loaders/fullstory-annotation-loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const require = createRequire(import.meta.url);
const compilerConfig = require('../../../config/babel/oxcReactCompilerConfig.js');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'report-preview-bundle-'));

async function compile(relativePath, name) {
    const filename = path.join(root, relativePath);
    const source = fs.readFileSync(filename, 'utf8');
    const sourceWithLabels = filename.endsWith('.tsx')
        ? await new Promise((resolve, reject) => {
              annotate.call({resourcePath: filename, sourceMap: false, async: () => (error, output) => (error ? reject(error) : resolve(output))}, source);
          })
        : source;
    const result = transformSync(filename, sourceWithLabels, {
        lang: filename.endsWith('.tsx') ? 'tsx' : 'ts',
        jsx: {runtime: 'automatic', development: false},
        reactCompiler: compilerConfig(),
    });
    assert.equal(result.fatal, false);
    assert.equal(result.errors.length, 0, JSON.stringify(result.errors));
    const code = await new Promise((resolve, reject) => {
        loader.call({resourcePath: filename, sourceMap: false, getOptions: () => ({}), async: () => (error, output) => (error ? reject(error) : resolve(output))}, result.code);
    });
    const output = path.join(scratch, name);
    fs.writeFileSync(output, code);
    return output;
}

try {
    const entry = await compile('src/components/ReportActionItem/MoneyRequestReportPreview/index.tsx', 'preview.cjs');
    const context = await compile('src/pages/inbox/report/ContextMenu/ReportActionContextMenu.ts', 'context.cjs');
    for (const minimize of [false, true]) {
        const compiler = rspack({
            mode: 'production',
            entry,
            target: 'node24',
            resolve: {alias: {'@pages/inbox/report/ContextMenu/ReportActionContextMenu': context}},
            externals: [
                ({request}, callback) =>
                    path.isAbsolute(request) || request === '@pages/inbox/report/ContextMenu/ReportActionContextMenu' ? callback() : callback(null, `commonjs ${request}`),
            ],
            output: {path: scratch, filename: `preview-${minimize}.bundle`, library: {type: 'commonjs2'}},
            optimization: {minimize, minimizer: [new SwcJsMinimizerRspackPlugin({test: /\.bundle$/, extractComments: false})]},
        });
        // Given the native pipeline can change the meaning of an imported ref's optional chain
        await new Promise((resolve, reject) => {
            compiler.run((error, stats) => compiler.close(() => (error || stats.hasErrors() ? reject(error ?? new Error(stats.toString())) : resolve())));
        });
        // When both real compiled handlers execute for null, undefined, opening and closed refs
        const output = execFileSync(process.execPath, [path.join(root, 'tests/regression/issue-105394/assert-preview-guards.cjs'), path.join(scratch, `preview-${minimize}.bundle`)], {
            encoding: 'utf8',
        });
        const cases = JSON.parse(output);
        // Then an absent ref permits navigation while an opening context menu blocks it
        assert.equal(cases.length, 8);
        assert.ok(cases.every((testCase) => !testCase.error));
        console.log(JSON.stringify({minimize, passed: cases.length}));
    }
} finally {
    fs.rmSync(scratch, {recursive: true, force: true});
}
