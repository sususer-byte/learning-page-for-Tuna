// assets/pyodide/python_worker.js
// Dev Academy Offline Pyodide Execution Worker

let pyodide = null;
let stdoutBuffer = '';
let stderrBuffer = '';
let batchTimeout = null;

function flushBuffers() {
  if (stdoutBuffer) {
    self.postMessage({ type: 'stdout', text: stdoutBuffer });
    stdoutBuffer = '';
  }
  if (stderrBuffer) {
    self.postMessage({ type: 'stderr', text: stderrBuffer });
    stderrBuffer = '';
  }
  batchTimeout = null;
}

function scheduleFlush() {
  if (!batchTimeout) {
    batchTimeout = setTimeout(flushBuffers, 16);
  }
}

async function initPyodide() {
  if (pyodide) return pyodide;
  
  self.postMessage({ type: 'status', message: 'Đang khởi động Python...', progress: 30 });
  
  importScripts('./pyodide.js');
  
  self.postMessage({ type: 'status', message: 'Đang nạp WASM & Stdlib...', progress: 70 });
  
  pyodide = await loadPyodide({
    indexURL: './'
  });

  pyodide.setStdout({
    batched: (text) => {
      stdoutBuffer += text + '\n';
      scheduleFlush();
    }
  });

  pyodide.setStderr({
    batched: (text) => {
      stderrBuffer += text + '\n';
      scheduleFlush();
    }
  });

  pyodide.setStdin({
    isatty: true,
    read: () => {
      throw new Error('input() chưa được hỗ trợ trong môi trường này');
    }
  });

  self.postMessage({ type: 'status', message: 'Môi trường Python sẵn sàng', progress: 100 });
  return pyodide;
}

self.onmessage = async (e) => {
  const { type, code, id } = e.data;

  if (type === 'init') {
    try {
      await initPyodide();
      self.postMessage({ type: 'init_done', id });
    } catch (err) {
      self.postMessage({ type: 'init_error', error: err.message, id });
    }
    return;
  }

  if (type === 'run') {
    const startTime = performance.now();
    try {
      const py = await initPyodide();

      // Normalize CRLF to LF, keep tabs and indents
      const cleanCode = (code || '').replace(/\r\n/g, '\n');

      await py.runPythonAsync(cleanCode);

      // Force flush any remaining buffered output
      flushBuffers();

      const elapsedMs = Math.round(performance.now() - startTime);
      self.postMessage({
        type: 'done',
        exitCode: 0,
        executionTimeMs: elapsedMs,
        id
      });
    } catch (err) {
      // Check for ModuleNotFoundError
      const errMsg = err.message || String(err);
      const modMatch = errMsg.match(/ModuleNotFoundError:\s*No module named '([^']+)'/);
      if (modMatch) {
        stderrBuffer += '\n[Lỗi Module]: Thư viện \'' + modMatch[1] + '\' không khả dụng trong sandbox trình duyệt.\n';
      } else {
        stderrBuffer += errMsg + '\n';
      }

      flushBuffers();

      const elapsedMs = Math.round(performance.now() - startTime);
      self.postMessage({
        type: 'done',
        exitCode: 1,
        error: errMsg,
        executionTimeMs: elapsedMs,
        id
      });
    }
  }
};
