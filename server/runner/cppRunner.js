// server/runner/cppRunner.js
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const GPP_PATH = fs.existsSync('C:\\mingw64\\bin\\g++.exe') ? 'C:\\mingw64\\bin\\g++.exe' : 'g++';

/**
 * Compile and run C++ code via MinGW g++
 * @param {string} code - The C++ source code
 * @param {string} stdin - Input data sent to stdin
 * @param {number} timeoutMs - Timeout for execution in ms (default 3000)
 * @returns {Promise<{ stdout: string, stderr: string, executionTimeMs: number, exitCode: number }>}
 */
async function runCpp(code, stdin = '', timeoutMs = 3000) {
  const startTime = Date.now();
  const tempDir = path.join(os.tmpdir(), 'dev_academy_cpp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const baseId = `cpp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const srcFile = path.join(tempDir, `${baseId}.cpp`);
  const exeFile = path.join(tempDir, `${baseId}.exe`);

  fs.writeFileSync(srcFile, code, 'utf8');

  // Step 1: Compile with g++
  const compileResult = await new Promise((resolve) => {
    exec(`"${GPP_PATH}" -std=c++17 -O2 "${srcFile}" -o "${exeFile}"`, { timeout: 10000 }, (err, stdout, stderr) => {
      if (err) {
        resolve({
          success: false,
          error: stderr || stdout || err.message
        });
      } else {
        resolve({ success: true });
      }
    });
  });

  if (!compileResult.success) {
    try {
      if (fs.existsSync(srcFile)) fs.unlinkSync(srcFile);
    } catch (e) {}

    return {
      stdout: '',
      stderr: `[Lỗi Biên Dịch C++ (Compilation Error)]:\n${compileResult.error}`,
      executionTimeMs: Date.now() - startTime,
      exitCode: 1
    };
  }

  // Step 2: Execute compiled binary
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let isKilled = false;

    const proc = spawn(exeFile, [], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const timer = setTimeout(() => {
      isKilled = true;
      proc.kill('SIGKILL');
      stderr += '\n[Lỗi giới hạn thời gian (Time Limit Exceeded)]: Quá trình thực thi vượt quá thời gian tối đa.';
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
      // Clean up files
      setTimeout(() => {
        try {
          if (fs.existsSync(srcFile)) fs.unlinkSync(srcFile);
          if (fs.existsSync(exeFile)) fs.unlinkSync(exeFile);
        } catch (e) {}
      }, 100);

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
        if (fs.existsSync(srcFile)) fs.unlinkSync(srcFile);
        if (fs.existsSync(exeFile)) fs.unlinkSync(exeFile);
      } catch (e) {}

      resolve({
        stdout: '',
        stderr: `Không thể thực thi chương trình: ${err.message}`,
        executionTimeMs: Date.now() - startTime,
        exitCode: 1
      });
    });
  });
}

module.exports = { runCpp };
