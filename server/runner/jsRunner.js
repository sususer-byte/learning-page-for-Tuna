// server/runner/jsRunner.js
const vm = require('vm');

/**
 * Execute JavaScript code in an isolated VM context
 * @param {string} code - The JS code to run
 * @param {string} stdin - Optional input data
 * @param {number} timeoutMs - Max execution time in ms (default 2000)
 * @returns {Promise<{ stdout: string, stderr: string, executionTimeMs: number, exitCode: number }>}
 */
async function runJS(code, stdin = '', timeoutMs = 2000) {
  const startTime = Date.now();
  let logs = [];
  let errors = [];

  const sandbox = {
    console: {
      log: (...args) => {
        logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
      },
      error: (...args) => {
        errors.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
      },
      warn: (...args) => {
        logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
      },
      info: (...args) => {
        logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
      }
    },
    Math,
    Date,
    JSON,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURI,
    decodeURI,
    encodeURIComponent,
    decodeURIComponent,
    Set,
    Map,
    WeakSet,
    WeakMap,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    TypeError,
    RangeError,
    SyntaxError,
    Promise,
    stdin: String(stdin || '')
  };

  try {
    const context = vm.createContext(sandbox);
    const script = new vm.Script(code);
    script.runInContext(context, { timeout: timeoutMs });
    
    const executionTimeMs = Date.now() - startTime;
    return {
      stdout: logs.join('\n'),
      stderr: errors.join('\n'),
      executionTimeMs,
      exitCode: 0
    };
  } catch (err) {
    const executionTimeMs = Date.now() - startTime;
    return {
      stdout: logs.join('\n'),
      stderr: (errors.length ? errors.join('\n') + '\n' : '') + err.message,
      executionTimeMs,
      exitCode: 1
    };
  }
}

module.exports = { runJS };
