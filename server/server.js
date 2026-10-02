// server/server.js - Dev Academy Local Engine
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { runJS } = require('./runner/jsRunner');
const { runPython } = require('./runner/pyRunner');
const { runCpp } = require('./runner/cppRunner');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Path configurations
const DATA_DIR = path.join(__dirname, 'data');
const CURRICULUM_FILE = path.join(DATA_DIR, 'curriculum.json');
const PIPELINES_FILE = path.join(DATA_DIR, 'pipelines.json');
const EXAMS_PUBLIC_FILE = path.join(DATA_DIR, 'exams_public.json');
const EXAM_SECRETS_FILE = path.join(DATA_DIR, 'exam_secrets.json');
const PROGRESS_FILE = path.join(DATA_DIR, 'user_progress.json');

// Ensure progress file exists
if (!fs.existsSync(PROGRESS_FILE)) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify({
    completed_lessons: [],
    completed_milestones: [],
    exam_results: {}
  }, null, 2), 'utf8');
}

function readJSON(filePath, fallback = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

// =========================================================================
// API ENDPOINTS
// =========================================================================

// 1. Get Track Lists
app.get('/api/tracks', (req, res) => {
  const pipelines = readJSON(PIPELINES_FILE);
  const tracks = Object.values(pipelines).map(t => ({
    track_id: t.track_id,
    track_title: t.track_title,
    description: t.description,
    sub_tracks: t.sub_tracks || null
  }));
  res.json({ success: true, tracks });
});

// 2. Get Curriculum
app.get('/api/curriculum/:trackId', (req, res) => {
  const { trackId } = req.params;
  const curriculum = readJSON(CURRICULUM_FILE);
  const trackData = curriculum[trackId];
  if (!trackData) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy lộ trình.' });
  }
  res.json({ success: true, curriculum: trackData });
});

// 3. Get Pipeline Milestones
app.get('/api/pipeline/:trackId', (req, res) => {
  const { trackId } = req.params;
  const pipelines = readJSON(PIPELINES_FILE);
  const pipeline = pipelines[trackId];
  if (!pipeline) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy dữ liệu pipeline.' });
  }
  res.json({ success: true, pipeline });
});

// 4. Get Public Exam (Strictly NO hidden tests, NO solutions)
app.get('/api/exam/:examId', (req, res) => {
  const { examId } = req.params;
  const exams = readJSON(EXAMS_PUBLIC_FILE);
  const exam = exams[examId];
  if (!exam) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy đề thi.' });
  }

  // Double check sanitize to make sure zero leak
  const sanitized = JSON.parse(JSON.stringify(exam));
  if (sanitized.coding_questions) {
    sanitized.coding_questions.forEach(q => {
      delete q.hidden_test_cases;
      delete q.reference_solution;
      delete q.solution;
    });
  }
  res.json({ success: true, exam: sanitized });
});

// 5. Sandbox Code Execution (Direct Runner)
app.post('/api/run', async (req, res) => {
  const { lang, code, stdin = '' } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ success: false, error: 'Mã nguồn không hợp lệ.' });
  }

  try {
    let result;
    if (lang === 'javascript' || lang === 'js') {
      result = await runJS(code, stdin);
    } else if (lang === 'python' || lang === 'py') {
      result = await runPython(code, stdin);
    } else if (lang === 'cpp' || lang === 'c++') {
      result = await runCpp(code, stdin);
    } else {
      return res.status(400).json({ success: false, error: `Ngôn ngữ '${lang}' không được hỗ trợ.` });
    }
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Submit Exam & Grade Against Secret Test Cases
app.post('/api/exam/:examId/submit', async (req, res) => {
  const { examId } = req.params;
  const { mc_answers = {}, coding_submissions = {} } = req.body;

  const examsPublic = readJSON(EXAMS_PUBLIC_FILE);
  const examSecrets = readJSON(EXAM_SECRETS_FILE);

  const publicData = examsPublic[examId];
  const secretData = examSecrets[examId];

  if (!publicData || !secretData) {
    return res.status(404).json({ success: false, error: 'Đề thi hoặc bộ chấm bí mật không tồn tại.' });
  }

  // Grade Multiple Choice
  let mcTotal = 0;
  let mcCorrect = 0;
  const mcResults = {};

  if (publicData.multiple_choice) {
    publicData.multiple_choice.forEach(mc => {
      mcTotal++;
      const userChoice = mc_answers[mc.id];
      const secret = secretData.mc_answers[mc.id];
      const isCorrect = secret && userChoice === secret.correct_index;
      if (isCorrect) mcCorrect++;
      mcResults[mc.id] = {
        is_correct: Boolean(isCorrect),
        user_choice: userChoice,
        correct_index: secret ? secret.correct_index : null,
        explanation: secret ? secret.explanation : ''
      };
    });
  }

  // Grade Coding Questions
  const codingResults = {};
  let codingTotal = 0;
  let codingPassedCount = 0;

  for (const q of publicData.coding_questions) {
    codingTotal++;
    const qIndex = String(q.index);
    const userCode = coding_submissions[qIndex] || '';
    const qSecret = secretData.coding_secrets ? secretData.coding_secrets[qIndex] : null;

    if (!userCode.trim()) {
      codingResults[qIndex] = {
        title: q.title,
        status: 'Empty',
        passed: false,
        sample_passed: false,
        hidden_passed: false,
        details: 'Chưa có mã nguồn nộp cho câu này.'
      };
      continue;
    }

    // Test execution against hidden test cases
    let allSamplePassed = true;
    let allHiddenPassed = true;
    const testDetails = [];

    if (qSecret && qSecret.hidden_test_cases) {
      for (let i = 0; i < qSecret.hidden_test_cases.length; i++) {
        const tc = qSecret.hidden_test_cases[i];
        let execResult;

        if (q.language === 'cpp') {
          // Replace placeholder or combine with wrapper
          const fullCode = tc.test_wrapper ? tc.test_wrapper.replace('// USER_CODE_HERE', userCode) : `${userCode}\n${tc.eval_code || ''}`;
          execResult = await runCpp(fullCode, '', qSecret.time_limit_ms || 3000);
        } else if (q.language === 'python') {
          const fullCode = `${userCode}\n\n${tc.eval_code || ''}`;
          execResult = await runPython(fullCode, '', qSecret.time_limit_ms || 2000);
        } else {
          // JavaScript
          const fullCode = `${userCode}\n\n${tc.eval_code || ''}`;
          execResult = await runJS(fullCode, '', qSecret.time_limit_ms || 1500);
        }

        const actualOut = (execResult.stdout || '').trim();
        const expectedOut = (tc.expected_output || '').trim();
        const passed = execResult.exitCode === 0 && actualOut === expectedOut;

        if (!passed) {
          allHiddenPassed = false;
        }

        testDetails.push({
          test_index: i + 1,
          description: tc.description,
          passed: passed,
          error: execResult.stderr ? execResult.stderr.slice(0, 300) : null
        });
      }
    }

    const questionPassed = allSamplePassed && allHiddenPassed;
    if (questionPassed) codingPassedCount++;

    codingResults[qIndex] = {
      title: q.title,
      difficulty: q.difficulty,
      status: questionPassed ? 'Passed' : 'Failed',
      passed: questionPassed,
      hidden_passed: allHiddenPassed,
      tests: testDetails
    };
  }

  // Calculate final score: MC = 40%, Coding = 60%
  const mcScore = mcTotal > 0 ? (mcCorrect / mcTotal) * 40 : 40;
  const codingScore = codingTotal > 0 ? (codingPassedCount / codingTotal) * 60 : 60;
  const totalScore = Math.round(mcScore + codingScore);
  const isPassed = totalScore >= 70; // 70/100 threshold

  // Record submission in persistent progress
  const progress = readJSON(PROGRESS_FILE);
  progress.exam_results[examId] = {
    submitted_at: new Date().toISOString(),
    score: totalScore,
    passed: isPassed,
    mcCorrect,
    mcTotal,
    codingPassedCount,
    codingTotal
  };
  if (isPassed && publicData.milestone_id) {
    if (!progress.completed_milestones.includes(publicData.milestone_id)) {
      progress.completed_milestones.push(publicData.milestone_id);
    }
  }
  writeJSON(PROGRESS_FILE, progress);

  res.json({
    success: true,
    total_score: totalScore,
    passed: isPassed,
    mc_summary: { correct: mcCorrect, total: mcTotal, score_earned: Math.round(mcScore) },
    coding_summary: { passed: codingPassedCount, total: codingTotal, score_earned: Math.round(codingScore) },
    mc_results: mcResults,
    coding_results: codingResults
  });
});

// 7. Get Official Model Solutions (Only if submitted or completed)
app.get('/api/exam/:examId/solutions', (req, res) => {
  const { examId } = req.params;
  const progress = readJSON(PROGRESS_FILE);

  // Check if exam is submitted
  const isCompleted = progress.exam_results && progress.exam_results[examId];
  if (!isCompleted && req.query.force !== 'true') {
    return res.status(403).json({
      success: false,
      error: 'Bảo mật đề thi: Bạn chỉ có thể xem lời giải mẫu sau khi đã nộp bài thi hoặc hết thời gian làm bài.'
    });
  }

  const examSecrets = readJSON(EXAM_SECRETS_FILE);
  const secrets = examSecrets[examId];
  if (!secrets) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy đáp án mẫu.' });
  }

  res.json({
    success: true,
    exam_id: examId,
    mc_solutions: secrets.mc_answers,
    coding_solutions: secrets.coding_secrets
  });
});

// 8. User Progress Management
app.get('/api/progress', (req, res) => {
  const progress = readJSON(PROGRESS_FILE);
  res.json({ success: true, progress });
});

app.post('/api/progress', (req, res) => {
  const { lesson_id, milestone_id } = req.body;
  const progress = readJSON(PROGRESS_FILE);

  if (lesson_id && !progress.completed_lessons.includes(lesson_id)) {
    progress.completed_lessons.push(lesson_id);
  }
  if (milestone_id && !progress.completed_milestones.includes(milestone_id)) {
    progress.completed_milestones.push(milestone_id);
  }
  writeJSON(PROGRESS_FILE, progress);
  res.json({ success: true, progress });
});

// =========================================================================
// STATIC ASSETS & FALLBACK ROUTING
// =========================================================================
const CLIENT_ROOT = path.resolve(__dirname, '..');
app.use(express.static(CLIENT_ROOT));

// SPA fallback for direct exam or lesson routes
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint không tồn tại' });
  }
  res.sendFile(path.join(CLIENT_ROOT, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`🚀 DEV ACADEMY - KỸ SƯ HỌC TẬP CÁ NHÂN`);
  console.log(`📡 Máy chủ đang lắng nghe tại: http://localhost:${PORT}`);
  console.log(`🔒 Hệ thống Sandbox (Node.js vm, Python 3.10, MinGW C++): SẴN SÀNG`);
  console.log(`================================================================`);
});
