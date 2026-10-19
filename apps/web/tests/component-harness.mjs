import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const jsxRuntime = require('react/jsx-runtime');

// Exercise real TSX handlers/effects without installing a DOM or making HTTP
// requests. React effect setup/cleanup replay is driven explicitly by each test.
export function componentHarness(relativePath, exportName, { initialState = [], modules = {}, search = '' } = {}) {
  const state = [];
  const references = [];
  const writes = [];
  let stateIndex = 0;
  let referenceIndex = 0;
  let effects = [];
  const Link = ({ children, ...props }) => jsxRuntime.jsx('a', { ...props, children });
  const react = {
    useState(initial) {
      const index = stateIndex++;
      if (!(index in state)) state[index] = index in initialState ? initialState[index] : typeof initial === 'function' ? initial() : initial;
      return [state[index], (value) => {
        state[index] = typeof value === 'function' ? value(state[index]) : value;
        writes.push(index);
      }];
    },
    useRef(initial) {
      const index = referenceIndex++;
      references[index] ??= { current: initial };
      return references[index];
    },
    useEffect(effect) { effects.push(effect); },
    useMemo(factory) { return factory(); },
  };
  const sourcePath = fileURLToPath(new URL(relativePath, import.meta.url));
  const source = readFileSync(sourcePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    fileName: sourcePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  const context = {
    exports,
    require(name) {
      if (Object.hasOwn(modules, name)) return modules[name];
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return jsxRuntime;
      if (name === 'next/link') return Link;
      if (name === 'next/navigation') return { usePathname: () => '/mission-control' };
      if (name.endsWith('/brand')) return { Brand: () => jsxRuntime.jsx(Link, { href: '/', children: 'Only1AI' }) };
      throw new Error(`Unexpected test import: ${name}`);
    },
    window: { location: { search } },
    document: { getElementById: () => null },
    URLSearchParams,
    Error,
    FormData: class {
      constructor(form) { this.fields = form.fields; }
      get(name) { return this.fields[name] ?? null; }
    },
  };
  new vm.Script(compiled, { filename: sourcePath }).runInNewContext(context);
  return {
    state,
    writes,
    render(props = {}) {
      stateIndex = 0;
      referenceIndex = 0;
      effects = [];
      return exports[exportName](props);
    },
    effect(index = 0) { return effects[index]; },
  };
}

export function findElement(tree, predicate) {
  if (!tree || typeof tree !== 'object') return undefined;
  if (Array.isArray(tree)) {
    for (const node of tree) { const result = findElement(node, predicate); if (result) return result; }
    return undefined;
  }
  if (predicate(tree)) return tree;
  return findElement(tree.props?.children, predicate);
}

export function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((complete, fail) => { resolve = complete; reject = fail; });
  return { promise, resolve, reject };
}

export const settle = () => new Promise((resolve) => setImmediate(resolve));
