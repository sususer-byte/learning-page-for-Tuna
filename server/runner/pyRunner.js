// server/runner/pyRunner.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Execute Python code via local python.exe
 * @param {string} code - The Python code to execute
 * @param {string} stdin - Input data sent to stdin
 * @param {number} timeoutMs - Timeout in milliseconds (default 3000ms)
 * @returns {Promise<{ stdout: string, stderr: string, executionTimeMs: number, exitCode: number }>}
 */
async function runPython(code, stdin = '', timeoutMs = 3000) {
  const startTime = Date.now();
  const tempDir = path.join(os.tmpdir(), 'dev_academy_py');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempFile = path.join(tempDir, `script_${Date.now()}_${Math.random().toString(36).slice(2)}.py`);
  
  // Prepend UTF-8 encoding declaration if needed
  const codeWithEncoding = `# -*- coding: utf-8 -*-\nimport sys\nimport io\nsys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')\nsys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')\n\n` + code;
  
  fs.writeFileSync(tempFile, codeWithEncoding, 'utf8');

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let isKilled = false;

    // Use python executable
    const proc = spawn('python', [tempFile], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    const timer = setTimeout(() => {
      isKilled = true;
      proc.kill('SIGKILL');
      stderr += '\n[Lỗi giới hạn thời gian (Time Limit Exceeded)]: Quá trình chạy bị dừng do vượt quá thời gian tối đa.';
    }, timeoutMs);

    if (stdin) {
      proc.stdin.write(stdin);
    }
    proc.stdin.end();

    proc.stdout.on('data', (data) => {
      stdout += data.toString('utf8');
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString('utf8');
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      } catch (e) {}

      resolve({
        stdout: stdout.trimEnd(),
        stderr: stderr.trimEnd(),
        executionTimeMs: Date.now() - startTime,
        exitCode: isKilled ? 124 : (code ?? 0)
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      } catch (e) {}

      resolve({
        stdout: '',
        stderr: `Không thể khởi động trình thông dịch Python: ${err.message}`,
        executionTimeMs: Date.now() - startTime,
        exitCode: 1
      });
    });
  });
}

module.exports = { runPython };
