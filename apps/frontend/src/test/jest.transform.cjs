/**
 * jest.transform.cjs
 *
 * A lightweight Jest transformer that pre-processes source files before
 * handing them to ts-jest. Its sole job is replacing Vite-specific
 * `import.meta.env` references (which Node/ts-jest cannot parse in CJS mode)
 * with `undefined`, so the `|| fallback` in source files fires and tests use
 * the jsdom-provided window.location.origin ('http://localhost').
 */

const { TsJestTransformer } = require('ts-jest');

const transformer = new TsJestTransformer({
  tsconfig: require('path').resolve(__dirname, '../../tsconfig.test.json'),
  diagnostics: false,
});

function patchImportMeta(source) {
  // Replace import.meta.env.ANYTHING (and bare import.meta.env) with undefined
  return source.replace(/import\.meta\.env(\.\w+)*/g, 'undefined');
}

module.exports = {
  process(sourceText, sourcePath, options) {
    return transformer.process(patchImportMeta(sourceText), sourcePath, options);
  },
  getCacheKey(sourceText, sourcePath, options) {
    if (typeof transformer.getCacheKey === 'function') {
      return transformer.getCacheKey(patchImportMeta(sourceText), sourcePath, options);
    }
    return String(Date.now());
  },
};
