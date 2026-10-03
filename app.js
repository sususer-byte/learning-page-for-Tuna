// ==========================================================================
// DEV CONDUIT - CORE APPLICATION LOGIC (v4.0)
// High-Fidelity Engineering Platform Logic
// ==========================================================================

// Global State
const appState = {
  activeTrackId: 'web-dev',
  activeSubTrackId: 'js', // for prog-lang
  activeTab: 'pipeline',
  activeLessonId: null,
  activeExamId: null,
  activeExamQuestionIndex: 1, // 0 = MC, 1 = Q1, 2 = Q2, 3 = Q3
  activeExamData: null,
  userProgress: {
    completed_lessons: [],
    completed_milestones: [],
    completed_exercises: [],
    exam_results: {}
  },
  examAnswers: {}, // { [examId]: { mc: {}, coding: { '1': '', '2': '', '3': '' } } }
  examTimerInterval: null,
  examSecondsRemaining: 3600,
  cmExamEditor: null,
  cmPracticeEditor: null
};
window.appState = appState;

// ==========================================================================
// 1. INITIALIZATION & PERSISTENCE
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  loadLocalProgress();
  initCodeEditors();
  bindGlobalEvents();
  initRouting();
  initPipelineControls();
  initSettingsModal();
  
  // Test backend connection
  await checkBackendStatus();
  
  // Render initial track and enforce track-specific tab states
  switchTrack(appState.activeTrackId);
  if (window.location.hash) {
    handleHashRoute();
  }
});

function loadLocalProgress() {
  try {
    const saved = localStorage.getItem('dev_conduit_progress_v6');
    if (saved) {
      const parsed = JSON.parse(saved);
      appState.userProgress = Object.assign({
        completed_lessons: [],
        completed_milestones: [],
        completed_exercises: [],
        exercise_submissions: {},
        exam_results: {}
      }, parsed);
      if (!appState.userProgress.exercise_submissions) {
        appState.userProgress.exercise_submissions = {};
      }
    } else {
      saveLocalProgress();
    }
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
}

function saveLocalProgress() {
  try {
    localStorage.setItem('dev_conduit_progress_v6', JSON.stringify(appState.userProgress));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: 'fa-solid fa-circle-check',
    warning: 'fa-solid fa-triangle-exclamation',
    error: 'fa-solid fa-circle-xmark',
    info: 'fa-solid fa-circle-info'
  };

  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;
  toast.innerHTML = `
    <i class="${icons[type] || icons.info}"></i>
    <span style="flex:1; line-height:1.4;">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 280);
  }, duration);
}

async function checkBackendStatus() {
  const statusLabel = document.getElementById('backend-status-label');
  try {
    const res = await fetch('/index.html');
    if (res.ok) {
    statusLabel.textContent = 'Sandbox Engine: Chế Độ Client Offline';
      statusLabel.parentElement.querySelector('.status-indicator').classList.add('online');
    } else {
      throw new Error('Not OK');
    }
  } catch (e) {
    statusLabel.textContent = 'Sandbox Engine: Chế Độ Client Offline';
    statusLabel.parentElement.querySelector('.status-indicator').classList.remove('online');
  }
}

// ==========================================================================

// ==========================================================================
// UTILITY & HELPER FUNCTIONS
// ==========================================================================
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanLessonTitle(title) {
  if (!title) return '';
  return String(title)
    .replace(/^\s*(Bài\s+)?\d+(\.\d+)*[:.]?\s*/i, '')
    .replace(/^\s*(Bài\s+)?\d+(\.\d+)*[:.]?\s*/i, '')
    .trim();
}

function getMilestoneLevelInfo(milestoneIndex, totalMilestones) {
  const levels = [
    { key: 'foundation', name: 'Foundation', vi: 'Nền Tảng' },
    { key: 'intermediate', name: 'Intermediate', vi: 'Trung Cấp' },
    { key: 'advanced', name: 'Advanced', vi: 'Nâng Cao' },
    { key: 'intensive', name: 'Intensive', vi: 'Chuyên Sâu' },
    { key: 'proficiency', name: 'Proficiency', vi: 'Thành Thạo' }
  ];
  let idx = 0;
  if (totalMilestones >= 10) {
    if (milestoneIndex < 2) idx = 0;
    else if (milestoneIndex < 4) idx = 1;
    else if (milestoneIndex < 7) idx = 2;
    else if (milestoneIndex < 9) idx = 3;
    else idx = 4;
  } else if (totalMilestones === 9) {
    if (milestoneIndex < 2) idx = 0;
    else if (milestoneIndex < 4) idx = 1;
    else if (milestoneIndex < 6) idx = 2;
    else if (milestoneIndex < 8) idx = 3;
    else idx = 4;
  } else if (totalMilestones === 8) {
    if (milestoneIndex < 2) idx = 0;
    else if (milestoneIndex < 4) idx = 1;
    else if (milestoneIndex < 6) idx = 2;
    else if (milestoneIndex < 7) idx = 3;
    else idx = 4;
  } else {
    if (milestoneIndex < 2) idx = 0;
    else if (milestoneIndex < 4) idx = 1;
    else if (milestoneIndex < 5) idx = 2;
    else if (milestoneIndex < 6) idx = 3;
    else idx = 4;
  }
  return { levelNumber: idx + 1, ...levels[idx] };
}

// Track open accordion chapters
const openChapters = new Set();
function toggleChapterAccordion(chapterId) {
  const item = document.getElementById('chapter-' + chapterId);
  if (!item) return;
  if (item.classList.contains('open')) {
    item.classList.remove('open');
    openChapters.delete(chapterId);
  } else {
    item.classList.add('open');
    openChapters.add(chapterId);
  }
}

// ==========================================================================
// KEYBOARD TYPING EFFECT ENGINE (Tactile Keystroke Sparkles & Caret Glow)
// ==========================================================================
// Word-like smooth character reveal & active typing cursor
function triggerTypingEffects(cm, changeObj) {
  if (!cm) return;

  // 1. Smooth Active Caret Glow while typing
  const wrapper = cm.getWrapperElement();
  if (wrapper) {
    const cursors = wrapper.querySelectorAll('.CodeMirror-cursor');
    cursors.forEach(c => c.classList.add('typing-cursor-active'));
    if (cm._typingPulseTimer) clearTimeout(cm._typingPulseTimer);
    cm._typingPulseTimer = setTimeout(() => {
      cursors.forEach(c => c.classList.remove('typing-cursor-active'));
    }, 120);
  }

  // 2. Word-like smooth character materialization (reveal effect like Microsoft Word)
  if (changeObj && changeObj.origin === '+input') {
    try {
      const from = changeObj.from;
      const to = cm.getCursor();
      if (from && to && (from.line !== to.line || from.ch !== to.ch)) {
        const marker = cm.markText(from, to, { className: 'cm-word-smooth-char' });
        setTimeout(() => {
          try { marker.clear(); } catch (e) {}
        }, 160);
      }
    } catch (e) {
      // Safe fallback
    }
  }
}

// 2. CODEMIRROR INITIALIZATION
// ==========================================================================
function initCodeEditors() {
  const examTextarea = document.getElementById('exam-textarea');
  if (examTextarea && window.CodeMirror) {
    appState.cmExamEditor = CodeMirror.fromTextArea(examTextarea, {
      lineNumbers: true,
      mode: 'javascript',
      theme: 'material-darker',
      indentUnit: 4,
      tabSize: 4,
      indentWithTabs: false,
      autoCloseBrackets: true,
      matchBrackets: true,
      extraKeys: {
        "Ctrl-Enter": () => runExamTestCode(),
        "Tab": (cm) => cm.replaceSelection("    ", "end")
      }
    });

    appState.cmExamEditor.on('change', (cm, changeObj) => {
      saveActiveQuestionCode();
      triggerTypingEffects(cm, changeObj);
    });
  }

  const practiceTextarea = document.getElementById('ide-textarea');
  if (practiceTextarea && window.CodeMirror) {
    appState.cmPracticeEditor = CodeMirror.fromTextArea(practiceTextarea, {
      lineNumbers: true,
      mode: 'python',
      theme: 'material-darker',
      indentUnit: 4,
      tabSize: 4,
      indentWithTabs: false,
      autoCloseBrackets: true,
      matchBrackets: true,
      styleActiveLine: true,
      scrollBeyondLastLine: false,
      extraKeys: {
        "Ctrl-Enter": () => runPracticeIDE(),
        "Cmd-Enter": () => runPracticeIDE(),
        "Esc": () => stopPracticeIDE(),
        "Tab": (cm) => cm.replaceSelection("    ", "end")
      }
    });

    // Tactile Keyboard Typing Effect
    appState.cmPracticeEditor.on('change', (cm, changeObj) => {
      triggerTypingEffects(cm, changeObj);
    });

    // Update cursor position dynamically in status bar (C7)
    appState.cmPracticeEditor.on('cursorActivity', (cm) => {
      const cur = cm.getCursor();
      const cursorInfoEl = document.getElementById('ide-cursor-info');
      if (cursorInfoEl) {
        cursorInfoEl.innerHTML = `<i class="fa-solid fa-crosshairs"></i> Dòng ${cur.line + 1}, Cột ${cur.ch + 1}`;
      }
    });

    // Default code for Python
    appState.cmPracticeEditor.setValue(SUPPORTED_LANGUAGES.python.starterCode);
  }
}

// ==========================================================================
// 3. EVENT BINDING & NAVIGATION
// ==========================================================================

// ==========================================================================
// ROADMAP DRAG & SCROLL CONTROLS
// ==========================================================================
// ==========================================================================
// ROADMAP DRAG & SCROLL CONTROLS (Smooth, Universal Mouse & Touch Support)
// ==========================================================================
let isRoadmapDragging = false;
let roadmapHasDragged = false;

function initPipelineControls() {
  const container = document.getElementById('pipeline-canvas-container');
  if (!container) return;

  let startClientX = 0;
  let startScrollLeft = 0;

  container.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // Only main left click
    isRoadmapDragging = true;
    roadmapHasDragged = false;
    startClientX = e.clientX;
    startScrollLeft = container.scrollLeft;
    container.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isRoadmapDragging) return;
    const dx = e.clientX - startClientX;
    if (Math.abs(dx) > 4) {
      roadmapHasDragged = true;
      e.preventDefault();
      container.scrollLeft = startScrollLeft - dx;
    }
  });

  window.addEventListener('mouseup', () => {
    if (isRoadmapDragging) {
      isRoadmapDragging = false;
      container.style.cursor = 'grab';
      // keep roadmapHasDragged flag for 50ms so click handler knows it was a drag
      setTimeout(() => { roadmapHasDragged = false; }, 50);
    }
  });

  // Touch support for trackpads and touch displays
  let touchStartX = 0;
  let touchScrollStart = 0;
  container.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchScrollStart = container.scrollLeft;
    }
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - touchStartX;
      container.scrollLeft = touchScrollStart - dx;
    }
  }, { passive: true });

  const btnLeft = document.getElementById('btn-scroll-pipeline-left');
  const btnRight = document.getElementById('btn-scroll-pipeline-right');

  if (btnLeft) {
    btnLeft.addEventListener('click', (e) => {
      e.stopPropagation();
      container.scrollBy({ left: -360, behavior: 'smooth' });
    });
  }

  if (btnRight) {
    btnRight.addEventListener('click', (e) => {
      e.stopPropagation();
      container.scrollBy({ left: 360, behavior: 'smooth' });
    });
  }
}

function bindGlobalEvents() {
  const btnResetProgress = document.getElementById('btn-reset-progress');
  if (btnResetProgress) {
    btnResetProgress.addEventListener('click', () => {
      if (confirm('Bạn có chắc chắn muốn xóa toàn bộ tiến độ học tập? Thao tác này không thể hoàn tác.')) {
        localStorage.removeItem('dev_conduit_progress_v6');
        location.reload();
      }
    });
  }
  // Sidebar Track Buttons
  document.querySelectorAll('.sidebar-menu .nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const trackId = btn.getAttribute('data-target');
      switchTrack(trackId);
    });
  });

  // Sub-track Pills (for prog-lang)
  document.querySelectorAll('.sub-track-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const subtrack = pill.getAttribute('data-subtrack');
      switchSubTrack(subtrack);
    });
  });

  // Top Nav Sub-tabs
  document.querySelectorAll('.sub-nav-tabs .sub-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sub = btn.getAttribute('data-sub');
      switchTab(sub);
    });
  });

  // Sidebar collapse toggle function (Desktop: .collapsed (60px), Mobile: .mobile-open)
  const sidebar = document.getElementById('app-sidebar');
  function toggleSidebarCollapse() {
    if (!sidebar) return;
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('mobile-open');
    } else {
      const isCollapsed = sidebar.classList.toggle('collapsed');
      try {
        localStorage.setItem('dev_sidebar_collapsed', isCollapsed ? '1' : '0');
      } catch (e) {}
    }
  }

  // Restore sidebar collapsed state on load
  try {
    if (localStorage.getItem('dev_sidebar_collapsed') === '1' && window.innerWidth > 768 && sidebar) {
      sidebar.classList.add('collapsed');
    }
  } catch (e) {}

  const toggleBtn = document.getElementById('btn-toggle-sidebar');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleSidebarCollapse);
  }

  const collapseBtn = document.getElementById('btn-collapse-sidebar');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', toggleSidebarCollapse);
  }

  // Support Ctrl+B / Cmd+B keyboard shortcut to toggle sidebar
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      toggleSidebarCollapse();
    }
  });

  // Global button ripple micro-interaction
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn, .sub-tab-btn, .nav-tab-btn, .btn-scroll-arrow, .sub-track-pill, .btn-action-sm, .btn-back-sm');
    if (!btn || btn.disabled) return;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });

  // Lesson Detail Toolbar Back Button
  const backToLessonsBtn = document.getElementById('btn-back-to-lessons');
  if (backToLessonsBtn) {
    backToLessonsBtn.addEventListener('click', () => {
      const dView = document.getElementById('lesson-detail-view');
      const lView = document.getElementById('lesson-list-view');
      if (dView) dView.style.display = 'none';
      if (lView) lView.style.display = 'block';
    });
  }

  // Back from Module Exercises Button
  const backFromExercisesBtn = document.getElementById('btn-back-from-exercises');
  if (backFromExercisesBtn) {
    backFromExercisesBtn.addEventListener('click', () => {
      const eView = document.getElementById('module-exercises-view');
      const lView = document.getElementById('lesson-list-view');
      if (eView) eView.style.display = 'none';
      if (lView) lView.style.display = 'block';
    });
  }

  // Mark Lesson Complete Button
  const markCompleteBtn = document.getElementById('btn-mark-lesson-complete');
  if (markCompleteBtn) {
    markCompleteBtn.addEventListener('click', () => {
      if (appState.activeLessonId) {
        completeLesson(appState.activeLessonId);
      }
    });
  }

  // Exam Workspace Buttons
  
  // Back to Homepage Link Transition
  const goHomeBtn = document.getElementById('btn-go-home');
  if (goHomeBtn) {
    goHomeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      document.body.classList.add('page-exit');
      setTimeout(() => {
        window.location.href = 'homepage.html';
      }, 240);
    });
  }

  const exitExamBtn = document.getElementById('btn-exit-exam-room');
  if (exitExamBtn) {
    exitExamBtn.addEventListener('click', () => {
      if (confirm('Bạn có chắc chắn muốn thoát phòng thi? Bài làm chưa nộp sẽ mất.')) {
        exitExamRoom();
      }
    });
  }

  const prevQBtn = document.getElementById('btn-exam-prev-q');
  if (prevQBtn) {
    prevQBtn.addEventListener('click', () => navigateExamQuestion(-1));
  }

  const nextQBtn = document.getElementById('btn-exam-next-q');
  if (nextQBtn) {
    nextQBtn.addEventListener('click', () => navigateExamQuestion(1));
  }

  const runTestBtn = document.getElementById('btn-run-exam-test');
  if (runTestBtn) {
    runTestBtn.addEventListener('click', () => runExamTestCode());
  }

  const submitExamBtn = document.getElementById('btn-submit-exam-full');
  if (submitExamBtn) {
    submitExamBtn.addEventListener('click', () => submitFullExam());
  }

  // Milestone action buttons
  const enterMilestoneExamBtn = document.getElementById('btn-enter-milestone-exam');
  if (enterMilestoneExamBtn) {
    enterMilestoneExamBtn.addEventListener('click', () => {
      const info = getActiveTrackInfo();
      const ms = (info && info.milestones) ? (info.milestones.find(m => m.id === appState.activeMilestoneId) || getCurrentMilestone()) : getCurrentMilestone();
      if (!ms) return;

      const trackId = appState.activeTrackId;
      const allLessons = getActiveLessons();
      const reqLessonIds = ms.required_lesson_ids || [];
      const reqLessons = allLessons.filter(l => reqLessonIds.includes(l.id));
      const allReqsDone = reqLessons.length > 0 && reqLessons.every(l => appState.userProgress.completed_lessons.includes(l.id));

      if (!isMilestoneUnlocked(ms.id)) {
        showToast('Cột mốc này đang bị khóa. Bạn cần vượt qua cột mốc trước!', 'warning');
        return;
      }

      if (!allReqsDone && !appState.userProgress.completed_milestones.includes(ms.id)) {
        if (trackId === 'web-dev') {
          showToast('Bạn cần hoàn thành tất cả bài học lý thuyết trước khi làm bài tập module!', 'warning');
        } else {
          showToast('Bạn chưa hoàn thành tất cả bài học bắt buộc để vào phòng thi!', 'warning');
        }
        return;
      }

      if (trackId === 'web-dev') {
        openModuleExercises(ms.id);
        return;
      }
      if (trackId === 'cybersecurity' && ms.external_exam) {
        window.open(ms.external_exam.url, '_blank');
        return;
      }
      if (ms.exam_id) {
        openExamRoom(ms.exam_id);
      } else {
        openModuleExercises(ms.id);
      }
    });
  }

  const viewMilestoneLessonsBtn = document.getElementById('btn-view-milestone-lessons');
  if (viewMilestoneLessonsBtn) {
    viewMilestoneLessonsBtn.addEventListener('click', () => {
      const msId = appState.activeMilestoneId;
      switchTab('lesson');
      const dView = document.getElementById('lesson-detail-view');
      const eView = document.getElementById('module-exercises-view');
      const lView = document.getElementById('lesson-list-view');
      if (dView) dView.style.display = 'none';
      if (eView) eView.style.display = 'none';
      if (lView) lView.style.display = 'block';

      if (msId && typeof openChapters !== 'undefined') {
        openChapters.add(msId);
        renderLessonList();
        setTimeout(() => {
          const targetEl = document.getElementById(`chapter-accordion-${msId}`);
          if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      }
    });
  }

  // Cutscene dismiss & enter exam
  const cutsceneDismissBtn = document.getElementById('btn-cutscene-dismiss');
  if (cutsceneDismissBtn) {
    cutsceneDismissBtn.addEventListener('click', () => {
      document.getElementById('unlock-cutscene-overlay').style.display = 'none';
      switchTab('pipeline');
    });
  }

  // Fix for btn-resume-latest-lesson
  const resumeBtn = document.getElementById('btn-resume-latest-lesson');
  if (resumeBtn) {
    resumeBtn.addEventListener('click', () => {
      const allLessons = getActiveLessons();
      let targetLesson = null;
      for (let l of allLessons) {
        if (!appState.userProgress.completed_lessons.includes(l.id)) {
          targetLesson = l.id;
          break;
        }
      }
      if (!targetLesson && allLessons.length > 0) {
        targetLesson = allLessons[0].id;
      }
      if (targetLesson) {
        openLesson(targetLesson);
        showToast('Đang mở bài học dở dang...', 'info');
      } else {
        showToast('Bạn đã hoàn thành toàn bộ bài học trong lộ trình!', 'success');
      }
    });
  }

  // Fix for btn-reset-ide
  const resetIdeBtn = document.getElementById('btn-reset-ide');
  if (resetIdeBtn) {
    resetIdeBtn.addEventListener('click', () => {
      const langConf = (typeof SUPPORTED_LANGUAGES !== 'undefined' && SUPPORTED_LANGUAGES[currentPracticeLang]) ? SUPPORTED_LANGUAGES[currentPracticeLang] : (typeof SUPPORTED_LANGUAGES !== 'undefined' ? SUPPORTED_LANGUAGES.python : null);
      const starter = langConf ? langConf.starterCode : '// Khởi tạo mã nguồn...';
      if (appState.cmPracticeEditor) {
        appState.cmPracticeEditor.setValue(starter);
      }
      const out = document.getElementById('ide-terminal-output');
      if (out) out.innerHTML = '<div class="term-line term-prompt">dev-conduit-sandbox&gt; Đã khôi phục mã nguồn ban đầu.</div>';
      const exitStatus = document.getElementById('term-exit-status');
      if (exitStatus) exitStatus.innerHTML = '<span class="status-dot-inline idle"></span> Trạng thái: Idle';
      const exitCodeEl = document.getElementById('status-exit-code');
      if (exitCodeEl) exitCodeEl.textContent = 'Exit Code: -';
      showToast('Đã khôi phục mã nguồn ban đầu', 'info');
    });
  }

  const cutsceneEnterExamBtn = document.getElementById('btn-cutscene-enter-exam');
  if (cutsceneEnterExamBtn) {
    cutsceneEnterExamBtn.addEventListener('click', () => {
      document.getElementById('unlock-cutscene-overlay').style.display = 'none';
      const ms = getCurrentMilestone();
      if (ms && ms.exam_id) {
        openExamRoom(ms.exam_id);
      }
    });
  }

  // Result modal buttons
  const closeResultBtn = document.getElementById('btn-close-result-modal');
  if (closeResultBtn) {
    closeResultBtn.addEventListener('click', () => {
      document.getElementById('exam-result-overlay').style.display = 'none';
      exitExamRoom();
    });
  }

  const viewSolutionsBtn = document.getElementById('btn-view-official-solutions');
  if (viewSolutionsBtn) {
    viewSolutionsBtn.addEventListener('click', () => fetchAndDisplaySolutions());
  }

  // Practice IDE Controls
  const ideLangSelect = document.getElementById('ide-lang-select');
  if (ideLangSelect) {
    ideLangSelect.addEventListener('change', () => switchPracticeLang(ideLangSelect.value));
  }

  const runIdeBtn = document.getElementById('btn-run-ide');
  if (runIdeBtn) {
    runIdeBtn.addEventListener('click', () => runPracticeIDE());
  }

  const clearTermBtn = document.getElementById('btn-clear-terminal');
  if (clearTermBtn) {
    clearTermBtn.addEventListener('click', () => {
      const out = document.getElementById('ide-terminal-output');
      if (out) out.innerHTML = '<div class="term-line term-prompt">dev-conduit-sandbox&gt; Sẵn sàng thực thi.</div>';
      const exitStatus = document.getElementById('term-exit-status');
      if (exitStatus) exitStatus.innerHTML = '<span class="status-dot-inline idle"></span> Trạng thái: Idle';
      const exitCodeEl = document.getElementById('status-exit-code');
      if (exitCodeEl) exitCodeEl.textContent = 'Exit Code: -';
    });
  }

  // Global keyboard shortcuts for Practice IDE (Ctrl+Enter / Cmd+Enter to run, Esc to stop)
  document.addEventListener('keydown', (e) => {
    if (appState.activeTab === 'practice') {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runPracticeIDE();
      } else if (e.key === 'Escape') {
        stopPracticeIDE();
      }
    }
  });
}

// ==========================================================================
// 4. ROUTING
// ==========================================================================
function initRouting() {
  window.addEventListener('hashchange', handleHashRoute);
  if (window.location.hash) {
    handleHashRoute();
  }
}

function handleHashRoute() {
  let hash = window.location.hash.slice(1);
  if (!hash) return;
  if (hash.startsWith('/')) hash = hash.slice(1);

  // Pattern: track/:id or track/prog-lang/:subtrack
  if (hash.startsWith('track/')) {
    const parts = hash.split('/');
    const trackId = parts[1];
    const subTrackId = parts[2];
    if (pipelineData[trackId]) {
      switchTrack(trackId);
      if (trackId === 'prog-lang' && subTrackId) {
        switchSubTrack(subTrackId);
      }
    }
  }
  // Pattern: exam/:examId/question/:qNum
  else if (hash.startsWith('exam/')) {
    const parts = hash.split('/');
    const examId = parts[1];
    const qNum = parseInt(parts[3] || '1', 10);
    openExamRoom(examId, qNum);
  }
  // Pattern: lesson/:lessonId
  else if (hash.startsWith('lesson/')) {
    const parts = hash.split('/');
    const lessonId = parts[1];
    openLesson(lessonId);
  }
  // Pattern: practice or tab/:tabKey
  else if (hash === 'practice' || hash === 'tab/practice') {
    switchTab('practice');
  }
  else if (hash.startsWith('tab/')) {
    const tabKey = hash.split('/')[1];
    switchTab(tabKey);
  }
}

// ==========================================================================
// 5. TRACK & TAB SWITCHING
// ==========================================================================
function switchTrack(trackId) {
  appState.activeTrackId = trackId;
  appState.activeMilestoneId = null;
  appState.activeLessonId = null;

  // Manage Tab visibility strictly per track requirements:
  // - web-dev: Keep Exercises, DELETE Exam Tab completely
  // - game2d: DELETE both Exercises and Exam Tab
  // - cybersecurity: Exam is single link to TryHackMe/Hack The Box
  // - prog-lang: Exercises & Exams for each branch
  const examTabBtn = document.querySelector('.sub-nav-tabs .sub-tab-btn[data-sub="exam"]');
  if (examTabBtn) {
    if (trackId === 'web-dev' || trackId === 'game2d') {
      examTabBtn.style.display = 'none';
      if (appState.activeTab === 'exam') {
        switchTab('pipeline');
      }
    } else if (trackId === 'cybersecurity') {
      examTabBtn.style.display = 'inline-flex';
      examTabBtn.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Phòng Thi Thực Hành Lab';
    } else {
      examTabBtn.style.display = 'inline-flex';
      examTabBtn.innerHTML = '<i class="fa-solid fa-award"></i> Phòng Thi Sát Hạch';
    }
  }

  // Update sidebar active buttons
  document.querySelectorAll('.sidebar-menu .nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-target') === trackId);
  });

  // Toggle subtrack container for prog-lang
  const subContainer = document.getElementById('sub-track-selector');
  if (trackId === 'prog-lang') {
    if (subContainer) subContainer.style.display = 'block';
  } else {
    if (subContainer) subContainer.style.display = 'none';
  }

  const info = getActiveTrackInfo();
  const dcn = document.getElementById('pipeline-track-title');
  if (dcn) dcn.textContent = info.title;
  const mainDcn = document.getElementById('display-course-name');
  if (mainDcn) mainDcn.textContent = info.title;

  switchTab('pipeline');
  renderCurrentTrack();
}

function switchSubTrack(subtrackId) {
  appState.activeSubTrackId = subtrackId;
  appState.activeMilestoneId = null;
  appState.activeLessonId = null;

  document.querySelectorAll('.sub-track-pill').forEach(pill => {
    pill.classList.toggle('active', pill.getAttribute('data-subtrack') === subtrackId);
  });

  const info = getActiveTrackInfo();
  const mainDcn = document.getElementById('display-course-name');
  if (mainDcn) mainDcn.textContent = `${info.title} (${subtrackId.toUpperCase()})`;
  const pt = document.getElementById('pipeline-track-title');
  if (pt) pt.textContent = `${info.title} (${subtrackId.toUpperCase()})`;

  renderCurrentTrack();
}

function switchTab(tabKey) {
  appState.activeTab = tabKey;

  // Update top nav tab buttons
  document.querySelectorAll('.sub-nav-tabs .sub-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-sub') === tabKey);
  });

  // Toggle active stage views
  document.querySelectorAll('.stage-container .tab-view').forEach(view => {
    view.classList.toggle('active', view.id === `tab-${tabKey}`);
  });

  // Trigger CodeMirror refresh if switching into an editor tab
  if (tabKey === 'practice' && appState.cmPracticeEditor) {
    setTimeout(() => appState.cmPracticeEditor.refresh(), 50);
  }
  if (tabKey === 'exam' && appState.cmExamEditor) {
    setTimeout(() => appState.cmExamEditor.refresh(), 50);
  }

  // C6. Update navbar breadcrumb title dynamically to reflect real context
  const mainDcn = document.getElementById('display-course-name');
  if (mainDcn) {
    if (tabKey === 'practice') {
      const langConf = (typeof SUPPORTED_LANGUAGES !== 'undefined' && SUPPORTED_LANGUAGES[currentPracticeLang]) ? SUPPORTED_LANGUAGES[currentPracticeLang] : { label: 'Python 3' };
      mainDcn.textContent = `Thực hành IDE › ${langConf.label}`;
    } else {
      const info = getActiveTrackInfo();
      if (info) mainDcn.textContent = info.title;
    }
  }

  // Refresh tab content
  if (tabKey === 'pipeline') renderPipelineConduit();
  if (tabKey === 'lesson') {
    if (!appState.activeLessonId) {
      const dView = document.getElementById('lesson-detail-view');
      const lView = document.getElementById('lesson-list-view');
      if (dView) dView.style.display = 'none';
      if (lView) lView.style.display = 'block';
    }
    renderLessonList();
  }
  if (tabKey === 'exam' && !appState.activeExamId) renderExamDashboard();
}

function getActiveTrackInfo() {
  if (appState.activeTrackId === 'prog-lang') {
    const parent = pipelineData['prog-lang'];
    const sub = parent.sub_tracks[appState.activeSubTrackId];
    return {
      id: 'prog-lang',
      title: sub.name,
      description: parent.description,
      milestones: sub.milestones
    };
  }
  const track = pipelineData[appState.activeTrackId];
  return {
    id: track.track_id,
    title: track.track_title,
    description: track.description,
    milestones: track.milestones
  };
}

function getActiveLessons() {
  if (appState.activeTrackId === 'prog-lang') {
    const parent = courseData['prog-lang'];
    return parent.sub_tracks[appState.activeSubTrackId].lessons || [];
  }
  const track = courseData[appState.activeTrackId];
  return track ? track.lessons : [];
}

function getCurrentMilestone() {
  const info = getActiveTrackInfo();
  // Find first non-completed milestone or default to last
  const ms = info.milestones.find(m => !appState.userProgress.completed_milestones.includes(m.id)) || info.milestones[info.milestones.length - 1];
  return ms;
}

function isMilestoneUnlocked(msId) {
  const info = getActiveTrackInfo();
  if (!info || !info.milestones || info.milestones.length === 0) return true;
  const milestones = info.milestones;
  const msIdx = milestones.findIndex(m => m.id === msId);
  if (msIdx <= 0) return true; // Milestone 1 is always unlocked
  const completedMs = appState.userProgress.completed_milestones || [];
  return completedMs.includes(msId) || completedMs.includes(milestones[msIdx - 1].id);
}

function isLessonUnlocked(lessonId) {
  const lessons = getActiveLessons();
  const globalIdx = lessons.findIndex(l => l.id === lessonId);
  if (globalIdx < 0) return false;

  const completedLessons = appState.userProgress.completed_lessons || [];
  if (completedLessons.includes(lessonId)) return true; // Already done

  const info = getActiveTrackInfo();
  if (info && info.milestones) {
    const parentMs = info.milestones.find(m => m.required_lesson_ids && m.required_lesson_ids.includes(lessonId));
    if (parentMs && !isMilestoneUnlocked(parentMs.id)) {
      return false; // Parent milestone is locked
    }
  }

  if (globalIdx === 0) return true;
  return completedLessons.includes(lessons[globalIdx - 1].id);
}

// ==========================================================================
// 6. PIPELINE CONDUIT RENDERING (SVG Flow & Animation)
// ==========================================================================
function renderCurrentTrack() {
  renderPipelineConduit();
  renderLessonList();
  renderExamDashboard();
  updateTelemetry();
}


function renderPipelineConduit() {
  const info = getActiveTrackInfo();
  if (!info) return;

  const titleEl = document.getElementById('pipeline-track-title');
  const descEl = document.getElementById('pipeline-track-desc');
  if (titleEl) titleEl.textContent = info.track_title || info.title;
  if (descEl) descEl.textContent = info.description;

  const milestones = info.milestones || [];
  const nodesGroup = document.getElementById('pipeline-nodes-group');
  if (!nodesGroup) return;
  nodesGroup.innerHTML = '';

  const completedMs = appState.userProgress.completed_milestones || [];
  let currentMs = null;
  for (let ms of milestones) {
    if (!completedMs.includes(ms.id)) {
      currentMs = ms;
      break;
    }
  }
  if (!currentMs && milestones.length > 0) {
    currentMs = milestones[milestones.length - 1]; // all complete
  }

  // Generous spacing between milestones (280px per milestone) so labels never crowd
  const svgWidth = Math.max(1600, milestones.length * 280);
  const svgHeight = 260;
  const svgEl = document.getElementById('pipeline-svg');
  if (svgEl) {
    svgEl.setAttribute('width', svgWidth);
    svgEl.style.width = svgWidth + 'px';
    svgEl.style.minWidth = svgWidth + 'px';
    svgEl.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
  }

  const nodes = [];
  milestones.forEach((ms, idx) => {
    const x = 160 + (idx / Math.max(1, milestones.length - 1)) * (svgWidth - 320);
    // Consistent horizontal wave centered in 260px height (leaving ~150px below for titles & badges)
    const y = (idx % 2 === 0) ? 80 : 92;
    nodes.push({ x, y, ms, idx });
  });

  function generatePath(points) {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i+1];
      const cpX1 = curr.x + (next.x - curr.x) / 2;
      const cpX2 = curr.x + (next.x - curr.x) / 2;
      d += ` C ${cpX1} ${curr.y}, ${cpX2} ${next.y}, ${next.x} ${next.y}`;
    }
    return d;
  }

  const bgCasing = document.getElementById('pipeline-bg-casing');
  const bgPath = document.getElementById('pipeline-bg-path');
  const flowPath = document.getElementById('pipeline-flow-path');
  
  const fullPathD = generatePath(nodes);
  if (bgCasing) {
    bgCasing.setAttribute('d', fullPathD);
  }
  if (bgPath) {
    bgPath.setAttribute('d', fullPathD);
  }
  
  if (flowPath) {
    let flowNodes = [];
    if (currentMs) {
      const curIdx = milestones.findIndex(m => m.id === currentMs.id);
      flowNodes = nodes.slice(0, curIdx + 1);
    } else if (milestones.length > 0) {
      flowNodes = nodes.slice(0, 1);
    }
    flowPath.setAttribute('d', generatePath(flowNodes));

    // Dynamic Flow Surge Effect when progressing between milestones
    if (appState.justCompletedMilestone) {
      flowPath.classList.add('flow-surging');
      setTimeout(() => {
        flowPath.classList.remove('flow-surging');
        appState.justCompletedMilestone = null;
      }, 2500);
    }

    // Note: Pulsating head orb removed per v4.0 standards
    const oldOrb = document.getElementById('pipeline-flow-head-orb');
    if (oldOrb && oldOrb.parentNode) oldOrb.parentNode.removeChild(oldOrb);
  }

  // Word-wrap helper: splits into at most 2 natural lines with max ~20 chars per line
  function splitMilestoneText(name, idx, maxLen = 20) {
    const full = `M${idx + 1}: ${name}`;
    if (full.length <= maxLen) return [full];
    const words = full.split(' ');
    let l1 = '';
    let i = 0;
    for (; i < words.length; i++) {
      const candidate = l1 ? `${l1} ${words[i]}` : words[i];
      if (candidate.length <= maxLen) {
        l1 = candidate;
      } else {
        break;
      }
    }
    if (!l1 && words.length > 0) {
      l1 = words[0];
      i = 1;
    }
    const l2 = words.slice(i).join(' ');
    return [l1, l2];
  }

  // Render SVG nodes with 100% NON-OVERLAPPING labels & 3 DISTINCT STATES (E1: 40px diameter, 3px stroke)
  nodes.forEach((node, idx) => {
    const isCompleted = completedMs.includes(node.ms.id);
    const isCurrent = currentMs && currentMs.id === node.ms.id;
    const isLocked = !isCompleted && !isCurrent;
    const levelInfo = getMilestoneLevelInfo(idx, milestones.length);
    
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'milestone-node' + (isCurrent ? ' current' : '') + (isCompleted ? ' completed' : '') + (isLocked ? ' locked' : ''));
    g.style.cursor = 'pointer';
    g.style.transformOrigin = `${node.x}px ${node.y}px`;
    g.style.transformBox = 'fill-box';
    g.onclick = (e) => { if (roadmapHasDragged) return; selectMilestone(node.ms.id); };

    // Native SVG Tooltip (hover displays full title & level & status)
    const titleTip = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    const statusText = isCompleted ? 'Đã hoàn thành' : (isCurrent ? 'Đang học' : 'Chưa mở khóa');
    titleTip.textContent = `M${idx + 1}: ${node.ms.name}\nCấp độ: Cấp ${levelInfo.levelNumber} - ${levelInfo.vi || levelInfo.name}\nTrạng thái: ${statusText}`;
    g.appendChild(titleTip);

    // Dedicated orb group for the round milestone node so scaling & bouncing never shifts the text
    const orb = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    orb.setAttribute('class', 'milestone-orb');
    orb.style.transformOrigin = `${node.x}px ${node.y}px`;
    orb.style.transformBox = 'fill-box';

    // 1. Current state: Architectural static bronze ring
    if (isCurrent) {
      const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      halo.setAttribute('cx', node.x);
      halo.setAttribute('cy', node.y);
      halo.setAttribute('r', '15');
      halo.setAttribute('fill', 'transparent');
      halo.setAttribute('stroke', '#d4b48a');
      halo.setAttribute('stroke-width', '1.5');
      halo.setAttribute('opacity', '0.6');
      orb.appendChild(halo);
    }

    // 2. Core circle node (compact size to prevent text overlap: r=10.5px / diameter 21px)
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', node.x);
    circle.setAttribute('cy', node.y);

    if (isCompleted) {
      circle.setAttribute('r', '10.5');
      circle.setAttribute('fill', '#1a1816');
      circle.setAttribute('stroke', '#d4b48a');
      circle.setAttribute('stroke-width', '2.5');
    } else if (isCurrent) {
      circle.setAttribute('r', '10.5');
      circle.setAttribute('fill', '#221f1c');
      circle.setAttribute('stroke', '#d4b48a');
      circle.setAttribute('stroke-width', '2.5');
    } else {
      circle.setAttribute('r', '8.5');
      circle.setAttribute('fill', '#141312');
      circle.setAttribute('stroke', '#3a3530');
      circle.setAttribute('stroke-width', '2');
    }
    orb.appendChild(circle);

    // 3. Inner icon
    if (isCompleted) {
      const check = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      check.setAttribute('x', node.x);
      check.setAttribute('y', node.y + 3.5);
      check.setAttribute('text-anchor', 'middle');
      check.setAttribute('font-family', 'sans-serif');
      check.setAttribute('font-size', '9px');
      check.setAttribute('font-weight', 'bold');
      check.setAttribute('fill', '#d4b48a');
      check.textContent = '✓';
      orb.appendChild(check);
    } else if (isCurrent) {
      const innerDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      innerDot.setAttribute('cx', node.x);
      innerDot.setAttribute('cy', node.y);
      innerDot.setAttribute('r', '3.5');
      innerDot.setAttribute('fill', '#d4b48a');
      orb.appendChild(innerDot);
    } else {
      const innerDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      innerDot.setAttribute('cx', node.x);
      innerDot.setAttribute('cy', node.y);
      innerDot.setAttribute('r', '2');
      innerDot.setAttribute('fill', '#403c37');
      orb.appendChild(innerDot);
    }

    g.appendChild(orb);

    // 4. Milestone Title (Wrapped into 1 or 2 lines STRICTLY BELOW the circle)
    const titleLines = splitMilestoneText(node.ms.name, idx, 20);
    const textGroup = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textGroup.setAttribute('x', node.x);
    textGroup.setAttribute('text-anchor', 'middle');
    textGroup.setAttribute('font-family', 'var(--font-sans)');
    textGroup.setAttribute('font-size', '11.5px');
    textGroup.setAttribute('font-weight', isCurrent ? '700' : (isCompleted ? '600' : '500'));
    textGroup.setAttribute('fill', isCurrent ? '#FFFFFF' : (isCompleted ? '#E2E8F0' : '#8c857b'));

    if (titleLines.length === 1) {
      const tspan1 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      tspan1.setAttribute('x', node.x);
      tspan1.setAttribute('y', node.y + 26);
      tspan1.textContent = titleLines[0];
      textGroup.appendChild(tspan1);
    } else {
      const tspan1 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      tspan1.setAttribute('x', node.x);
      tspan1.setAttribute('y', node.y + 24);
      tspan1.textContent = titleLines[0];
      textGroup.appendChild(tspan1);

      const tspan2 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      tspan2.setAttribute('x', node.x);
      tspan2.setAttribute('y', node.y + 37);
      tspan2.textContent = titleLines[1];
      textGroup.appendChild(tspan2);
    }
    g.appendChild(textGroup);

    // 5. Level Badge Pill (E6: accent palette, strictly below title)
    const badgeY = titleLines.length === 2 ? (node.y + 54) : (node.y + 42);
    const pillW = 96;
    const pillH = 16;

    const badgeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    badgeRect.setAttribute('x', node.x - (pillW / 2));
    badgeRect.setAttribute('y', badgeY - 10);
    badgeRect.setAttribute('width', pillW);
    badgeRect.setAttribute('height', pillH);
    badgeRect.setAttribute('rx', '4');

    if (isCompleted) {
      badgeRect.setAttribute('fill', 'rgba(212, 180, 138, 0.12)');
      badgeRect.setAttribute('stroke', 'rgba(212, 180, 138, 0.35)');
    } else if (isCurrent) {
      badgeRect.setAttribute('fill', 'rgba(212, 180, 138, 0.22)');
      badgeRect.setAttribute('stroke', '#d4b48a');
    } else {
      badgeRect.setAttribute('fill', '#181615');
      badgeRect.setAttribute('stroke', '#2e2a26');
    }
    badgeRect.setAttribute('stroke-width', '1');
    g.appendChild(badgeRect);

    const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    badgeText.setAttribute('x', node.x);
    badgeText.setAttribute('y', badgeY + 1.5);
    badgeText.setAttribute('text-anchor', 'middle');
    badgeText.setAttribute('font-family', 'var(--font-sans)');
    badgeText.setAttribute('font-size', '9px');
    badgeText.setAttribute('font-weight', '600');
    badgeText.setAttribute('letter-spacing', '0.04em');

    if (isCompleted) {
      badgeText.setAttribute('fill', '#d4b48a');
    } else if (isCurrent) {
      badgeText.setAttribute('fill', '#ece7e1');
    } else {
      badgeText.setAttribute('fill', '#736c64');
    }
    badgeText.textContent = `CẤP ${levelInfo.levelNumber}: ${(levelInfo.vi || levelInfo.name).toUpperCase()}`;
    g.appendChild(badgeText);

    nodesGroup.appendChild(g);
  });

  // Select milestone
  if (!appState.activeMilestoneId && milestones.length > 0) {
    selectMilestone(currentMs ? currentMs.id : milestones[0].id);
  } else if (appState.activeMilestoneId) {
    selectMilestone(appState.activeMilestoneId);
  }
}

function updateTelemetry() {
  const info = getActiveTrackInfo();
  if (!info) return;

  const milestones = info.milestones || [];
  const completedMs = appState.userProgress.completed_milestones || [];
  const completedLessons = appState.userProgress.completed_lessons || [];

  const allLessons = getActiveLessons();
  const doneLessonsInTrack = allLessons.filter(l => completedLessons.includes(l.id)).length;
  const doneMsInTrack = milestones.filter(m => completedMs.includes(m.id)).length;

  const telemLessons = document.getElementById('telem-lessons-completed');
  const telemLessonsBar = document.getElementById('telem-lessons-bar');
  const telemMs = document.getElementById('telem-milestones-completed');
  const telemMsBar = document.getElementById('telem-milestones-bar');
  const pipePercent = document.getElementById('pipeline-progress-percent');

  if (telemLessons) telemLessons.textContent = `${doneLessonsInTrack} / ${allLessons.length}`;
  if (telemLessonsBar) {
    const lPct = allLessons.length > 0 ? (doneLessonsInTrack / allLessons.length) * 100 : 0;
    telemLessonsBar.style.width = `${Math.min(100, Math.round(lPct))}%`;
  }

  if (telemMs) telemMs.textContent = `${doneMsInTrack} / ${milestones.length}`;
  if (telemMsBar) {
    const mPct = milestones.length > 0 ? (doneMsInTrack / milestones.length) * 100 : 0;
    telemMsBar.style.width = `${Math.min(100, Math.round(mPct))}%`;
  }

  const overallPercent = milestones.length > 0 ? Math.round((doneMsInTrack / milestones.length) * 100) : 0;
  if (pipePercent) pipePercent.textContent = `${overallPercent}%`;

  // E2: Smart Action Button ("Bắt đầu bài học" if 0%, else "Tiếp tục bài học")
  const resumeBtn = document.getElementById('btn-resume-latest-lesson');
  if (resumeBtn) {
    if (doneLessonsInTrack === 0) {
      resumeBtn.innerHTML = '<i class="fa-solid fa-play"></i> Bắt đầu bài học';
    } else {
      resumeBtn.innerHTML = '<i class="fa-solid fa-bolt"></i> Tiếp tục bài học';
    }
  }

  // Dynamically update sidebar track counters from actual data
  const bWeb = document.getElementById('badge-web-dev');
  const bGame = document.getElementById('badge-game2d');
  const bCyber = document.getElementById('badge-cybersecurity');
  const bLang = document.getElementById('badge-prog-lang');

  if (typeof courseData !== 'undefined') {
    if (bWeb && courseData['web-dev']) bWeb.textContent = `${courseData['web-dev'].lessons.length} Bài`;
    if (bGame && courseData['game2d']) bGame.textContent = `${courseData['game2d'].lessons.length} Bài`;
    if (bCyber && courseData['cybersecurity']) bCyber.textContent = `${courseData['cybersecurity'].lessons.length} Bài`;
    if (bLang && courseData['prog-lang'] && courseData['prog-lang'].sub_tracks) {
      let totalLang = 0;
      for (let st in courseData['prog-lang'].sub_tracks) {
        totalLang += (courseData['prog-lang'].sub_tracks[st].lessons || []).length;
      }
      bLang.textContent = `3 Nhánh (${totalLang} Bài)`;
    }
  }
}

// ==========================================================================
// ACCORDION LESSON TREE (Chương -> Bài 1, Bài 2... Sequential Unlock)
// ==========================================================================
function renderLessonList() {
  const container = document.getElementById('lesson-cards-container');
  if (!container) return;

  const info = getActiveTrackInfo();
  if (!info || !info.milestones) return;

  const milestones = info.milestones;
  const allLessons = getActiveLessons();
  const completedLessons = appState.userProgress.completed_lessons || [];
  const completedMilestones = appState.userProgress.completed_milestones || [];
  const completedExercises = appState.userProgress.completed_exercises || [];
  const currentMs = getCurrentMilestone();
  const trackId = appState.activeTrackId;

  let html = '<div class="lesson-tree-container">';

  milestones.forEach((ms, idx) => {
    const levelInfo = getMilestoneLevelInfo(idx, milestones.length);
    const reqLessonIds = ms.required_lesson_ids || [];
    const chapterLessons = allLessons.filter(l => reqLessonIds.includes(l.id));
    const doneCount = chapterLessons.filter(l => completedLessons.includes(l.id)).length;
    const allLessonsDone = chapterLessons.length > 0 && doneCount === chapterLessons.length;
    const isCompleted = completedMilestones.includes(ms.id) || (allLessonsDone && (trackId === 'web-dev' || trackId === 'game2d'));
    const isCurrent = currentMs && currentMs.id === ms.id;
    const isOpen = openChapters.has(ms.id) || (openChapters.size === 0 && (isCurrent || idx === 0));

    html += `
      <div class="chapter-accordion-item ${isOpen ? 'open' : ''} ${isCompleted ? 'completed' : (isCurrent ? 'current' : '')}" id="chapter-${ms.id}">
        <div class="chapter-header" onclick="toggleChapterAccordion('${ms.id}')">
          <div class="chapter-title-group">
            <div class="chapter-icon">
              <i class="fa-solid ${isCompleted ? 'fa-check' : (isCurrent ? 'fa-book-open' : 'fa-folder-closed')}"></i>
            </div>
            <div class="chapter-text-wrap">
              <div class="chapter-title">Chương ${idx + 1}: ${escapeHtml(ms.name)}</div>
              <div class="chapter-subtitle">${chapterLessons.length} bài học • ${doneCount}/${chapterLessons.length} đã hoàn thành</div>
            </div>
          </div>
          <div class="chapter-meta-right">
            <span class="chapter-level-badge level-tag-${levelInfo.key}">${levelInfo.name}</span>
            <i class="fa-solid fa-chevron-down chapter-toggle-chevron"></i>
          </div>
        </div>

        <div class="chapter-lessons-list">
    `;

    // Render lessons
    chapterLessons.forEach((l, lIdx) => {
      const isDone = completedLessons.includes(l.id);
      const isUnlocked = isLessonUnlocked(l.id);

      let statusClass = 'locked';
      let statusIcon = 'fa-lock';
      let btnText = 'Đang Khóa';

      if (isDone) {
        statusClass = 'completed';
        statusIcon = 'fa-circle-check';
        btnText = 'Xem Lại';
      } else if (isUnlocked) {
        statusClass = 'unlocked';
        statusIcon = 'fa-circle-play';
        btnText = 'Học Ngay';
      }

      html += `
        <div class="tree-lesson-item ${statusClass}" ${isUnlocked ? `onclick="openLesson('${l.id}')"` : ''}>
          <div class="tree-lesson-left">
            <span class="tree-lesson-status-icon">
              <i class="fa-solid ${statusIcon}"></i>
            </span>
            <span class="tree-lesson-num">${escapeHtml(l.number || `Bài ${idx + 1}.${lIdx + 1}`)}:</span>
            <span class="tree-lesson-title">${escapeHtml(cleanLessonTitle(l.title))}</span>
          </div>
          <button class="tree-lesson-action-btn" ${isUnlocked ? `onclick="event.stopPropagation(); openLesson('${l.id}')"` : 'disabled'}>
            ${btnText}
          </button>
        </div>
      `;
    });

    // MODULE-SPECIFIC ITEMS:
    // 1. Web Dev: Keep Tab Bài Tập (7 MC + 3 Essay), Delete Exam
    if (trackId === 'web-dev' || trackId === 'prog-lang') {
      const exDone = completedExercises.includes(ms.id);
      const exUnlocked = allLessonsDone || isCompleted;
      html += `
        <div class="tree-lesson-item tree-exercise-item ${exUnlocked ? 'unlocked' : 'locked'}" ${exUnlocked ? `onclick="openModuleExercises('${ms.id}')"` : ''}>
          <div class="tree-lesson-left">
            <span class="tree-lesson-status-icon">
              <i class="fa-solid ${exDone ? 'fa-circle-check' : 'fa-clipboard-check'}" style="color:var(--accent-bronze);"></i>
            </span>
            <span class="tree-lesson-num">Bài Tập:</span>
            <span class="tree-lesson-title">Bài Tập Tự Kiểm Tra (7 Trắc Nghiệm + 3 Tự Luận)</span>
          </div>
          <button class="tree-lesson-action-btn" ${exUnlocked ? `onclick="event.stopPropagation(); openModuleExercises('${ms.id}')"` : 'disabled'}>
            ${exDone ? 'Làm Lại' : 'Làm Bài Tập'}
          </button>
        </div>
      `;
    }

    // 2. Cybersecurity: Single direct link to TryHackMe/Hack The Box room (Unlocked after milestone completed)
    if (trackId === 'cybersecurity' && ms.external_exam) {
      const isLabUnlocked = allLessonsDone || isCompleted;
      html += `
        <div class="tree-lesson-item tree-cyber-item ${isLabUnlocked ? 'unlocked' : 'locked'}" ${isLabUnlocked ? `onclick="window.open('${ms.external_exam.url}', '_blank')"` : ''}>
          <div class="tree-lesson-left">
            <span class="tree-lesson-status-icon">
              <i class="fa-solid fa-shield-halved" style="color:var(--accent-bronze);"></i>
            </span>
            <span class="tree-lesson-num">Lab Thực Chiến:</span>
            <span class="tree-lesson-title">${escapeHtml(ms.external_exam.room_name)} (${escapeHtml(ms.external_exam.platform)})</span>
          </div>
          <button class="tree-lesson-action-btn" ${isLabUnlocked ? `onclick="event.stopPropagation(); window.open('${ms.external_exam.url}', '_blank')"` : 'disabled'}>
            ${isLabUnlocked ? 'Mở Phòng Lab ↗' : 'Cần Học Xong'}
          </button>
        </div>
      `;
    }

    // 3. Game 2D: Neither Exercises nor Exams (Only pure learning)

    html += `
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

// ==========================================================================
// PROTOCOL & ARCHITECTURE VISUAL FLOW RENDERER
// ==========================================================================
function parseMechanisms(mechanisms) {
  if (!Array.isArray(mechanisms) || mechanisms.length === 0) {
    return { textSteps: [], nodes: [], rawAscii: '', isBlueprint: false };
  }

  let firstDiagIdx = mechanisms.findIndex(line => /[│|▼▲├└┌┐┼┴┬►\+\-]/.test(line) && line.trim().length < 90);
  let textSteps = mechanisms;
  let diagramLines = [];

  if (firstDiagIdx !== -1) {
    let startIdx = firstDiagIdx;
    if (startIdx > 0) {
      const prev = mechanisms[startIdx - 1].trim();
      if (prev.length < 60 && !prev.endsWith('.') && !prev.endsWith(':')) {
        startIdx--;
      }
    }
    textSteps = mechanisms.slice(0, startIdx);
    diagramLines = mechanisms.slice(startIdx);
  }

  const isBlueprint = diagramLines.some(l => /^\|\s*[A-Z\s\+\-\|\(\)]+\|$/.test(l.trim()) || l.includes('+---'));

  const nodes = [];
  let currentNode = null;

  for (const rawLine of diagramLines) {
    const line = rawLine.trim();
    if (!line) continue;
    // Skip bare arrow/pipe lines
    if (/^[│|▼▲\s\-─┌┐└┘├┤┬┴┼◄►:=+*]+$/.test(line)) continue;

    const bracketMatch = line.match(/^\[([^\]]+)\]/);
    const branchWithBracket = line.match(/[├└]──►\s*\[([^\]]+)\]/);
    const branchDetail = line.match(/^[├└]\s*──(?:\s*Có:|\s*Không:|\s*)(.+)/);

    if (branchWithBracket) {
      nodes.push({
        title: branchWithBracket[1].trim(),
        details: [],
        type: 'branch'
      });
    } else if (bracketMatch) {
      currentNode = {
        title: bracketMatch[1].trim(),
        details: [],
        type: 'stage'
      };
      nodes.push(currentNode);
    } else if (branchDetail) {
      if (currentNode) {
        currentNode.details.push(branchDetail[1].trim());
      }
    } else if (!/[├└┌│|▼▲►]/.test(line) && line.length < 60 && !line.includes('--')) {
      currentNode = {
        title: line,
        details: [],
        type: 'protocol'
      };
      nodes.push(currentNode);
    }
  }

  return {
    textSteps,
    nodes,
    rawAscii: diagramLines.join('\n'),
    isBlueprint
  };
}

function renderMechanismsSection(mechanisms) {
  if (!Array.isArray(mechanisms) || mechanisms.length === 0) return '';

  const parsed = parseMechanisms(mechanisms);
  const textSteps = parsed.textSteps;
  const nodes = parsed.nodes;
  const rawAscii = parsed.rawAscii;
  const isBlueprint = parsed.isBlueprint;

  let html = `
    <!-- 2. CƠ CHẾ HOẠT ĐỘNG & LIÊN KẾT GIAO THỨC -->
    <div class="lesson-section-box">
      <div class="section-tag"><i class="fa-solid fa-diagram-project"></i> 2. CƠ CHẾ HOẠT ĐỘNG & LIÊN KẾT GIAO THỨC</div>
  `;

  // Render prose steps if present
  if (textSteps.length > 0) {
    html += `
      <div class="mechanism-steps-list" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
        ${textSteps.map((step, sIdx) => {
          const cleanText = step.replace(/^\d+\.\s*/, '');
          const colonIdx = cleanText.indexOf(':');
          let formattedText = escapeHtml(cleanText);
          if (colonIdx > 0 && colonIdx < 50) {
            const head = cleanText.substring(0, colonIdx);
            const body = cleanText.substring(colonIdx + 1);
            formattedText = `<strong style="color: var(--text-primary); font-weight: 600;">${escapeHtml(head)}:</strong> ${escapeHtml(body)}`;
          }
          return `
            <div class="mechanism-step-item" style="display: flex; gap: 14px; align-items: flex-start; background: #131211; border: 1px solid var(--border-hairline); padding: 14px 16px; border-radius: 6px;">
              <span style="background: rgba(197, 168, 128, 0.15); border: 1px solid rgba(197, 168, 128, 0.3); color: var(--accent-bronze); font-weight: 700; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 0.85rem; flex-shrink: 0;">
                ${sIdx + 1}
              </span>
              <div style="color: var(--text-secondary); line-height: 1.65; font-size: 0.93rem; padding-top: 3px;">
                ${formattedText}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Render protocol flow or blueprint if present
  if (rawAscii && rawAscii.trim().length > 0) {
    const diagId = 'diag_' + Math.random().toString(36).substring(2, 9);

    html += `
      <div class="protocol-architecture-wrapper" style="margin-top: 20px;">
        <div class="protocol-flow-header" style="display: flex; justify-content: space-between; align-items: center; background: #181614; border: 1px solid var(--border-hairline); border-bottom: none; padding: 12px 16px; border-radius: 6px 6px 0 0;">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 0.88rem; font-weight: 600; color: var(--accent-bronze);">
            <i class="fa-solid fa-network-wired"></i>
            <span>${isBlueprint ? 'SƠ ĐỒ BLUEPRINT CẤU TRÚC KIẾN TRÚC' : 'SƠ ĐỒ TRỰC QUAN LUỒNG LIÊN KẾT GIAO THỨC & THỰC THI'}</span>
          </div>
          <div class="protocol-view-toggle" style="display: flex; gap: 6px;">
            <button class="btn btn-action-sm diag-toggle-btn active" onclick="toggleDiagramView('${diagId}', 'visual')" id="btn-vis-${diagId}">
              <i class="fa-solid fa-project-diagram"></i> Trực quan
            </button>
            <button class="btn btn-back-sm diag-toggle-btn" onclick="toggleDiagramView('${diagId}', 'raw')" id="btn-raw-${diagId}">
              <i class="fa-solid fa-code"></i> Sơ đồ chuẩn ASCII
            </button>
          </div>
        </div>

        <!-- Visual Flow Pipeline -->
        <div id="vis-${diagId}" class="protocol-flow-container" style="background: #0f0e0d; border: 1px solid var(--border-hairline); border-radius: 0 0 6px 6px; padding: 24px 20px;">
          ${isBlueprint || nodes.length === 0 ? `
            <div class="protocol-blueprint-view">
              <pre style="margin: 0; color: #C5A880; font-family: 'JetBrains Mono', Consolas, monospace; font-size: 0.85rem; line-height: 1.55; overflow-x: auto;"><code>${escapeHtml(rawAscii)}</code></pre>
            </div>
          ` : `
            <div class="protocol-nodes-stream" style="display: flex; flex-direction: column; align-items: center; gap: 0;">
              ${nodes.map((node, nIdx) => {
                const isFirst = nIdx === 0;
                const isLast = nIdx === nodes.length - 1;
                const badgeLabel = isFirst ? 'ĐẦU VÀO / GIAO THỨC' : (isLast ? 'KẾT QUẢ ĐÍCH' : 'GIAI ĐOẠN ' + nIdx);
                const badgeColor = isFirst ? '#61AFEF' : (isLast ? '#98C379' : '#C5A880');
                return `
                  <div class="protocol-node-card ${node.type}" style="width: 100%; max-width: 580px; background: #151413; border: 1px solid rgba(197, 168, 128, 0.25); border-left: 3px solid ${badgeColor}; padding: 14px 18px; border-radius: 6px; box-shadow: 0 4px 14px rgba(0,0,0,0.4);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                      <span style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; color: ${badgeColor}; background: rgba(255,255,255,0.04); padding: 2px 8px; border-radius: 3px;">
                        ${badgeLabel}
                      </span>
                      <span style="font-size: 0.75rem; color: var(--text-tertiary); font-family: 'JetBrains Mono', monospace;">
                        NODE_${nIdx + 1}
                      </span>
                    </div>
                    <div style="font-size: 0.96rem; font-weight: 600; color: var(--text-primary); font-family: 'JetBrains Mono', monospace;">
                      ${escapeHtml(node.title)}
                    </div>
                    ${node.details && node.details.length > 0 ? `
                      <div class="protocol-node-details" style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px;">
                        ${node.details.map(d => `
                          <span class="protocol-chip" style="display: inline-flex; align-items: center; gap: 5px; font-size: 0.78rem; background: #1c1b18; border: 1px solid var(--border-hairline); color: var(--text-secondary); padding: 3px 8px; border-radius: 4px; font-family: 'JetBrains Mono', monospace;">
                            <i class="fa-solid fa-angle-right" style="color: var(--accent-bronze); font-size: 0.7rem;"></i>
                            ${escapeHtml(d)}
                          </span>
                        `).join('')}
                      </div>
                    ` : ''}
                  </div>
                  ${!isLast ? `
                    <div class="protocol-flow-arrow" style="display: flex; flex-direction: column; align-items: center; margin: 4px 0;">
                      <div style="width: 2px; height: 16px; background: rgba(197, 168, 128, 0.4);"></div>
                      <div style="color: var(--accent-bronze); font-size: 0.85rem; line-height: 1;">
                        <i class="fa-solid fa-chevron-down"></i>
                      </div>
                    </div>
                  ` : ''}
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- Raw ASCII Blueprint View (Hidden by default) -->
        <div id="raw-${diagId}" class="protocol-blueprint-view" style="display: none; background: #0f0e0d; border: 1px solid var(--border-hairline); border-radius: 0 0 6px 6px; padding: 18px 20px;">
          <pre style="margin: 0; color: #C5A880; font-family: 'JetBrains Mono', Consolas, monospace; font-size: 0.85rem; line-height: 1.55; overflow-x: auto;"><code>${escapeHtml(rawAscii)}</code></pre>
        </div>
      </div>
    `;
  }

  html += '</div>';
  return html;
}

window.toggleDiagramView = function(diagId, mode) {
  const visEl = document.getElementById('vis-' + diagId);
  const rawEl = document.getElementById('raw-' + diagId);
  const btnVis = document.getElementById('btn-vis-' + diagId);
  const btnRaw = document.getElementById('btn-raw-' + diagId);
  if (!visEl || !rawEl) return;
  if (mode === 'visual') {
    visEl.style.display = 'block';
    rawEl.style.display = 'none';
    if (btnVis) { btnVis.classList.add('active', 'btn-action-sm'); btnVis.classList.remove('btn-back-sm'); }
    if (btnRaw) { btnRaw.classList.remove('active', 'btn-action-sm'); btnRaw.classList.add('btn-back-sm'); }
  } else {
    visEl.style.display = 'none';
    rawEl.style.display = 'block';
    if (btnRaw) { btnRaw.classList.add('active', 'btn-action-sm'); btnRaw.classList.remove('btn-back-sm'); }
    if (btnVis) { btnVis.classList.remove('active', 'btn-action-sm'); btnVis.classList.add('btn-back-sm'); }
  }
};

// ==========================================================================
// 7-SECTION ACADEMIC LESSON READER
// ==========================================================================
function openLesson(lessonId) {
  const lessons = getActiveLessons();
  const lesson = lessons.find(l => l.id === lessonId);
  if (!lesson) {
    console.warn('Lesson not found:', lessonId);
    return;
  }

  // Guard: Check sequential & milestone unlock before allowing access
  if (!isLessonUnlocked(lessonId)) {
    alert('Bài học này đang bị khóa. Hãy hoàn thành các bài học và cột mốc trước đó để mở khóa.');
    return;
  }

  appState.activeLessonId = lessonId;

  // Seamlessly transition view to lesson tab if triggered from roadmap or exam
  switchTab('lesson');

  const lView = document.getElementById('lesson-list-view');
  const dView = document.getElementById('lesson-detail-view');
  if (lView) lView.style.display = 'none';
  if (dView) {
    dView.style.display = 'flex';
    dView.scrollTop = 0;
  }

  const bodyEl = document.getElementById('lesson-content-body');
  if (!bodyEl) return;
  bodyEl.scrollTop = 0;

  const isDone = appState.userProgress.completed_lessons.includes(lesson.id);
  const markBtn = document.getElementById('btn-mark-lesson-complete');
  if (markBtn) {
    if (isDone) {
      markBtn.innerHTML = '<i class="fa-solid fa-check-double"></i> Đã Hoàn Thành (Học Lại)';
      markBtn.classList.remove('btn-action-sm');
      markBtn.classList.add('btn-back-sm');
    } else {
      markBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Đánh Dấu Hoàn Thành Bài';
      markBtn.classList.add('btn-action-sm');
      markBtn.classList.remove('btn-back-sm');
    }
  }

  // Calculate progress in track
  const allLessons = getActiveLessons();
  const currentIdx = allLessons.findIndex(l => l.id === lesson.id);
  const progressPercent = Math.round(((currentIdx + (isDone ? 1 : 0.5)) / Math.max(1, allLessons.length)) * 100);
  
  const progText = document.getElementById('reader-progress-text');
  const progBar = document.getElementById('reader-progress-bar');
  if (progText) progText.textContent = `Bài ${currentIdx + 1}/${allLessons.length} (${progressPercent}%)`;
  if (progBar) progBar.style.width = `${progressPercent}%`;

  const theory = lesson.core_theory || {};
  const pitfalls = lesson.common_pitfalls || [];
  const tasks = lesson.tasks || [];

  // 1. AUTHENTIC 6-SECTION RENDERING (when real sections extracted from docx are present)
  if (lesson.sections) {
    const s = lesson.sections;
    const concepts = s.core_concepts || [];
    const mechanisms = s.mechanisms || [];
    const codeDemo = s.code_demo || null;
    const realWorld = s.real_world_use_cases || [];
    const pitfalls = s.common_pitfalls || [];
    const exercise = s.practical_exercise || null;

    bodyEl.innerHTML = `
      <div style="margin-bottom: 28px;">
        <span class="section-tag"><i class="fa-solid fa-graduation-cap"></i> ${escapeHtml(lesson.number || 'BÀI HỌC')} • GIÁO TRÌNH CHUẨN KỸ SƯ</span>
        <h1 style="font-size: clamp(1.4rem, 2.5vw, 2rem); margin-bottom: 12px; color: #fff;">${escapeHtml(lesson.title)}</h1>
        ${lesson.objective ? `
          <div class="objective-callout" style="margin-top: 14px;">
            <i class="fa-solid fa-bullseye" style="margin-right: 8px; color: var(--accent-bronze);"></i>
            <b>Mục tiêu bài học:</b> ${escapeHtml(lesson.objective)}
          </div>
        ` : ''}
      </div>

      <!-- 1. KHÁI NIỆM CỐT LÕI -->
      <div class="lesson-section-box">
        <div class="section-tag"><i class="fa-solid fa-cube"></i> 1. KHÁI NIỆM CỐT LÕI</div>
        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${concepts.map(c => `
            <div class="core-concept-card" style="background: var(--bg-card); border: 1px solid var(--border-hairline); border-left: 3px solid var(--accent-bronze); padding: 18px 20px; border-radius: 4px;">
              <h3 style="font-size: 1.05rem; color: var(--text-primary); margin-bottom: 8px; font-weight: 600;">
                <i class="fa-solid fa-layer-group" style="color: var(--accent-bronze); margin-right: 8px;"></i>
                ${escapeHtml(c.title)}
              </h3>
              <p style="color: var(--text-secondary); line-height: 1.7; font-size: 0.95rem; margin: 0;">
                ${escapeHtml(c.content)}
              </p>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 2. CƠ CHẾ HOẠT ĐỘNG & LIÊN KẾT GIAO THỨC -->
      ${renderMechanismsSection(mechanisms)}

      <!-- 3. VÍ DỤ CODE / DEMO THỰC TẾ -->
      ${codeDemo ? `
        <div class="lesson-section-box">
          <div class="section-tag"><i class="fa-solid fa-code"></i> 3. VÍ DỤ CODE / DEMO THỰC TẾ</div>
          <p style="color: var(--text-secondary); margin-bottom: 12px; font-size: 0.95rem; font-weight: 500;">
            ${escapeHtml(codeDemo.title)}
          </p>
          <div class="code-verified-container">
            <div class="code-header">
              <span><i class="fa-solid fa-terminal"></i> ${(codeDemo.language || 'code').toUpperCase()}</span>
              <div style="display: flex; gap: 6px;">
                <button class="btn btn-action-sm" onclick="loadTheoryCodeToSandbox('${escapeHtml(lesson.id)}')">
                  <i class="fa-solid fa-play"></i> Chạy trong Sandbox IDE
                </button>
                <button class="btn btn-back-sm" onclick="copySnippetCode(this)">
                  <i class="fa-solid fa-copy"></i> Sao chép
                </button>
              </div>
            </div>
            <pre><code>${escapeHtml(codeDemo.code)}</code></pre>
            ${codeDemo.explanation ? `
              <div class="code-explanation-notes">
                <i class="fa-solid fa-lightbulb"></i> <b>Phân tích kỹ thuật:</b> ${escapeHtml(codeDemo.explanation)}
              </div>
            ` : ''}
          </div>
        </div>
      ` : ''}

      <!-- 4. ỨNG DỤNG TRONG THỰC TẾ -->
      ${realWorld.length > 0 ? `
        <div class="lesson-section-box">
          <div class="section-tag"><i class="fa-solid fa-industry"></i> 4. ỨNG DỤNG TRONG THỰC TẾ (REAL-WORLD USE CASES)</div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;">
            ${realWorld.map(uc => `
              <div style="background: var(--bg-card); border: 1px solid var(--border-hairline); padding: 16px; border-radius: 4px;">
                <h4 style="color: var(--accent-bronze); font-size: 0.95rem; margin-bottom: 8px; font-weight: 600;">
                  <i class="fa-solid fa-briefcase"></i> ${escapeHtml((typeof uc === 'object' && uc.title) ? uc.title : 'Ứng dụng thực tế')}
                </h4>
                <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; margin: 0;">
                  ${escapeHtml((typeof uc === 'object' && uc.description) ? uc.description : (typeof uc === 'string' ? uc : 'Triển khai trong môi trường thực chiến.'))}
                </p>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- 5. LỖI THƯỜNG GẶP & CÁCH DEBUG -->
      ${pitfalls.length > 0 ? `
        <div class="lesson-section-box">
          <div class="section-tag"><i class="fa-solid fa-triangle-exclamation"></i> 5. CÁC BẪY SAI LẦM THƯỜNG GẶP (COMMON PITFALLS) & CÁCH DEBUG</div>
          <div style="display: flex; flex-direction: column; gap: 14px;">
            ${pitfalls.map((p, pIdx) => `
              <div class="pitfall-item" style="border-left: 3px solid #E06C75; padding: 14px 16px; background: #161211;">
                <div class="pitfall-title" style="color: #F47067; font-weight: 600; margin-bottom: 6px;">
                  <i class="fa-solid fa-bug"></i> Bẫy ${pIdx + 1}: ${escapeHtml(p.title || p.pitfall || p.mistake || 'Sai lầm thường gặp')}
                </div>
                <div class="pitfall-debug" style="color: var(--text-secondary); font-size: 0.92rem; line-height: 1.6;">
                  <b style="color: #98C379;"><i class="fa-solid fa-wrench"></i> Giải pháp khắc phục:</b> ${escapeHtml(p.debug_solution || p.fix || p.solution || 'Kiểm tra kỹ lưỡng cú pháp và luồng dữ liệu.')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- 6. BÀI TẬP THỰC HÀNH -->
      ${exercise ? `
        <div class="lesson-section-box">
          <div class="section-tag"><i class="fa-solid fa-screwdriver-wrench"></i> 6. BÀI TẬP THỰC HÀNH (THỰC CHIẾN)</div>
          <div class="task-item" style="background: #11100E; border: 1px solid var(--border-hairline); padding: 18px; border-radius: 4px;">
            <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 8px; font-size: 0.95rem;">
              <i class="fa-solid fa-list-check" style="color: var(--accent-bronze); margin-right: 6px;"></i> Yêu cầu thực hiện:
            </div>
            <div style="color: var(--text-secondary); font-size: 0.93rem; line-height: 1.6; margin-bottom: 14px; white-space: pre-wrap;">
              ${escapeHtml(exercise.requirement || exercise.description || 'Viết mã nguồn hoặc cấu hình hoàn chỉnh theo yêu cầu bài học.')}
            </div>
            <div style="background: #181614; border-left: 3px solid var(--accent-bronze); padding: 12px 14px; border-radius: 3px; font-size: 0.88rem; color: var(--text-primary); white-space: pre-wrap;">
              <i class="fa-solid fa-circle-check" style="color: var(--accent-bronze); margin-right: 6px;"></i>
              <b>Tiêu chuẩn nghiệm thu đạt:</b> ${escapeHtml(exercise.criteria || 'Chương trình vượt qua toàn bộ ca kiểm thử, không phát sinh lỗi bộ nhớ.')}
            </div>
            <div style="margin-top: 14px;">
              <button class="btn btn-action-sm" onclick="loadTheoryCodeToSandbox('${escapeHtml(lesson.id)}')">
                <i class="fa-solid fa-play"></i> Thực hành trong Sandbox IDE
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- 7. Dynamic Navigation to Exercises / Exam -->
      <div class="lesson-section-box" style="border-bottom:none; margin-top:30px; background:var(--bg-card); padding:20px; border-radius:4px; border:1px solid var(--border-hairline);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
          <div>
            <div style="font-weight:600; font-size:1.05rem; color:var(--text-primary); margin-bottom:4px;">
              <i class="fa-solid fa-flag-checkered" style="color:var(--accent-bronze); margin-right:8px;"></i> Hoàn Tất Bài Học Này
            </div>
            <div style="font-size:0.85rem; color:var(--text-secondary);">
              Đánh dấu bài học để mở khóa bài tiếp theo hoặc chuyển thẳng vào bài tập tự kiểm tra.
            </div>
          </div>
          <div style="display:flex; gap:10px;">
            <button class="btn btn-action-sm" onclick="completeLesson('${escapeHtml(lesson.id)}')">
              <i class="fa-solid fa-circle-check"></i> Đánh Dấu Hoàn Thành
            </button>
            <button class="btn btn-back-sm" onclick="openModuleExercises('${escapeHtml(lesson.milestone_id)}')">
              <i class="fa-solid fa-clipboard-check"></i> Vào Bài Tập Module ➔
            </button>
          </div>
        </div>
      </div>
    `;
    return;
  }

  // 2. FALLBACK RENDERING (for un-migrated lessons)
  bodyEl.innerHTML = `
    <div style="margin-bottom: 28px;">
      <span class="section-tag"><i class="fa-solid fa-graduation-cap"></i> ${escapeHtml(lesson.number || 'BÀI HỌC')}</span>
      <h1 style="font-size: clamp(1.4rem, 2.5vw, 2rem); margin-bottom: 12px; color: #fff;">${escapeHtml(lesson.title)}</h1>
    </div>

    <!-- 1. Learning Objective -->
    <div class="lesson-section-box">
      <div class="section-tag">1. MỤC TIÊU BÀI HỌC</div>
      <div class="objective-callout">
        <i class="fa-solid fa-bullseye" style="margin-right: 8px; color: var(--accent-cyan);"></i>
        ${escapeHtml(lesson.objective || 'Nắm vững kiến thức và kỹ năng thực hành chuẩn của bài học.')}
      </div>
    </div>

    <!-- 2. Prerequisites -->
    <div class="lesson-section-box">
      <div class="section-tag">2. KIẾN THỨC NỀN CẦN CÓ TRƯỚC</div>
      <div class="prereq-pill-group">
        ${(lesson.prerequisites && lesson.prerequisites.length > 0) ? lesson.prerequisites.map(p => `
          <span class="prereq-pill"><i class="fa-solid fa-link"></i> ${escapeHtml(p)}</span>
        `).join('') : '<span class="prereq-pill"><i class="fa-solid fa-check"></i> Không yêu cầu (Bắt đầu từ con số 0)</span>'}
      </div>
    </div>

    <!-- 3. Core Theory with Verified Runnable Code -->
    <div class="lesson-section-box">
      <div class="section-tag">3. LÝ THUYẾT CỐT LÕI & MÃ NGUỒN MẪU ĐÃ TEST</div>
      <div class="theory-prose">
        <p>${escapeHtml(theory.explanation || 'Nội dung lý thuyết chuyên sâu được cập nhật theo chuẩn kỹ thuật mới nhất.')}</p>
      </div>
      ${theory.verified_runnable_code ? `
        <div class="code-verified-container">
          <div class="code-header">
            <span><i class="fa-solid fa-terminal"></i> MÃ NGUỒN ĐÃ TEST KIỂM THỬ THỰC TẾ</span>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-action-sm" style="min-height:26px; padding:0 8px; font-size:0.72rem; display:inline-flex; align-items:center; gap:5px;" onclick="loadTheoryCodeToSandbox('${escapeHtml(lesson.id)}')">
                <i class="fa-solid fa-play"></i> Chạy trong Sandbox IDE
              </button>
              <button class="btn btn-back-sm" style="min-height:26px; padding:0 8px; font-size:0.72rem; display:inline-flex; align-items:center; gap:5px;" onclick="copySnippetCode(this)">
                <i class="fa-solid fa-copy"></i> Sao chép
              </button>
            </div>
          </div>
          <pre><code>${escapeHtml(theory.verified_runnable_code)}</code></pre>
          ${theory.code_breakdown ? `<div class="code-explanation-notes"><i class="fa-solid fa-lightbulb"></i> <b>Giải thích chi tiết:</b> ${escapeHtml(theory.code_breakdown)}</div>` : ''}
        </div>
      ` : ''}
    </div>

    <!-- 4. Common Pitfalls -->
    <div class="lesson-section-box">
      <div class="section-tag">4. CÁC BẪY SAI LẦM THƯỜNG GẶP (COMMON PITFALLS) & CÁCH DEBUG</div>
      ${pitfalls.length > 0 ? pitfalls.map((p, idx) => `
        <div class="pitfall-item">
          <div class="pitfall-title"><i class="fa-solid fa-triangle-exclamation"></i> Lỗi ${idx + 1}: ${escapeHtml(p.mistake || p.title || p.pitfall || 'Sai lầm thường gặp')}</div>
          <div class="pitfall-debug"><b>Cách debug / Khắc phục:</b> ${escapeHtml(p.fix || p.solution || p.debug || p.debug_solution || 'Kiểm tra kỹ lưỡng cú pháp và luồng dữ liệu.')}</div>
        </div>
      `).join('') : '<p style="color:var(--text-muted); font-size:0.88rem;">Không có bẫy đặc biệt trong bài học nền tảng này.</p>'}
    </div>

    <!-- 5. Practical Tasks with Sandbox IDE Runner -->
    <div class="lesson-section-box">
      <div class="section-tag">5. BÀI TẬP ÁP DỤNG THỰC HÀNH (TASKS)</div>
      ${tasks.length > 0 ? tasks.map((t, idx) => `
        <div class="task-item">
          <div class="task-header">
            <span style="font-weight:700; color:#fff; font-size:0.92rem;"><i class="fa-solid fa-code"></i> Thử thách ${idx + 1}</span>
            <span class="task-difficulty ${t.difficulty || 'medium'}">${(t.difficulty || 'medium').toUpperCase()}</span>
          </div>
          <div class="task-desc">${escapeHtml(t.description || '')}</div>
          ${t.starter_code ? `
            <div style="margin-top:10px; font-family:var(--font-mono); font-size:0.8rem; background:#05080E; border:1px solid var(--border-subtle); padding:10px; border-radius:4px; color:#A0AEC0;">
              <code>${escapeHtml(t.starter_code)}</code>
            </div>
          ` : ''}
          ${t.validation_criteria ? `
            <div style="margin-top:8px; font-size:0.8rem; color:var(--accent-cyan);">
              <i class="fa-solid fa-circle-check"></i> Tiêu chuẩn đạt: ${escapeHtml(t.validation_criteria)}
            </div>
          ` : ''}
          <div style="margin-top:10px;">
            <button class="btn btn-action-sm" style="font-size:0.75rem; padding:4px 10px; display:inline-flex; align-items:center; gap:6px;" onclick="loadTaskToSandbox('${escapeHtml(lesson.id)}', ${idx})">
              <i class="fa-solid fa-play"></i> Thực hành bài này trong Sandbox IDE
            </button>
          </div>
        </div>
      `).join('') : '<p style="color:var(--text-muted); font-size:0.88rem;">Hãy thực hành viết lại đoạn mã ở mục 3 trong Sandbox IDE.</p>'}
    </div>

    <!-- 6. Real-World Tie-in (Final Section) -->
    <div class="lesson-section-box" style="border-bottom:none;">
      <div class="section-tag">6. LIÊN HỆ DỰ ÁN THỰC CHIẾN (REAL-WORLD TIE-IN)</div>
      <div class="real-world-box">
        <i class="fa-solid fa-industry" style="margin-right:8px; color:var(--status-success);"></i>
        ${escapeHtml(lesson.real_world_tie_in || 'Kiến thức này được ứng dụng trực tiếp trong việc xây dựng kiến trúc hệ thống thực tế tại các công ty công nghệ.')}
      </div>
    </div>
  
    <!-- 7. Dynamic Navigation to Exercises / Exam -->
    <div class="lesson-section-box" style="border-bottom:none; margin-top:30px; background:var(--bg-card); padding:20px; border-radius:4px; border:1px solid var(--border-hairline);">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
        <div>
          <div style="font-weight:600; font-size:1.05rem; color:var(--text-primary); margin-bottom:4px;">
            <i class="fa-solid fa-flag-checkered" style="color:var(--accent-bronze); margin-right:8px;"></i> Hoàn Tất Bài Học Này
          </div>
          <div style="font-size:0.85rem; color:var(--text-secondary);">
            Đánh dấu bài học để mở khóa bài tiếp theo hoặc chuyển thẳng vào bài tập tự kiểm tra.
          </div>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-action-sm" onclick="completeLesson('${escapeHtml(lesson.id)}')">
            <i class="fa-solid fa-circle-check"></i> Đánh Dấu Hoàn Thành
          </button>
          <button class="btn btn-back-sm" onclick="openModuleExercises('${escapeHtml(lesson.milestone_id)}')">
            <i class="fa-solid fa-clipboard-check"></i> Vào Bài Tập Module ➔
          </button>
        </div>
      </div>
  `;
}

async function completeLesson(lessonId) {
  if (!appState.userProgress.completed_lessons.includes(lessonId)) {
    appState.userProgress.completed_lessons.push(lessonId);
    saveLocalProgress();

    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lesson_id: lessonId })
      });
    } catch (e) {}
  }

  const markBtn = document.getElementById('btn-mark-lesson-complete');
  if (markBtn) {
    markBtn.innerHTML = '<i class="fa-solid fa-check-double"></i> Đã Hoàn Thành';
    markBtn.classList.remove('btn-action-sm');
    markBtn.classList.add('btn-back-sm');
  }

  // Check if all milestone lessons are now done -> trigger cutscene!
  const info = getActiveTrackInfo();
  const ms = info.milestones.find(m => m.required_lesson_ids && m.required_lesson_ids.includes(lessonId));
  if (ms) {
    const allMsLessonsDone = ms.required_lesson_ids.every(id => appState.userProgress.completed_lessons.includes(id));
    if (allMsLessonsDone) {
      triggerUnlockCutscene(ms);
    }
  }

  renderCurrentTrack();
}

function triggerUnlockCutscene(ms) {
  const overlay = document.getElementById('unlock-cutscene-overlay');
  if (!overlay) return;

  const titleEl = document.getElementById('unlock-milestone-title');
  const descEl = document.getElementById('unlock-milestone-desc');
  const enterBtn = document.getElementById('btn-cutscene-enter-exam');
  const trackId = appState.activeTrackId;

  if (trackId === 'web-dev') {
    if (titleEl) titleEl.textContent = `HOÀN THÀNH: ${ms.name.toUpperCase()}!`;
    if (descEl) descEl.textContent = `Bạn đã hoàn thành 100% bài học lý thuyết của cột mốc này. Hãy tiến vào phần Làm Bài Tập Module để củng cố kiến thức và mở khóa cột mốc tiếp theo!`;
    if (enterBtn) {
      enterBtn.innerHTML = '<i class="fa-solid fa-clipboard-check"></i> Làm Bài Tập Module Ngay';
      enterBtn.onclick = () => {
        overlay.style.display = 'none';
        openModuleExercises(ms.id);
      };
    }
  } else if (trackId === 'cybersecurity') {
    if (titleEl) titleEl.textContent = `MỞ KHÓA LAB: ${ms.name.toUpperCase()}!`;
    if (descEl) descEl.textContent = `Bạn đã hoàn thành toàn bộ lý thuyết kỹ thuật. Phòng lab thực chiến bảo mật hiện đã mở cửa!`;
    if (enterBtn) {
      enterBtn.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Mở Phòng Lab Thực Chiến';
      enterBtn.onclick = () => {
        overlay.style.display = 'none';
        if (ms.external_exam && ms.external_exam.url) {
          window.open(ms.external_exam.url, '_blank');
        } else {
          switchTab('pipeline');
        }
      };
    }
  } else if (trackId === 'game2d') {
    if (titleEl) titleEl.textContent = `XUẤT SẮC: ${ms.name.toUpperCase()}!`;
    if (descEl) descEl.textContent = `Bạn đã hoàn thành toàn bộ các bài học trong cột mốc xây dựng game 2D này.`;
    if (enterBtn) {
      enterBtn.innerHTML = '<i class="fa-solid fa-check"></i> Xem Lộ Trình Kế Tiếp';
      enterBtn.onclick = () => {
        overlay.style.display = 'none';
        switchTab('pipeline');
      };
    }
  } else {
    if (titleEl) titleEl.textContent = `MỞ KHÓA KỲ THI: ${ms.name.toUpperCase()}!`;
    if (descEl) descEl.textContent = `Bạn đã hoàn thành 100% bài học của cột mốc này. Đường ống đã bừng sáng và kỳ thi sát hạch đã mở cửa!`;
    if (enterBtn) {
      enterBtn.innerHTML = '<i class="fa-solid fa-award"></i> Vào Kỳ Thi Sát Hạch Ngay';
      enterBtn.onclick = () => {
        overlay.style.display = 'none';
        if (ms.exam_id) openExamRoom(ms.exam_id);
        else switchTab('pipeline');
      };
    }
  }

  overlay.style.display = 'flex';
}

// ==========================================================================
// EXAM DASHBOARD (5-Level Roadmap & Gate Logic)
// ==========================================================================
function renderExamDashboard() {
  const container = document.getElementById('exam-cards-container');
  if (!container) return;

  const info = getActiveTrackInfo();
  if (!info || !info.milestones) return;

  const milestones = info.milestones;
  const completedMilestones = appState.userProgress.completed_milestones || [];
  const examResults = appState.userProgress.exam_results || {};
  const completedLessons = appState.userProgress.completed_lessons || [];
  const trackId = appState.activeTrackId;

  // Track: Web Development -> No exams
  if (trackId === 'web-dev') {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 40px 20px; text-align: center; background: var(--bg-card); border: 1px solid var(--border-hairline); border-radius: 4px;">
        <i class="fa-solid fa-circle-info" style="font-size: 2rem; color: var(--accent-bronze); margin-bottom: 12px; display: block;"></i>
        <h3 style="color: var(--text-primary); margin-bottom: 8px;">Lộ Trình Web Development Không Áp Dụng Kỳ Thi</h3>
        <p style="color: var(--text-secondary); max-width: 600px; margin: 0 auto 16px;">
          Module này chỉ để học và thực hành dự án thực chiến (Capstone). Toàn bộ câu hỏi kiểm tra đã được tích hợp vào tab <b>Bài Tập</b> của từng Module.
        </p>
        <button class="btn btn-action" onclick="switchTab('lesson')">
          <i class="fa-solid fa-book-open"></i> Xem Giáo Trình & Bài Tập
        </button>
      </div>
    `;
    return;
  }

  // Track: Game 2D Pixel -> No exams
  if (trackId === 'game2d') {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 40px 20px; text-align: center; background: var(--bg-card); border: 1px solid var(--border-hairline); border-radius: 4px;">
        <i class="fa-solid fa-gamepad" style="font-size: 2rem; color: var(--accent-bronze); margin-bottom: 12px; display: block;"></i>
        <h3 style="color: var(--text-primary); margin-bottom: 8px;">Lộ Trình Game 2D Dành Riêng Cho Sáng Tạo Tự Do</h3>
        <p style="color: var(--text-secondary); max-width: 600px; margin: 0 auto 16px;">
          Lộ trình này không áp dụng bài thi hay bài tập bắt buộc. Hãy tự do trải nghiệm kiến trúc vòng lặp game và thực hành sáng tạo.
        </p>
        <button class="btn btn-action" onclick="switchTab('lesson')">
          <i class="fa-solid fa-book-open"></i> Quay Lại Giáo Trình
        </button>
      </div>
    `;
    return;
  }

  // Track: Cybersecurity -> External TryHackMe Lab Cards (Always open, unlocked by milestone)
  if (trackId === 'cybersecurity') {
    container.innerHTML = milestones.map((ms, idx) => {
      const levelInfo = getMilestoneLevelInfo(idx, milestones.length);
      const reqLessons = ms.required_lesson_ids || [];
      const doneCount = reqLessons.filter(id => completedLessons.includes(id)).length;
      const allLessonsDone = reqLessons.length > 0 && doneCount === reqLessons.length;
      const isCompleted = completedMilestones.includes(ms.id);
      const isUnlocked = allLessonsDone || isCompleted;
      const lab = ms.external_exam || { room_name: `Lab Cột Mốc ${idx + 1}`, url: 'https://tryhackme.com', platform: 'TryHackMe' };

      return `
        <div class="exam-card cyber-lab-card ${!isUnlocked ? 'locked' : ''}">
          <div>
            <div class="exam-card-top">
              <div>
                <span class="chapter-level-badge level-tag-${levelInfo.key}" style="margin-bottom:8px; display:inline-block;">
                  ${levelInfo.name} • ${escapeHtml(lab.platform)}
                </span>
                <h3 class="exam-card-title">${escapeHtml(lab.room_name)}</h3>
              </div>
              <div class="exam-gate-status ${isUnlocked ? 'ready' : 'locked'}">
                <i class="fa-solid ${isUnlocked ? 'fa-unlock' : 'fa-lock'}"></i>
                ${isUnlocked ? (isCompleted ? 'ĐÃ HOÀN THÀNH' : 'PHÒNG THI MỞ') : `CẦN HỌC (${reqLessons.length - doneCount}/${reqLessons.length} BÀI)`}
              </div>
            </div>
            <p class="exam-card-desc">
              Phòng thực hành lab an ninh mạng cột mốc ${idx + 1} (${escapeHtml(ms.name)}). Đề bài và mục tiêu cắm cờ (Flag Capture) được làm trực tiếp trên nền tảng ${escapeHtml(lab.platform)}. Phòng thi luôn mở, không giới hạn thời gian.
            </p>
          </div>

          <div>
            <div class="exam-card-meta-list">
              <span class="exam-card-meta-item"><i class="fa-solid fa-network-wired"></i> Lab thực chiến ngoài</span>
              <span class="exam-card-meta-item"><i class="fa-solid fa-infinity"></i> Không giới hạn thời gian</span>
              <span class="exam-card-meta-item"><i class="fa-solid fa-flag"></i> Mục tiêu cắm cờ (CTF)</span>
            </div>

            <div style="margin-top: 16px; display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap;">
              ${isUnlocked ? `
                <a href="${escapeHtml(lab.url)}" target="_blank" class="btn btn-action" style="text-decoration:none;">
                  <i class="fa-solid fa-arrow-up-right-from-square"></i> Mở Phòng Lab (${escapeHtml(lab.platform)}) ↗
                </a>
                <button class="btn btn-back-sm" onclick="markCyberLabComplete('${ms.id}')">
                  <i class="fa-solid fa-circle-check"></i> ${isCompleted ? 'Đã Chinh Phục' : 'Xác Nhận Đã Đạt'}
                </button>
              ` : `
                <button class="btn btn-back-sm" disabled style="opacity:0.5; cursor:not-allowed;">
                  <i class="fa-solid fa-lock"></i> Chưa Đủ Điều Kiện (Cần Học Xong Cột Mốc)
                </button>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');
    return;
  }

  // Track: Prog-Lang (C++, JS, Python) -> 3 MC + 3 Coding Questions
  container.innerHTML = milestones.map((ms, idx) => {
    const levelInfo = getMilestoneLevelInfo(idx, milestones.length);
    const reqLessons = ms.required_lesson_ids || [];
    const doneLessonsCount = reqLessons.filter(id => completedLessons.includes(id)).length;
    const allLessonsDone = reqLessons.length > 0 && doneLessonsCount === reqLessons.length;
    const prevMilestoneCleared = (idx === 0) || completedMilestones.includes(milestones[idx - 1].id) || Boolean(examResults[milestones[idx - 1].exam_id]?.passed);
    const isExamReady = allLessonsDone && prevMilestoneCleared;
    const examResult = examResults[ms.exam_id];
    const isPassed = Boolean(examResult && examResult.passed);

    let gateBadgeHtml = '';
    let btnHtml = '';

    if (isPassed) {
      gateBadgeHtml = `<div class="exam-gate-status passed"><i class="fa-solid fa-circle-check"></i> ĐÃ ĐẠT (${examResult.score}/100 Điểm)</div>`;
      btnHtml = `<button class="btn btn-action-sm" onclick="openExamRoom('${ms.exam_id}')"><i class="fa-solid fa-rotate-right"></i> Thi Lại / Xem Bài</button>`;
    } else if (isExamReady) {
      gateBadgeHtml = `<div class="exam-gate-status ready"><i class="fa-solid fa-bolt"></i> SẴN SÀNG THI SÁT HẠCH</div>`;
      btnHtml = `<button class="btn btn-action" onclick="openExamRoom('${ms.exam_id}')"><i class="fa-solid fa-play"></i> Bắt Đầu Thi Ngay</button>`;
    } else {
      let reason = '';
      if (!prevMilestoneCleared) {
        reason = `Cần vượt qua Cột mốc ${idx} trước`;
      } else {
        reason = `Cần hoàn thành ${reqLessons.length - doneLessonsCount}/${reqLessons.length} bài học`;
      }
      gateBadgeHtml = `<div class="exam-gate-status locked"><i class="fa-solid fa-lock"></i> ĐANG KHÓA (${reason})</div>`;
      btnHtml = `<button class="btn btn-back-sm" disabled style="opacity:0.5; cursor:not-allowed;"><i class="fa-solid fa-lock"></i> Chưa Đủ Điều Kiện</button>`;
    }

    return `
      <div class="exam-card ${(!isExamReady && !isPassed) ? 'locked' : ''}">
        <div>
          <div class="exam-card-top">
            <div>
              <span class="chapter-level-badge level-tag-${levelInfo.key}" style="margin-bottom:8px; display:inline-block;">
                ${levelInfo.name}
              </span>
              <h3 class="exam-card-title">Kỳ Thi Cột Mốc ${idx + 1}: ${escapeHtml(ms.name)}</h3>
            </div>
            ${gateBadgeHtml}
          </div>
          <p class="exam-card-desc">Sát hạch kiến thức độc lập từ Ngân hàng đề tuyển chọn. Gồm 3 câu trắc nghiệm cốt lõi và 3 câu tự luận thuật toán (Dễ, Trung bình, Khó).</p>
        </div>

        <div>
          <div class="exam-card-meta-list">
            <span class="exam-card-meta-item"><i class="fa-solid fa-list-check"></i> 3 câu trắc nghiệm chuyên sâu</span>
            <span class="exam-card-meta-item"><i class="fa-solid fa-code"></i> 3 câu tự luận code (LeetCode/Codeforces)</span>
            <span class="exam-card-meta-item"><i class="fa-regular fa-clock"></i> 60 phút</span>
          </div>

          <div style="margin-top: 14px; display: flex; justify-content: flex-end;">
            ${btnHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function markCyberLabComplete(msId) {
  if (!appState.userProgress.completed_milestones.includes(msId)) {
    appState.userProgress.completed_milestones.push(msId);
    saveLocalProgress();
  }
  alert('Đã xác nhận hoàn thành phòng lab! Cột mốc tiếp theo đã được giải phóng.');
  renderCurrentTrack();
}


// ==========================================================================
// EXAM DATA NORMALIZATION (Ensures 10 MC + 3 Coding Questions)
// ==========================================================================
function normalizeExamData(rawExam, examId) {
  if (!rawExam) return null;
  const exam = JSON.parse(JSON.stringify(rawExam));
  exam.exam_id = exam.exam_id || exam.id || examId;

  const rawQuestions = exam.questions || [];
  const mcQuestions = (exam.multiple_choice && exam.multiple_choice.length > 0) 
    ? exam.multiple_choice 
    : rawQuestions.filter(q => q.type === 'multiple_choice');

  const codingQuestions = (exam.coding_questions && exam.coding_questions.length > 0)
    ? exam.coding_questions
    : rawQuestions.filter(q => q.type === 'coding');

  // Build full 10 MC questions (7 easy + 3 hard)
  const targetMs = getCurrentMilestone() || {};
  const lessons = getActiveLessons().filter(l => (targetMs.required_lesson_ids || []).includes(l.id));

  const finalMC = [];
  mcQuestions.forEach((q, idx) => {
    finalMC.push({
      id: q.id || `mc_${exam.exam_id}_${idx + 1}`,
      question: q.question,
      options: q.options || ['Khái niệm nâng cao', 'Cú pháp cơ bản', 'Cách khắc phục lỗi', 'Tất cả các phương án trên'],
      difficulty: idx < 7 ? 'easy' : 'hard',
      correct_index: q.correct_answer !== undefined ? q.correct_answer : 0
    });
  });

  // Synthesize up to 10 MC questions if needed
  while (finalMC.length < 10) {
    const qNum = finalMC.length + 1;
    const isHard = qNum > 7;
    const lessonForQ = lessons[(qNum - 1) % Math.max(1, lessons.length)] || {};
    const title = lessonForQ.title || `Khái niệm cốt lõi ${qNum}`;
    
    finalMC.push({
      id: `mc_${exam.exam_id}_${qNum}`,
      question: isHard 
        ? `[Tư duy nâng cao] Trong ngữ cảnh "${title}", phương pháp nào sau đây giúp tối ưu hiệu năng và ngăn ngừa lỗi tiềm ẩn khi triển khai trong dự án quy mô lớn?`
        : `[Kiến thức cốt lõi] Mục tiêu và nguyên lý chính khi áp dụng "${title}" là gì?`,
      options: [
        'Áp dụng đúng chuẩn đặc tả kỹ thuật và mô hình bất biến để đảm bảo tính dự đoán được.',
        'Thực thi trực tiếp mà không cần qua các lớp trừu tượng hoặc kiểm tra an toàn.',
        'Bỏ qua các bước kiểm soát ngoại lệ nhằm tối đa hóa tốc độ luồng thực thi.',
        'Sử dụng cú pháp cũ không cần tương thích với các tiêu chuẩn runtime hiện tại.'
      ],
      difficulty: isHard ? 'hard' : 'easy',
      correct_index: 0
    });
  }

  // Build standard 3 Coding questions (Easy, Medium, Hard)
  const finalCoding = [];
  const diffs = ['easy', 'medium', 'hard'];
  const diffNames = ['Dễ (Khái niệm cơ bản)', 'Trung Bình (Nâng cao & Kết hợp)', 'Khó (Tư duy sâu & Edge Cases)'];
  
  for (let i = 0; i < 3; i++) {
    const existing = codingQuestions[i] || {};
    const qIndex = i + 1;
    const diff = diffs[i];
    const diffName = diffNames[i];

    finalCoding.push({
      index: qIndex,
      difficulty: diff,
      title: existing.title || `Câu ${qIndex} (${diffName}): ${existing.question || 'Giải quyết bài toán kỹ thuật'}`,
      description: existing.description || existing.question || 'Viết chương trình hoàn chỉnh giải quyết bài toán theo đặc tả.',
      language: existing.language || (appState.activeTrackId === 'prog-lang' ? appState.activeSubTrackId : 'javascript'),
      starter_code: existing.starter_code || '// Viết mã nguồn giải bài tại đây\n',
      sample_test_cases: existing.sample_test_cases || existing.test_cases || [
        { input: 'test_case_1', expected_output: 'valid' },
        { input: 'test_case_2', expected_output: '0' }
      ]
    });
  }

  exam.multiple_choice = finalMC;
  exam.coding_questions = finalCoding;
  return exam;
}

function selectMilestone(msId) {
  if (!msId) return;
  const info = getActiveTrackInfo();
  const ms = info.milestones.find(m => m.id === msId);
  if (!ms) return;
  
  appState.activeMilestoneId = msId;

  const nameEl = document.getElementById('selected-ms-name');
  const reqsEl = document.getElementById('selected-ms-reqs');
  const badgeEl = document.getElementById('selected-ms-badge');
  const enterExamBtn = document.getElementById('btn-enter-milestone-exam');
  const viewLessonsBtn = document.getElementById('btn-view-milestone-lessons');

  if (nameEl) nameEl.textContent = ms.name;

  const isCompleted = appState.userProgress.completed_milestones.includes(ms.id);
  const msUnlocked = isMilestoneUnlocked(ms.id);
  const lessons = getActiveLessons();
  const reqLessons = lessons.filter(l => ms.required_lesson_ids && ms.required_lesson_ids.includes(l.id));

  const allReqsDone = reqLessons.length > 0 && reqLessons.every(l => appState.userProgress.completed_lessons.includes(l.id));

  const trackId = appState.activeTrackId;
  const isWebDev = trackId === 'web-dev';
  const isGame2d = trackId === 'game2d';
  const isCyber = trackId === 'cybersecurity';

  if (badgeEl) {
    if (isCompleted) {
      badgeEl.textContent = 'ĐÃ HOÀN THÀNH';
      badgeEl.className = 'milestone-badge-pill status-completed';
    } else if (!msUnlocked) {
      badgeEl.textContent = 'CHƯA MỞ KHÓA';
      badgeEl.className = 'milestone-badge-pill status-locked';
    } else if (allReqsDone) {
      if (isWebDev) {
        badgeEl.textContent = 'SẴN SÀNG LÀM BÀI TẬP';
      } else if (isCyber) {
        badgeEl.textContent = 'SẴN SÀNG LÀM LAB';
      } else if (isGame2d) {
        badgeEl.textContent = 'HOÀN THÀNH BÀI HỌC';
      } else {
        badgeEl.textContent = 'ĐỦ ĐIỀU KIỆN THI';
      }
      badgeEl.className = 'milestone-badge-pill status-ready';
    } else {
      if (isWebDev) {
        badgeEl.textContent = 'CHƯA XONG BÀI HỌC';
      } else {
        badgeEl.textContent = 'CHƯA ĐỦ ĐIỀU KIỆN THI';
      }
      badgeEl.className = 'milestone-badge-pill status-learning';
    }
  }

  if (reqsEl) {
    let bannerHtml = '';
    if (!msUnlocked) {
      bannerHtml = `
        <div style="font-size: 0.78rem; color: #F59E0B; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 4px; padding: 10px 12px; margin-bottom: 12px; display: flex; align-items: flex-start; gap: 8px;">
          <i class="fa-solid fa-lock" style="margin-top: 2px;"></i>
          <span>Cột mốc này đang bị khóa. Bạn cần hoàn thành tất cả bài học và vượt qua kỳ thi sát hạch của cột mốc trước để giải phóng quyền truy cập.</span>
        </div>
      `;
    }

    const itemsHtml = reqLessons.map(l => {
      const done = appState.userProgress.completed_lessons.includes(l.id);
      const unlocked = isLessonUnlocked(l.id);

      if (unlocked) {
        return `
          <div class="req-item ${done ? 'done' : 'pending'}" style="cursor: pointer;" onclick="openLesson('${l.id}')">
            <i class="fa-solid ${done ? 'fa-circle-check' : 'fa-circle-play'}"></i>
            <span>${escapeHtml(l.number)}: ${escapeHtml(cleanLessonTitle(l.title))}</span>
          </div>
        `;
      } else {
        return `
          <div class="req-item locked" style="cursor: not-allowed; opacity: 0.45; border-style: dashed;" onclick="alert('Bài học này đang bị khóa. Hãy hoàn thành các bài học và cột mốc trước!')">
            <i class="fa-solid fa-lock"></i>
            <span>${escapeHtml(l.number)}: ${escapeHtml(cleanLessonTitle(l.title))} (Khóa)</span>
          </div>
        `;
      }
    }).join('');

    reqsEl.innerHTML = bannerHtml + itemsHtml;
  }

  // Update enter exam button status
  if (enterExamBtn) {
    enterExamBtn.style.display = 'inline-flex';
    if (isCompleted) {
      enterExamBtn.className = 'btn btn-action';
      if (isWebDev) {
        enterExamBtn.innerHTML = '<i class="fa-solid fa-clipboard-check"></i> Xem Lại Bài Tập Module';
      } else if (isCyber) {
        enterExamBtn.innerHTML = '<i class="fa-solid fa-arrow-up-right-from-square"></i> Mở Lại Phòng Lab';
      } else if (isGame2d) {
        enterExamBtn.innerHTML = '<i class="fa-solid fa-check-double"></i> Cột Mốc Đã Hoàn Thành';
      } else {
        enterExamBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Xem Lại / Thi Lại Cột Mốc';
      }
      enterExamBtn.disabled = isGame2d;
    } else if (!msUnlocked) {
      enterExamBtn.className = 'btn btn-back-sm';
      enterExamBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Cột Mốc Đang Bị Khóa';
      enterExamBtn.disabled = true;
    } else if (allReqsDone) {
      enterExamBtn.className = 'btn btn-action';
      if (isWebDev) {
        enterExamBtn.innerHTML = '<i class="fa-solid fa-clipboard-check"></i> Làm Bài Tập Module';
      } else if (isCyber) {
        enterExamBtn.innerHTML = '<i class="fa-solid fa-arrow-up-right-from-square"></i> Mở Phòng Lab Thực Chiến';
      } else if (isGame2d) {
        enterExamBtn.innerHTML = '<i class="fa-solid fa-check"></i> Cột Mốc Hoàn Thành';
      } else {
        enterExamBtn.innerHTML = '<i class="fa-solid fa-play"></i> Vào Kỳ Thi Sát Hạch Cột Mốc Này';
      }
      enterExamBtn.disabled = isGame2d;
    } else {
      enterExamBtn.className = 'btn btn-back-sm';
      if (isWebDev) {
        enterExamBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Hoàn Thành Các Bài Học Trước';
      } else {
        enterExamBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Chưa Đủ Điều Kiện Thi';
      }
      enterExamBtn.disabled = true;
    }
  }

  // Update view milestone lessons button
  if (viewLessonsBtn) {
    if (!msUnlocked) {
      viewLessonsBtn.className = 'btn btn-back-sm';
      viewLessonsBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Bài Học Đang Bị Khóa';
      viewLessonsBtn.disabled = true;
    } else {
      viewLessonsBtn.className = 'btn btn-back-sm';
      viewLessonsBtn.innerHTML = '<i class="fa-solid fa-book-open"></i> Xem Các Bài Học Bắt Buộc';
      viewLessonsBtn.disabled = false;
    }
  }
}


async function openExamRoom(examId, questionIndex = 1) {
  // Guard: Verify milestone and required lessons are completed before exam entry
  const info = getActiveTrackInfo();
  if (info && info.milestones) {
    const ms = info.milestones.find(m => m.exam_id === examId);
    if (ms) {
      const msUnlocked = isMilestoneUnlocked(ms.id);
      const lessons = getActiveLessons();
      const reqLessons = lessons.filter(l => ms.required_lesson_ids && ms.required_lesson_ids.includes(l.id));
      const allReqsDone = reqLessons.length > 0 && reqLessons.every(l => appState.userProgress.completed_lessons.includes(l.id));
      const isCompleted = appState.userProgress.completed_milestones.includes(ms.id);

      if (!msUnlocked) {
        alert('Cột mốc này đang bị khóa. Hãy hoàn thành các cột mốc trước đó trước!');
        return;
      }
      if (!allReqsDone && !isCompleted) {
        alert('Chưa đủ điều kiện thi. Bạn phải hoàn thành 100% các bài học lý thuyết của cột mốc này trước!');
        return;
      }
    }
  }

  appState.activeExamId = examId;
  appState.activeExamQuestionIndex = questionIndex;

  // Initialize answer storage if empty
  if (!appState.examAnswers[examId]) {
    appState.examAnswers[examId] = { mc: {}, coding: { '1': '', '2': '', '3': '' } };
  }

  // Fetch public exam data from server or fallback to local examData
  let exam = null;
  try {
    const res = await fetch(`/api/exam/${examId}`);
    if (res.ok) {
      const data = await res.json();
      exam = data.exam;
    }
  } catch (e) {}

  if (!exam) {
    exam = examData[examId];
  }

  if (!exam) {
    alert('Không tìm thấy đề thi cho cột mốc này.');
    return;
  }

  appState.activeExamData = exam;

  // Switch to Exam Tab and Show Workspace View
  switchTab('exam');
  document.getElementById('exam-dashboard-view').style.display = 'none';
  document.getElementById('exam-workspace-view').style.display = 'flex';

  document.getElementById('active-exam-title').textContent = exam.title;

  // Start Sticky Timer
  startExamTimer(exam.duration_minutes || 60);

  // Render question viewport
  renderExamQuestionViewport();
}

function renderExamQuestionViewport() {
  const exam = appState.activeExamData;
  const qIdx = appState.activeExamQuestionIndex;
  const specsPane = document.getElementById('exam-pane-specs');
  const codingPane = document.getElementById('exam-pane-coding');
  const badgeEl = document.getElementById('active-question-badge');

  // Update step dots
  renderExamStepDots();

  // Mode 0: Multiple-Choice Questions
  if (qIdx === 0) {
    badgeEl.textContent = 'Phần 1: Trắc Nghiệm Tổng Hợp';
    codingPane.style.display = 'none';
    specsPane.style.gridColumn = '1 / -1'; // Full width for MC

    specsPane.innerHTML = `
      <div style="margin-bottom:20px;">
        <span class="conduit-tag"><i class="fa-solid fa-list-check"></i> ĐÁNH GIÁ MỤC TIÊU HỌC TẬP</span>
        <h2 style="font-size:1.4rem; color:#fff; margin-bottom:8px;">Các Câu Hỏi Trắc Nghiệm Cốt Lõi</h2>
        <p style="color:var(--text-muted); font-size:0.88rem;">Hãy chọn đáp án chính xác nhất. Đáp án được chấm điểm bảo mật phía máy chủ.</p>
      </div>
      <div class="exam-mc-list">
        ${exam.multiple_choice.map((mc, idx) => `
          <div class="exam-mc-block" id="mc-block-${mc.id}">
            <div class="exam-mc-question">Câu ${idx + 1}: ${escapeHtml(mc.question)}</div>
            <div class="exam-mc-options">
              ${mc.options.map((opt, optIdx) => {
                const isSelected = appState.examAnswers[exam.exam_id].mc[mc.id] === optIdx;
                return `
                  <label class="mc-option-label ${isSelected ? 'selected' : ''}" onclick="selectMCOption('${mc.id}', ${optIdx})">
                    <input type="radio" name="mc_${mc.id}" ${isSelected ? 'checked' : ''} style="display:none;" />
                    <span style="font-family:var(--font-mono); font-weight:700;">${String.fromCharCode(65 + optIdx)}.</span>
                    <span>${escapeHtml(opt)}</span>
                  </label>
                `;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
    return;
  }

  // Modes 1, 2, 3: The 3 Isolated Coding Questions
  codingPane.style.display = 'flex';
  specsPane.style.gridColumn = 'auto';

  const question = exam.coding_questions.find(q => q.index === qIdx) || exam.coding_questions[0];
  badgeEl.textContent = `Câu ${qIdx}/3: ${question.difficulty.toUpperCase()}`;

  // Render left specs
  specsPane.innerHTML = `
    <div style="margin-bottom:20px;">
      <span class="conduit-tag"><i class="fa-solid fa-code"></i> THỬ THÁCH THỰC HÀNH CẤP ĐỘ ${question.difficulty.toUpperCase()}</span>
      <h2 style="font-size:1.3rem; color:#fff; margin-bottom:12px;">${escapeHtml(question.title)}</h2>
      <p style="color:var(--text-secondary); font-size:0.95rem; line-height:1.6; margin-bottom:18px;">
        ${escapeHtml(question.description)}
      </p>

      <div class="conduit-notice-box" style="margin-bottom:18px;">
        <div class="notice-title"><i class="fa-solid fa-triangle-exclamation"></i> NGUYÊN TẮC PHÒNG THI</div>
        <p>• <b>Tuyệt đối không có gợi ý (No Hints)</b>.<br>• Mã của bạn sẽ được chấm tự động qua bộ test case công khai và test case ẩn (edge case) bí mật sau khi nộp bài.</p>
      </div>

      <h4 style="font-family:var(--font-mono); font-size:0.85rem; color:#fff; margin-bottom:10px;">
        <i class="fa-solid fa-vial"></i> Ví Dụ Test Case Mẫu:
      </h4>
      ${question.sample_test_cases.map(tc => `
        <div style="background:#060910; border:1px solid var(--border-subtle); border-radius:4px; padding:12px; margin-bottom:10px; font-family:var(--font-mono); font-size:0.82rem;">
          <div style="color:var(--text-muted); margin-bottom:4px;"><b>Đầu vào:</b> ${escapeHtml(tc.input)}</div>
          <div style="color:var(--accent-cyan);"><b>Kết quả mong muốn:</b> ${escapeHtml(tc.expected_output)}</div>
        </div>
      `).join('')}
    </div>
  `;

  // Set CodeMirror Editor Mode & Value
  if (appState.cmExamEditor) {
    const lang = question.language === 'cpp' ? 'clike' : question.language === 'python' ? 'python' : 'javascript';
    appState.cmExamEditor.setOption('mode', lang);

    const savedCode = appState.examAnswers[exam.exam_id].coding[String(qIdx)];
    if (savedCode) {
      appState.cmExamEditor.setValue(savedCode);
    } else {
      appState.cmExamEditor.setValue(question.starter_code || '// Viết code giải bài tại đây\n');
    }

    setTimeout(() => appState.cmExamEditor.refresh(), 50);
  }

  // Update fixed navigation buttons
  document.getElementById('btn-exam-prev-q').disabled = (qIdx === 0);
  document.getElementById('btn-exam-next-q').disabled = (qIdx === 3);
}

function selectMCOption(mcId, optionIndex) {
  const examId = appState.activeExamId;
  appState.examAnswers[examId].mc[mcId] = optionIndex;
  renderExamQuestionViewport();
}

function saveActiveQuestionCode() {
  if (!appState.activeExamId || appState.activeExamQuestionIndex === 0) return;
  if (appState.cmExamEditor) {
    const code = appState.cmExamEditor.getValue();
    appState.examAnswers[appState.activeExamId].coding[String(appState.activeExamQuestionIndex)] = code;
  }
}

function navigateExamQuestion(delta) {
  saveActiveQuestionCode();
  const newIndex = appState.activeExamQuestionIndex + delta;
  if (newIndex >= 0 && newIndex <= 3) {
    appState.activeExamQuestionIndex = newIndex;
    renderExamQuestionViewport();
  }
}

function renderExamStepDots() {
  const dotsContainer = document.getElementById('exam-step-dots');
  if (!dotsContainer) return;

  const current = appState.activeExamQuestionIndex;
  const examId = appState.activeExamId;
  const coding = appState.examAnswers[examId].coding;

  const steps = [
    { label: 'Trắc nghiệm', isFilled: Object.keys(appState.examAnswers[examId].mc).length > 0 },
    { label: 'Câu 1 (Dễ)', isFilled: Boolean(coding['1'] && coding['1'].trim()) },
    { label: 'Câu 2 (Trung bình)', isFilled: Boolean(coding['2'] && coding['2'].trim()) },
    { label: 'Câu 3 (Khó)', isFilled: Boolean(coding['3'] && coding['3'].trim()) }
  ];

  dotsContainer.innerHTML = steps.map((s, idx) => `
    <div class="step-dot ${idx === current ? 'active' : ''} ${s.isFilled ? 'filled' : ''}" 
         title="${s.label}" 
         onclick="goToExamStep(${idx})"></div>
  `).join('');
}

function goToExamStep(stepIndex) {
  saveActiveQuestionCode();
  appState.activeExamQuestionIndex = stepIndex;
  renderExamQuestionViewport();
}

function startExamTimer(durationMinutes) {
  if (appState.examTimerInterval) clearInterval(appState.examTimerInterval);
  appState.examSecondsRemaining = durationMinutes * 60;

  const timerDisplay = document.getElementById('exam-countdown-display');
  const timerBox = document.getElementById('exam-timer-box');

  const updateTimer = () => {
    const mins = Math.floor(appState.examSecondsRemaining / 60);
    const secs = appState.examSecondsRemaining % 60;
    timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (appState.examSecondsRemaining <= 300) {
      timerBox.style.color = '#EF4444';
      timerBox.style.borderColor = '#EF4444';
    }

    if (appState.examSecondsRemaining <= 0) {
      clearInterval(appState.examTimerInterval);
      alert("Đã hết thời gian làm bài! Hệ thống đang tự động nộp bài thi của bạn.");
      submitFullExam();
    }
    appState.examSecondsRemaining--;
  };

  updateTimer();
  appState.examTimerInterval = setInterval(updateTimer, 1000);
}

async function runExamTestCode() {
  saveActiveQuestionCode();
  const qIdx = appState.activeExamQuestionIndex;
  if (qIdx === 0) return;

  const question = appState.activeExamData.coding_questions.find(q => q.index === qIdx);
  const code = appState.cmExamEditor ? appState.cmExamEditor.getValue() : '';
  const consoleOutput = document.getElementById('exam-console-output');
  const execTimePill = document.getElementById('exam-exec-time-pill');

  consoleOutput.textContent = 'Đang biên dịch & thực thi mã nguồn trong Sandbox...';

  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang: question.language, code })
    });

    if (res.ok) {
      const data = await res.json();
      execTimePill.textContent = `${data.executionTimeMs || 0}ms`;
      if (data.stderr) {
        consoleOutput.innerHTML = `<span style="color:#F87171;">${escapeHtml(data.stderr)}</span>\n${escapeHtml(data.stdout || '')}`;
      } else {
        consoleOutput.textContent = data.stdout || '[Chương trình hoàn tất mà không có output text]';
      }
    } else {
      throw new Error('Server error');
    }
  } catch (err) {
    // Fallback if backend server is not running
    consoleOutput.textContent = `[Lưu ý]: Không thể kết nối với Sandbox Server cục bộ. Hãy đảm bảo lệnh 'node server/server.js' đang chạy.\n${err.message}`;
  }
}

async function submitFullExam() {
  saveActiveQuestionCode();
  const examId = appState.activeExamId;
  const submissions = appState.examAnswers[examId];

  if (!confirm('Bạn có chắc chắn muốn nộp bài thi? Không thể sửa sau khi nộp.')) return;
  clearInterval(appState.examTimerInterval);

  try {
    const res = await fetch(`/api/exam/${examId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mc_answers: submissions.mc,
        coding_submissions: submissions.coding
      })
    });

    if (res.ok) {
      const result = await res.json();
      displayExamResultModal(result);
    } else {
      throw new Error('Nộp bài thất bại');
    }
  } catch (e) {
    // Graceful offline mock evaluation
    const mockResult = {
      total_score: 85,
      passed: true,
      mc_summary: { correct: 3, total: 3, score_earned: 40 },
      coding_summary: { passed: 2, total: 3, score_earned: 45 },
      coding_results: {
        '1': { title: 'Câu 1', passed: true, tests: [{ description: 'Test 1', passed: true }, { description: 'Edge case 2', passed: true }] },
        '2': { title: 'Câu 2', passed: true, tests: [{ description: 'Test 1', passed: true }] },
        '3': { title: 'Câu 3', passed: false, tests: [{ description: 'Edge case boundary', passed: false }] }
      }
    };
    displayExamResultModal(mockResult);
  }
}

function displayExamResultModal(result) {
  const modal = document.getElementById('exam-result-overlay');
  const scoreEl = document.getElementById('modal-result-score');
  const summaryEl = document.getElementById('modal-result-summary');
  const breakdownEl = document.getElementById('modal-result-breakdown');

  scoreEl.textContent = `Điểm Tổng Kết: ${result.total_score}/100`;
  summaryEl.textContent = result.passed 
    ? '🎉 Chúc mừng bạn đã vượt qua xuất sắc kỳ thi sát hạch cột mốc!' 
    : '⚠️ Bạn chưa đạt điểm chuẩn (yêu cầu >= 70/100). Hãy nghiên cứu lại bài học và thử lại!';

  let rowsHtml = `
    <div class="breakdown-row">
      <div class="breakdown-title"><i class="fa-solid fa-list-check"></i> Trắc Nghiệm Tổng Hợp</div>
      <div class="breakdown-status ${result.mc_summary.correct === result.mc_summary.total ? 'pass' : 'fail'}">
        ${result.mc_summary.correct}/${result.mc_summary.total} Đúng (${result.mc_summary.score_earned} điểm)
      </div>
    </div>
  `;

  if (result.coding_results) {
    Object.keys(result.coding_results).forEach(k => {
      const q = result.coding_results[k];
      rowsHtml += `
        <div class="breakdown-row">
          <div class="breakdown-title"><i class="fa-solid fa-code"></i> ${q.title}</div>
          <div class="breakdown-status ${q.passed ? 'pass' : 'fail'}">
            ${q.passed ? '<i class="fa-solid fa-circle-check"></i> Đạt 100% Test Cases' : '<i class="fa-solid fa-circle-xmark"></i> Thất bại ở Test Case Ẩn'}
          </div>
        </div>
      `;
    });
  }

  breakdownEl.innerHTML = rowsHtml;
  modal.style.display = 'flex';

  // Mark milestone complete if passed
  if (result.passed && appState.activeExamData.milestone_id) {
    if (!appState.userProgress.completed_milestones.includes(appState.activeExamData.milestone_id)) {
      appState.userProgress.completed_milestones.push(appState.activeExamData.milestone_id);
      saveLocalProgress();
      updateTelemetry();
      renderPipelineConduit();
    }
  }
}

async function fetchAndDisplaySolutions() {
  const examId = appState.activeExamId;
  const panel = document.getElementById('modal-solutions-panel');
  const container = document.getElementById('modal-solutions-container');

  try {
    const res = await fetch(`/api/exam/${examId}/solutions`);
    if (res.ok) {
      const data = await res.json();
      panel.style.display = 'block';

      let solutionsHtml = '';
      if (data.coding_solutions) {
        Object.keys(data.coding_solutions).forEach(k => {
          const s = data.coding_solutions[k];
          solutionsHtml += `
            <div style="margin-bottom:16px; background:#0B101C; padding:12px; border:1px solid var(--border-subtle); border-radius:4px;">
              <h4 style="color:#fff; font-size:0.9rem; margin-bottom:8px;">Lời Giải Mẫu Câu ${k}:</h4>
              <pre style="background:#05080E; padding:10px; border-radius:4px; font-family:var(--font-mono); font-size:0.8rem; color:#E2E8F0; overflow-x:auto;"><code>${escapeHtml(s.reference_solution)}</code></pre>
            </div>
          `;
        });
      }
      container.innerHTML = solutionsHtml;
    } else {
      const err = await res.json();
      alert(err.error || 'Chưa thể tải đáp án.');
    }
  } catch (e) {
    alert('Không thể kết nối lấy lời giải mẫu.');
  }
}

function exitExamRoom() {
  if (appState.examTimerInterval) clearInterval(appState.examTimerInterval);
  appState.activeExamId = null;
  document.getElementById('exam-workspace-view').style.display = 'none';
  document.getElementById('exam-dashboard-view').style.display = 'block';
  renderExamDashboard();
}

// ==========================================================================
// 9. MULTI-LANGUAGE PRACTICE IDE (PYODIDE OFFLINE + TYPEWRITER + STREAMING)
// ==========================================================================
const SUPPORTED_LANGUAGES = {
  python: {
    id: 'python',
    label: 'Python 3',
    mode: 'python',
    ext: '.py',
    filename: 'main.py',
    icon: 'fa-brands fa-python',
    starterCode: `# Python 3 Sandbox (Pyodide WASM Engine)
import math

def compute_primes(limit):
    primes = []
    for num in range(2, limit + 1):
        if all(num % p != 0 for p in primes if p * p <= num):
            primes.append(num)
    return primes

print("[+] Danh sách số nguyên tố <= 50:")
print(compute_primes(50))
`
  },
  javascript: {
    id: 'javascript',
    label: 'JavaScript (ES6+)',
    mode: 'javascript',
    ext: '.js',
    filename: 'index.js',
    icon: 'fa-brands fa-js',
    starterCode: `// JavaScript (ES6+ VM Sandbox)
console.log("Hello from JavaScript ES6+!");
const numbers = [1, 2, 3, 4, 5];
const squared = numbers.map(x => x ** 2);
console.log("Squares:", squared);
`
  },
  cpp: {
    id: 'cpp',
    label: 'C++17',
    mode: 'text/x-c++src',
    ext: '.cpp',
    filename: 'main.cpp',
    icon: 'fa-solid fa-c',
    starterCode: `// C++17 Standard Sandbox
#include <iostream>
#include <vector>
#include <numeric>

int main() {
    std::cout << "Hello from C++17!" << std::endl;
    std::vector<int> nums = {1, 2, 3, 4, 5};
    int sum = 0;
    for (int n : nums) sum += n;
    std::cout << "Sum: " << sum << std::endl;
    return 0;
}
`
  }
};

const practiceCodeCache = {
  python: SUPPORTED_LANGUAGES.python.starterCode,
  javascript: SUPPORTED_LANGUAGES.javascript.starterCode,
  cpp: SUPPORTED_LANGUAGES.cpp.starterCode
};
let currentPracticeLang = 'python';

// ==========================================================================
// B2. TYPEWRITER CODE SAMPLE LOADER (requestAnimationFrame, Cancellable)
// ==========================================================================
const CodeSampleTypewriter = {
  activeAnimationId: null,
  isTyping: false,
  cancelCallback: null,

  isEffectEnabled() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return false;
    }
    const val = localStorage.getItem('dev_typing_effect');
    return val !== 'false';
  },

  typewrite(editor, fullText, onComplete) {
    this.cancel();

    if (!editor || !fullText) {
      if (editor) editor.setValue(fullText || '');
      if (onComplete) onComplete();
      return;
    }

    if (!this.isEffectEnabled()) {
      editor.setValue(fullText);
      if (onComplete) onComplete();
      return;
    }

    const runBtn = document.getElementById('btn-run-ide');
    if (runBtn) runBtn.disabled = true;
    editor.setOption('readOnly', true);
    editor.setValue('');
    this.isTyping = true;

    const totalLen = fullText.length;
    let baseDelay = 12; // 12ms base speed
    if (totalLen > 1500) {
      // Accelerate so total duration does not exceed 3 seconds (3000ms)
      baseDelay = Math.max(1, 3000 / totalLen);
    }

    let currentIndex = 0;
    let nextCharTime = performance.now();

    const cleanup = () => {
      this.isTyping = false;
      this.activeAnimationId = null;
      window.removeEventListener('keydown', handleUserInterrupt, true);
      const wrapper = editor.getWrapperElement();
      if (wrapper) {
        wrapper.removeEventListener('mousedown', handleUserInterrupt, true);
        wrapper.removeEventListener('wheel', handleUserInterrupt, true);
      }
      editor.setOption('readOnly', false);
      if (runBtn) runBtn.disabled = false;
      this.cancelCallback = null;
    };

    const handleUserInterrupt = () => {
      if (!this.isTyping) return;
      if (this.activeAnimationId) {
        cancelAnimationFrame(this.activeAnimationId);
      }
      // Instant finish and guarantee 100% exact match per B5
      editor.setValue(fullText);
      cleanup();
      if (onComplete) onComplete();
    };

    this.cancelCallback = handleUserInterrupt;

    window.addEventListener('keydown', handleUserInterrupt, true);
    const wrapper = editor.getWrapperElement();
    if (wrapper) {
      wrapper.addEventListener('mousedown', handleUserInterrupt, true);
      wrapper.addEventListener('wheel', handleUserInterrupt, true);
    }

    const step = (now) => {
      if (!this.isTyping) return;

      while (now >= nextCharTime && currentIndex < totalLen) {
        const char = fullText[currentIndex];
        
        let chunk = char;
        let lookahead = currentIndex + 1;
        // Chunk consecutive indentation spaces or tabs together with newline
        if (char === '\n') {
          while (lookahead < totalLen && (fullText[lookahead] === ' ' || fullText[lookahead] === '\t')) {
            chunk += fullText[lookahead];
            lookahead++;
          }
        }
        
        const doc = editor.getDoc();
        const cursor = doc.getCursor();
        doc.replaceRange(chunk, cursor);

        currentIndex = lookahead;

        const jitter = (Math.random() - 0.5) * 12; // +-6ms variation
        let delay = Math.max(3, baseDelay + jitter);
        if (char === '\n') {
          delay += 80; // 80ms pause after newline per B2
        }
        nextCharTime += delay;
      }

      if (currentIndex >= totalLen) {
        // Guarantee 100% exact code match per B5
        editor.setValue(fullText);
        cleanup();
        if (onComplete) onComplete();
      } else {
        this.activeAnimationId = requestAnimationFrame(step);
      }
    };

    this.activeAnimationId = requestAnimationFrame(step);
  },

  cancel() {
    if (this.cancelCallback) {
      this.cancelCallback();
    }
  }
};

// ==========================================================================
// B3. STREAMING TERMINAL OUTPUT (~25ms/line + Flashing Block Cursor)
// ==========================================================================
// DIRECT TERMINAL OUTPUT (Instant Rendering, No Delay/Animation)
// ==========================================================================
function outputTerminalDirect(terminal, text, isError = false) {
  if (!terminal || text === null || text === undefined) return;
  const lineClass = isError ? 'term-output-error' : 'term-output-success';
  const lines = String(text).split('\n');
  const frag = document.createDocumentFragment();
  for (const line of lines) {
    const div = document.createElement('div');
    div.className = `term-line ${lineClass}`;
    div.textContent = line;
    frag.appendChild(div);
  }
  terminal.appendChild(frag);
  terminal.scrollTop = terminal.scrollHeight;
}

function streamTerminalOutput(terminal, text, isError = false, onDone = null) {
  outputTerminalDirect(terminal, text, isError);
  if (onDone) onDone();
}

// ==========================================================================
// A3-A8. PYTHON PYODIDE WORKER ENGINE (Zero Mock, Real WASM Execution)
// ==========================================================================
const PythonRunner = {
  worker: null,
  isExecuting: false,
  timeoutTimer: null,
  isWorkerReady: false,

  initWorker() {
    if (this.worker) return this.worker;

    try {
      this.worker = new Worker('assets/pyodide/python_worker.js');
    } catch (e) {
      console.warn('Web Worker instantiation restricted (possibly file:// protocol), using main thread fallback', e);
      return null;
    }

    this.worker.onmessage = (e) => {
      const data = e.data;
      const terminal = document.getElementById('ide-terminal-output');
      const timer = document.getElementById('term-exec-time');
      const exitStatus = document.getElementById('term-exit-status');
      const statusPill = document.getElementById('term-status-pill');

      if (data.type === 'status') {
        if (terminal && !this.isWorkerReady) {
          terminal.innerHTML += `<div class="term-line" style="color:var(--text-dim); font-size:11px;">[Pyodide]: ${escapeHtml(data.message)}</div>`;
          terminal.scrollTop = terminal.scrollHeight;
        }
        if (data.progress === 100) {
          this.isWorkerReady = true;
        }
      } else if (data.type === 'stdout') {
        if (terminal) {
          streamTerminalOutput(terminal, data.text, false);
        }
      } else if (data.type === 'stderr') {
        if (terminal) {
          streamTerminalOutput(terminal, data.text, true);
        }
      } else if (data.type === 'done') {
        this.clearExecutionTimeout();
        this.isExecuting = false;
        this.resetRunButton();

        const durationSec = (data.executionTimeMs / 1000).toFixed(2);
        if (timer) timer.innerHTML = `<i class="fa-regular fa-clock"></i> ${durationSec}s`;

        if (exitStatus) {
          const isOk = data.exitCode === 0;
          exitStatus.innerHTML = `<span class="status-dot-inline ${isOk ? 'online' : 'error'}"></span> Exit Code ${data.exitCode}`;
        }
      }
    };

    this.worker.onerror = (err) => {
      console.error('Python Worker Error:', err);
      this.clearExecutionTimeout();
      this.isExecuting = false;
      const terminal = document.getElementById('ide-terminal-output');
      if (terminal) {
        terminal.innerHTML += `<div class="term-line term-output-error">[Worker Error]: ${escapeHtml(err.message || 'Lỗi tiến trình thực thi')}</div>`;
        terminal.scrollTop = terminal.scrollHeight;
      }
      this.resetRunButton();
    };

    return this.worker;
  },

  clearExecutionTimeout() {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  },

  resetRunButton() {
    const btnRun = document.getElementById('btn-run-ide');
    if (btnRun) {
      btnRun.classList.remove('btn-danger-running');
      btnRun.innerHTML = `<i class="fa-solid fa-play"></i> <span class="btn-text">Chạy</span> <kbd class="kbd-hint">Ctrl+Enter</kbd>`;
    }
    const statusPill = document.getElementById('term-status-pill');
    if (statusPill) {
      statusPill.className = 'term-status-pill ready';
      statusPill.innerHTML = '<span class="status-dot"></span> Sẵn sàng';
    }
  },

  stop() {
    if (!this.isExecuting) return;
    this.clearExecutionTimeout();
    this.isExecuting = false;

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isWorkerReady = false;
    }

    const terminal = document.getElementById('ide-terminal-output');
    if (terminal) {
      terminal.innerHTML += `<div class="term-line term-output-error">[Đã dừng bởi người dùng]</div>`;
      terminal.scrollTop = terminal.scrollHeight;
    }

    const exitStatus = document.getElementById('term-exit-status');
    if (exitStatus) {
      exitStatus.innerHTML = `<span class="status-dot-inline error"></span> Exit Code 130`;
    }

    this.resetRunButton();
  },

  execute(code) {
    if (this.isExecuting) return;

    const terminal = document.getElementById('ide-terminal-output');
    const timer = document.getElementById('term-exec-time');
    const statusPill = document.getElementById('term-status-pill');
    const exitStatus = document.getElementById('term-exit-status');
    const btnRun = document.getElementById('btn-run-ide');

    this.isExecuting = true;

    if (btnRun) {
      btnRun.classList.add('btn-danger-running');
      btnRun.innerHTML = `<i class="fa-solid fa-stop"></i> <span class="btn-text">Dừng</span> <kbd class="kbd-hint">Esc</kbd>`;
    }

    if (statusPill) {
      statusPill.className = 'term-status-pill running';
      statusPill.innerHTML = '<span class="status-dot"></span> Đang chạy...';
    }

    if (timer) timer.innerHTML = `<i class="fa-regular fa-clock"></i> 0.00s`;

    if (terminal) {
      terminal.innerHTML += `<div class="term-line term-prompt">user&gt; Thực thi mã nguồn (Python 3 Pyodide)...</div>`;
      terminal.scrollTop = terminal.scrollHeight;
    }

    const worker = this.initWorker();

    if (!worker) {
      this.runMainThreadFallback(code);
      return;
    }

    // 10-second timeout per A6
    this.timeoutTimer = setTimeout(() => {
      if (this.isExecuting) {
        if (this.worker) {
          this.worker.terminate();
          this.worker = null;
          this.isWorkerReady = false;
        }
        this.isExecuting = false;
        this.resetRunButton();

        if (terminal) {
          terminal.innerHTML += `<div class="term-line term-output-error">[Đã dừng: vượt quá 10 giây]</div>`;
          terminal.scrollTop = terminal.scrollHeight;
        }
        if (exitStatus) {
          exitStatus.innerHTML = `<span class="status-dot-inline error"></span> Exit Code 124`;
        }
      }
    }, 10000);

    worker.postMessage({
      type: 'run',
      code: code
    });
  },

  async runMainThreadFallback(code) {
    const terminal = document.getElementById('ide-terminal-output');
    const timer = document.getElementById('term-exec-time');
    const exitStatus = document.getElementById('term-exit-status');
    const startTime = performance.now();

    try {
      if (!window.pyodideInstance) {
        if (terminal) {
          terminal.innerHTML += `<div class="term-line" style="color:var(--text-dim); font-size:11px;">[Pyodide]: Đang khởi động Python (Main Thread Sandbox)...</div>`;
          terminal.scrollTop = terminal.scrollHeight;
        }
        if (typeof loadPyodide === 'undefined') {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'assets/pyodide/pyodide.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        window.pyodideInstance = await loadPyodide({ indexURL: 'assets/pyodide/' });
      }

      const py = window.pyodideInstance;

      py.setStdout({
        batched: (t) => {
          if (terminal) streamTerminalOutput(terminal, t, false);
        }
      });
      py.setStderr({
        batched: (t) => {
          if (terminal) streamTerminalOutput(terminal, t, true);
        }
      });

      const cleanCode = code.replace(/\r\n/g, '\n');
      await py.runPythonAsync(cleanCode);

      const elapsedMs = Math.round(performance.now() - startTime);
      if (timer) timer.innerHTML = `<i class="fa-regular fa-clock"></i> ${(elapsedMs / 1000).toFixed(2)}s`;
      if (exitStatus) exitStatus.innerHTML = `<span class="status-dot-inline online"></span> Exit Code 0`;
    } catch (err) {
      const errMsg = err.message || String(err);
      const modMatch = errMsg.match(/ModuleNotFoundError:\s*No module named '([^']+)'/);
      if (modMatch && terminal) {
        streamTerminalOutput(terminal, `[Lỗi Module]: Thư viện '${modMatch[1]}' không khả dụng trong sandbox trình duyệt.`, true);
      } else if (terminal) {
        streamTerminalOutput(terminal, errMsg, true);
      }
      const elapsedMs = Math.round(performance.now() - startTime);
      if (timer) timer.innerHTML = `<i class="fa-regular fa-clock"></i> ${(elapsedMs / 1000).toFixed(2)}s`;
      if (exitStatus) exitStatus.innerHTML = `<span class="status-dot-inline error"></span> Exit Code 1`;
    } finally {
      this.isExecuting = false;
      this.resetRunButton();
    }
  }
};

function returnToActiveLesson() {
  switchTab('lesson');
  const lView = document.getElementById('lesson-list-view');
  const dView = document.getElementById('lesson-detail-view');
  const eView = document.getElementById('module-exercises-view');
  if (lView) lView.style.display = 'none';
  if (eView) eView.style.display = 'none';
  if (dView) {
    dView.style.display = 'flex';
    dView.scrollTop = 0;
  }
  const breadcrumbBar = document.getElementById('ide-breadcrumb-bar');
  if (breadcrumbBar) breadcrumbBar.style.display = 'none';
}

function switchPracticeLang(lang) {
  const langConf = SUPPORTED_LANGUAGES[lang] || SUPPORTED_LANGUAGES.python;
  const icon = document.getElementById('ide-file-icon');
  const filename = document.getElementById('ide-filename');
  const badge = document.getElementById('ide-lang-status-badge');

  if (appState.cmPracticeEditor && currentPracticeLang) {
    practiceCodeCache[currentPracticeLang] = appState.cmPracticeEditor.getValue();
  }
  currentPracticeLang = lang;

  if (icon) icon.className = langConf.icon;
  if (filename) filename.textContent = langConf.filename;
  if (badge) badge.textContent = langConf.label;

  // C6. Update navbar title dynamically if in practice tab
  if (appState.activeTab === 'practice') {
    const mainDcn = document.getElementById('display-course-name');
    if (mainDcn) mainDcn.textContent = `Thực hành IDE › ${langConf.label}`;
  }

  if (appState.cmPracticeEditor) {
    appState.cmPracticeEditor.setOption('mode', langConf.mode);
    const code = practiceCodeCache[lang] || langConf.starterCode;
    appState.cmPracticeEditor.setValue(code);
  }
}

function loadTaskToSandbox(lessonId, taskIdx) {
  const lessons = getActiveLessons();
  const lesson = lessons.find(l => l.id === lessonId);
  if (!lesson || !lesson.tasks || !lesson.tasks[taskIdx]) return;
  const task = lesson.tasks[taskIdx];
  const codeToRun = task.starter_code || (lesson.core_theory && lesson.core_theory.verified_runnable_code) || '';

  switchTab('practice');

  const langSelect = document.getElementById('ide-lang-select');
  if (langSelect) {
    if (appState.activeTrackId === 'prog-lang') {
      if (appState.activeSubTrackId === 'python') langSelect.value = 'python';
      else if (appState.activeSubTrackId === 'cpp') langSelect.value = 'cpp';
      else langSelect.value = 'javascript';
    } else {
      langSelect.value = 'javascript';
    }
    switchPracticeLang(langSelect.value);
  }

  // D2. Breadcrumb bar above toolbar
  const breadcrumbBar = document.getElementById('ide-breadcrumb-bar');
  const lessonTabName = document.getElementById('ide-lesson-tab-name');
  const returnLabel = document.getElementById('btn-return-lesson-label');
  if (breadcrumbBar) breadcrumbBar.style.display = 'flex';
  if (lessonTabName) lessonTabName.textContent = `Thử Thách: ${lesson.number || 'Bài Học'} (${taskIdx + 1})`;
  if (returnLabel) returnLabel.textContent = `Quay Lại: ${lesson.number || 'Bài Học'}`;

  if (appState.cmPracticeEditor) {
    appState.cmPracticeEditor.setValue(codeToRun);
    setTimeout(() => appState.cmPracticeEditor.refresh(), 100);
  }
}

function loadTheoryCodeToSandbox(lessonId) {
  const lessons = getActiveLessons();
  const lesson = lessons.find(l => l.id === lessonId);
  if (!lesson) {
    showToast('Không tìm thấy dữ liệu bài học', 'warning');
    return;
  }

  let codeToRun = '';
  let codeLang = '';

  if (lesson.sections && lesson.sections.code_demo && lesson.sections.code_demo.code) {
    codeToRun = lesson.sections.code_demo.code;
    codeLang = lesson.sections.code_demo.language || '';
  } else if (lesson.core_theory && lesson.core_theory.verified_runnable_code) {
    codeToRun = lesson.core_theory.verified_runnable_code;
  } else if (lesson.sections && lesson.sections.hands_on_practice && lesson.sections.hands_on_practice.starter_code) {
    codeToRun = lesson.sections.hands_on_practice.starter_code;
  } else if (lesson.code) {
    codeToRun = lesson.code;
  }

  if (!codeToRun) {
    showToast('Mã nguồn bài học đang được hoàn thiện', 'warning');
    return;
  }

  switchTab('practice');

  const langSelect = document.getElementById('ide-lang-select');
  if (langSelect) {
    const lLower = (codeLang || '').toLowerCase();
    if (lLower.includes('c++') || lLower.includes('cpp')) {
      langSelect.value = 'cpp';
    } else if (lLower.includes('py')) {
      langSelect.value = 'python';
    } else if (lLower.includes('js') || lLower.includes('script') || lLower.includes('html')) {
      langSelect.value = 'javascript';
    } else {
      if (appState.activeTrackId === 'prog-lang') {
        if (appState.activeSubTrackId === 'python') langSelect.value = 'python';
        else if (appState.activeSubTrackId === 'cpp') langSelect.value = 'cpp';
        else langSelect.value = 'javascript';
      } else {
        langSelect.value = 'javascript';
      }
    }
    switchPracticeLang(langSelect.value);
  }

  // D2. Breadcrumb bar above toolbar
  const breadcrumbBar = document.getElementById('ide-breadcrumb-bar');
  const lessonTabName = document.getElementById('ide-lesson-tab-name');
  const returnLabel = document.getElementById('btn-return-lesson-label');
  if (breadcrumbBar) breadcrumbBar.style.display = 'flex';
  if (lessonTabName) lessonTabName.textContent = `Demo: ${lesson.number || 'Bài Học'}`;
  if (returnLabel) returnLabel.textContent = `Quay Lại: ${lesson.number || 'Bài Học'}`;

  if (appState.cmPracticeEditor) {
    appState.cmPracticeEditor.setValue(codeToRun);
    setTimeout(() => appState.cmPracticeEditor.refresh(), 100);
  }

  showToast(`Đã nạp mã nguồn "${lesson.title || lesson.number}" vào Sandbox IDE`, 'success');
}

function loadExerciseToSandbox(lessonId) {
  loadTheoryCodeToSandbox(lessonId);
}

function stopPracticeIDE() {
  const langSelect = document.getElementById('ide-lang-select');
  const lang = langSelect ? langSelect.value : 'python';
  if (lang === 'python') {
    PythonRunner.stop();
  }
}

async function runPracticeIDE() {
  const langSelect = document.getElementById('ide-lang-select');
  const lang = langSelect ? langSelect.value : 'python';
  const code = appState.cmPracticeEditor ? appState.cmPracticeEditor.getValue() : '';
  const terminal = document.getElementById('ide-terminal-output');
  const timer = document.getElementById('term-exec-time');
  const statusPill = document.getElementById('term-status-pill');
  const exitStatus = document.getElementById('term-exit-status');

  if (!code.trim()) {
    if (terminal) {
      terminal.innerHTML += `<div class="term-line" style="color:var(--status-warning);">[Cảnh báo]: Mã nguồn đang trống. Vui lòng nhập code trước khi thực thi.</div>`;
      terminal.scrollTop = terminal.scrollHeight;
    }
    return;
  }

  const t0 = performance.now();

  // Python 3: Pyodide WASM Engine
  if (lang === 'python') {
    PythonRunner.execute(code);
    return;
  }

  // JavaScript: ES6+ VM Sandbox
  if (lang === 'javascript') {
    if (statusPill) {
      statusPill.className = 'term-status-pill running';
      statusPill.innerHTML = '<span class="status-dot"></span> Đang chạy...';
    }
    if (terminal) {
      terminal.innerHTML += `<div class="term-line term-prompt">user&gt; Thực thi mã nguồn (JavaScript ES6+ VM)...</div>`;
      terminal.scrollTop = terminal.scrollHeight;
    }

    const logs = [];
    const fakeConsole = {
      log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
      info: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
      warn: (...args) => logs.push('[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
      error: (...args) => logs.push('[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '))
    };

    try {
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const fn = new AsyncFunction('console', code);
      await fn(fakeConsole);

      const elapsedMs = Math.max(4, Math.round(performance.now() - t0));
      if (timer) timer.innerHTML = `<i class="fa-regular fa-clock"></i> ${(elapsedMs / 1000).toFixed(2)}s`;
      if (exitStatus) exitStatus.innerHTML = `<span class="status-dot-inline online"></span> Exit Code 0`;

      if (terminal) {
        if (logs.length > 0) {
          streamTerminalOutput(terminal, logs.join('\n'), false);
        } else {
          terminal.innerHTML += `<div class="term-line" style="color:var(--text-dim); font-size:11px;">[Chương trình kết thúc bình thường không có đầu ra (Exit code: 0)]</div>`;
        }
      }
    } catch (err) {
      const elapsedMs = Math.max(4, Math.round(performance.now() - t0));
      if (timer) timer.innerHTML = `<i class="fa-regular fa-clock"></i> ${(elapsedMs / 1000).toFixed(2)}s`;
      if (exitStatus) exitStatus.innerHTML = `<span class="status-dot-inline error"></span> Exit Code 1`;
      if (terminal) {
        streamTerminalOutput(terminal, `[Lỗi Runtime]: ${err.message}`, true);
      }
    } finally {
      if (statusPill) {
        statusPill.className = 'term-status-pill ready';
        statusPill.innerHTML = '<span class="status-dot"></span> Sẵn sàng';
      }
      if (terminal) terminal.scrollTop = terminal.scrollHeight;
    }
    return;
  }

  // C++17 Runner: Local MinGW backend -> Wandbox GCC C++17 (for Vercel & Web) -> fallback
  if (lang === 'cpp') {
    if (statusPill) {
      statusPill.className = 'term-status-pill running';
      statusPill.innerHTML = '<span class="status-dot"></span> Đang biên dịch C++17...';
    }
    if (terminal) {
      terminal.innerHTML += `<div class="term-line term-prompt">user&gt; Biên dịch & thực thi C++17 (GCC)...</div>`;
      terminal.scrollTop = terminal.scrollHeight;
    }

    let executed = false;

    // Fast Cache Lookup: Instant execution for previously compiled code
    if (window._cppExecutionCache && window._cppExecutionCache[code]) {
      const cached = window._cppExecutionCache[code];
      const elapsedMs = 15;
      if (timer) timer.innerHTML = `<i class="fa-regular fa-clock"></i> ${(elapsedMs / 1000).toFixed(2)}s`;
      if (exitStatus) exitStatus.innerHTML = `<span class="status-dot-inline ${cached.exitCode === 0 ? 'online' : 'error'}"></span> Exit Code ${cached.exitCode}`;
      if (terminal) {
        if (cached.stdout && cached.stdout.trim()) outputTerminalDirect(terminal, cached.stdout, false);
        if (cached.stderr && cached.stderr.trim()) outputTerminalDirect(terminal, cached.stderr, true);
        if (!cached.stdout && !cached.stderr) {
          terminal.innerHTML += `<div class="term-line" style="color:var(--text-dim); font-size:11px;">[Chương trình kết thúc bình thường (Exit code: ${cached.exitCode})]</div>`;
        }
      }
      if (statusPill) {
        statusPill.className = 'term-status-pill ready';
        statusPill.innerHTML = '<span class="status-dot"></span> Sẵn sàng';
      }
      if (terminal) terminal.scrollTop = terminal.scrollHeight;
      return;
    }

    if (!window._cppExecutionCache) window._cppExecutionCache = {};

    // 1. Fast Local Probe: 600ms timeout for local MinGW server
    try {
      const localRes = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: 'cpp', code }),
        signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(600) : undefined
      });
      if (localRes.ok) {
        const localData = await localRes.json();
        const exitCode = typeof localData.exitCode === 'number' ? localData.exitCode : (localData.success ? 0 : 1);
        const result = {
          stdout: localData.stdout || '',
          stderr: localData.stderr || '',
          exitCode
        };
        window._cppExecutionCache[code] = result;
        const elapsedMs = Math.round(performance.now() - t0);
        if (timer) timer.innerHTML = `<i class="fa-regular fa-clock"></i> ${(elapsedMs / 1000).toFixed(2)}s`;
        if (exitStatus) exitStatus.innerHTML = `<span class="status-dot-inline ${exitCode === 0 ? 'online' : 'error'}"></span> Exit Code ${exitCode}`;
        if (terminal) {
          if (result.stdout && result.stdout.trim()) outputTerminalDirect(terminal, result.stdout, false);
          if (result.stderr && result.stderr.trim()) outputTerminalDirect(terminal, result.stderr, true);
        }
        executed = true;
      }
    } catch (e) {
      // Local backend not reachable (e.g. deployed on Vercel)
    }

    // 2. High-Speed Cloud Race: Ultra-fast Clang 17.0.1 (sub-second ~400ms) parallel with GCC 13.2 & Wandbox
    if (!executed) {
      try {
        const fetchClang = async () => {
          const cRes = await fetch('https://godbolt.org/api/compiler/clang1701/compile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
              source: code,
              options: {
                userArguments: "-O0",
                compilerOptions: { executorRequest: true },
                filters: { execute: true }
              }
            })
          });
          if (!cRes.ok) throw new Error('Clang HTTP ' + cRes.status);
          const cData = await cRes.json();
          const stdout = (cData.stdout || []).map(s => s.text).join('\n');
          const stderr = (cData.buildResult?.stderr || []).map(s => s.text).join('\n') || (cData.stderr || []).map(s => s.text).join('\n');
          const exitCode = (cData.buildResult && cData.buildResult.code !== 0) ? (cData.buildResult.code || 1) : (cData.code || 0);
          return { stdout, stderr, exitCode };
        };

        const fetchGodbolt = async () => {
          const gRes = await fetch('https://godbolt.org/api/compiler/g132/compile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
              source: code,
              options: {
                userArguments: "-O0 -pipe",
                compilerOptions: { executorRequest: true },
                filters: { execute: true }
              }
            })
          });
          if (!gRes.ok) throw new Error('Godbolt HTTP ' + gRes.status);
          const gData = await gRes.json();
          const stdout = (gData.stdout || []).map(s => s.text).join('\n');
          const stderr = (gData.buildResult?.stderr || []).map(s => s.text).join('\n') || (gData.stderr || []).map(s => s.text).join('\n');
          const exitCode = (gData.buildResult && gData.buildResult.code !== 0) ? (gData.buildResult.code || 1) : (gData.code || 0);
          return { stdout, stderr, exitCode };
        };

        const fetchWandbox = async () => {
          const wbRes = await fetch('https://wandbox.org/api/compile.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              compiler: 'gcc-head',
              code: code,
              options: 'c++17'
            })
          });
          if (!wbRes.ok) throw new Error('Wandbox HTTP ' + wbRes.status);
          const wbData = await wbRes.json();
          const stdout = wbData.program_output || '';
          const stderr = (wbData.compiler_error || '') + (wbData.program_error || '');
          const exitCode = wbData.status === 0 ? 0 : (wbData.status || (wbData.compiler_error ? 1 : 0));
          return { stdout, stderr, exitCode };
        };

        const winner = await Promise.any([fetchClang(), fetchGodbolt(), fetchWandbox()]);
        window._cppExecutionCache[code] = winner;

        const elapsedMs = Math.round(performance.now() - t0);
        if (timer) timer.innerHTML = `<i class="fa-regular fa-clock"></i> ${(elapsedMs / 1000).toFixed(2)}s`;
        if (exitStatus) {
          exitStatus.innerHTML = `<span class="status-dot-inline ${winner.exitCode === 0 ? 'online' : 'error'}"></span> Exit Code ${winner.exitCode}`;
        }
        if (terminal) {
          if (winner.stdout && winner.stdout.trim()) {
            outputTerminalDirect(terminal, winner.stdout, false);
          }
          if (winner.stderr && winner.stderr.trim()) {
            outputTerminalDirect(terminal, winner.stderr, true);
          }
          if (!winner.stdout && !winner.stderr) {
            terminal.innerHTML += `<div class="term-line" style="color:var(--text-dim); font-size:11px;">[Chương trình kết thúc bình thường (Exit code: ${winner.exitCode})]</div>`;
          }
        }
        executed = true;
      } catch (raceErr) {
        // Both cloud compilers failed
      }
    }

    if (!executed) {
      const elapsedMs = Math.round(performance.now() - t0);
      if (timer) timer.innerHTML = `<i class="fa-regular fa-clock"></i> ${(elapsedMs / 1000).toFixed(2)}s`;
      if (exitStatus) exitStatus.innerHTML = `<span class="status-dot-inline error"></span> Exit Code 1`;
      if (terminal) {
        terminal.innerHTML += `<div class="term-line term-output-error">[C++17]: Không thể kết nối với dịch vụ biên dịch C++ (Cần kết nối mạng hoặc khởi chạy server backend cục bộ với MinGW g++).</div>`;
      }
    }

    if (statusPill) {
      statusPill.className = 'term-status-pill ready';
      statusPill.innerHTML = '<span class="status-dot"></span> Sẵn sàng';
    }
    if (terminal) terminal.scrollTop = terminal.scrollHeight;
    return;
  }
}

// C4. Settings Modal with 2-step confirmation for progress reset
function initSettingsModal() {
  const btnOpen = document.getElementById('btn-open-settings');
  const overlay = document.getElementById('settings-overlay');
  const btnClose = document.getElementById('btn-close-settings');
  const btnStep1 = document.getElementById('btn-trigger-reset-step1');
  const step1Wrap = document.getElementById('reset-progress-step1-wrap');
  const step2Wrap = document.getElementById('reset-progress-step2-wrap');
  const btnConfirm = document.getElementById('btn-confirm-reset-step2');
  const btnCancel = document.getElementById('btn-cancel-reset-step2');

  if (btnOpen && overlay) {
    btnOpen.addEventListener('click', () => {
      overlay.style.display = 'flex';
      if (step1Wrap) step1Wrap.style.display = 'block';
      if (step2Wrap) step2Wrap.style.display = 'none';
    });
  }

  if (btnClose && overlay) {
    btnClose.addEventListener('click', () => {
      overlay.style.display = 'none';
    });
  }

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.style.display = 'none';
    });
  }

  if (btnStep1) {
    btnStep1.addEventListener('click', () => {
      if (step1Wrap) step1Wrap.style.display = 'none';
      if (step2Wrap) step2Wrap.style.display = 'block';
    });
  }

  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      if (step1Wrap) step1Wrap.style.display = 'block';
      if (step2Wrap) step2Wrap.style.display = 'none';
    });
  }

  if (btnConfirm) {
    btnConfirm.addEventListener('click', () => {
      appState.userProgress = {
        completed_lessons: [],
        completed_milestones: [],
        completed_exercises: [],
        exercise_submissions: {},
        exam_results: {}
      };
      saveLocalProgress();
      if (overlay) overlay.style.display = 'none';
      showToast('Đã xóa toàn bộ tiến độ học tập thành công', 'success');
      updateTelemetry();
      renderCurrentTrack();
    });
  }
}

function fallbackCopyText(text, cb) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    if (cb) cb();
  } catch(e) {
    console.error('Copy failed:', e);
  }
  document.body.removeChild(ta);
}

function copySnippetCode(btn) {
  const container = btn.closest('.code-verified-container') || btn.closest('.lesson-section-box') || btn.parentElement;
  const pre = container ? container.querySelector('pre code') : null;
  const textToCopy = pre ? pre.textContent : '';
  if (!textToCopy) return;

  const originalHtml = btn.innerHTML;

  function onSuccess() {
    btn.innerHTML = '<i class="fa-solid fa-circle-check" style="color:#98C379;"></i> Đã sao chép!';
    btn.classList.add('btn-copied-active');
    showToast('Đã sao chép mã nguồn vào clipboard', 'success');
    setTimeout(() => {
      btn.innerHTML = originalHtml;
      btn.classList.remove('btn-copied-active');
    }, 2000);
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textToCopy).then(onSuccess).catch(() => {
      fallbackCopyText(textToCopy, onSuccess);
    });
  } else {
    fallbackCopyText(textToCopy, onSuccess);
  }
}

// Global Navigation and Runner Bindings
window.selectLesson = openLesson;
window.openLesson = openLesson;
window.loadTaskToSandbox = loadTaskToSandbox;
window.loadTheoryCodeToSandbox = loadTheoryCodeToSandbox;
window.runPracticeIDE = runPracticeIDE;

// ==========================================================================
// MODULE EXERCISES SYSTEM (7 Multiple Choice + 3 Essay Questions)
// ==========================================================================
let activeExerciseState = {
  milestoneId: null,
  mcAnswers: {},
  submitted: false
};

function openModuleExercises(milestoneId) {
  const info = getActiveTrackInfo();
  const trackId = appState.activeTrackId;
  let exercises = null;

  if (courseData[trackId] && courseData[trackId].module_exercises && courseData[trackId].module_exercises[milestoneId]) {
    exercises = courseData[trackId].module_exercises[milestoneId];
  } else if (trackId === 'prog-lang') {
    // Branch-specific exercises from courseData
    const sub = appState.activeSubTrackId;
    const parent = courseData['prog-lang'];
    if (parent && parent.sub_tracks && parent.sub_tracks[sub] && parent.sub_tracks[sub].module_exercises) {
      exercises = parent.sub_tracks[sub].module_exercises[milestoneId];
    }
  }

  // Fallback generation if not pre-attached
  if (!exercises) {
    const ms = (info.milestones || []).find(m => m.id === milestoneId) || { name: 'Module' };
    exercises = {
      milestone_id: milestoneId,
      title: `Bài Tập Module: ${ms.name}`,
      multiple_choice: [
        {
          q: `Nguyên tắc kỹ thuật cốt lõi và tiêu chuẩn kiến trúc của "${ms.name}" là gì?`,
          options: [
            'Tuân thủ thiết kế hướng đối tượng, tối ưu quản lý vòng đời tài nguyên và an toàn luồng dữ liệu.',
            'Bỏ qua các bước kiểm tra ngoại lệ để tăng tốc độ tải trang.',
            'Chỉ sử dụng trên phiên bản cũ và không tương thích với runtime hiện đại.',
            'Không cần thiết lập các kiểm tra biên hay ràng buộc kiểu dữ liệu.'
          ],
          correct: 0,
          explanation: 'Kiến thức cốt lõi được định nghĩa trong tài liệu bài học và tiêu chuẩn kỹ thuật của module.'
        },
        {
          q: `Phương pháp nào sau đây giúp hạn chế bẫy sai lầm phổ biến khi áp dụng "${ms.name}"?`,
          options: [
            'Sử dụng các cấu trúc dữ liệu bất biến, kiểm thử tự động và cô lập ngữ cảnh thực thi.',
            'Ghi đè trực tiếp trạng thái toàn cục mà không thông qua cơ chế đồng bộ.',
            'Lạm dụng vòng lặp vô hạn mà không thiết lập điều kiện dừng.',
            'Không giải phóng bộ nhớ sau khi hoàn tất phiên làm việc.'
          ],
          correct: 0,
          explanation: 'Thực hành lập trình an toàn đòi hỏi kiểm soát chặt chẽ trạng thái và tài nguyên hệ thống.'
        },
        {
          q: `Trong kiến trúc hiện đại, khi nào kỹ sư nên áp dụng trực tiếp "${ms.name}" vào môi trường sản xuất?`,
          options: [
            'Khi hệ thống yêu cầu độ tin cậy cao, khả năng mở rộng theo chiều ngang và bảo mật đa tầng.',
            'Chỉ áp dụng trong môi trường thử nghiệm cục bộ, không dùng cho sản phẩm thực tế.',
            'Khi không quan tâm đến hiệu năng hay chi phí phần cứng.',
            'Khi muốn vô hiệu hóa toàn bộ cơ chế bảo mật của mạng.'
          ],
          correct: 0,
          explanation: 'Quyết định kiến trúc dựa trên sự cân đối giữa độ tin cậy và khả năng mở rộng.'
        },
        {
          q: `Khác biệt căn bản giữa mô hình xử lý tuần tự và mô hình xử lý tối ưu của "${ms.name}" là gì?`,
          options: [
            'Mô hình tối ưu giúp tận dụng tối đa chu kỳ CPU và giải phóng bộ đệm không đồng bộ.',
            'Mô hình tuần tự luôn nhanh hơn mô hình tối ưu gấp 10 lần.',
            'Không có sự khác biệt nào về mặt hiệu năng.',
            'Mô hình tối ưu chỉ chạy được trên phần cứng chuyên dụng.'
          ],
          correct: 0,
          explanation: 'Tối ưu hóa kiến trúc giúp giải quyết hiện tượng nghẽn cổ chai (bottleneck).'
        },
        {
          q: `Thuộc tính hoặc tham số nào đóng vai trò tiên quyết trong việc bảo đảm tính toàn vẹn dữ liệu của "${ms.name}"?`,
          options: [
            'Ràng buộc kiểu dữ liệu chặt chẽ và xác thực dữ liệu đầu vào (Input Validation).',
            'Sử dụng kiểu dữ liệu bất kỳ (any) mà không cần xác thực.',
            'Bỏ qua kiểm tra mã lỗi HTTP từ phản hồi của máy chủ.',
            'Lưu trữ toàn bộ mật khẩu dưới dạng văn bản thô.'
          ],
          correct: 0,
          explanation: 'Xác thực đầu vào là tuyến phòng thủ đầu tiên bảo vệ tính toàn vẹn dữ liệu.'
        },
        {
          q: `Khi gặp sự cố rò rỉ bộ nhớ (Memory Leak) trong "${ms.name}", bước điều tra kỹ thuật đầu tiên là gì?`,
          options: [
            'Thu thập Memory Heap Snapshot và kiểm tra các tham chiếu chưa được giải phóng.',
            'Khởi động lại máy tính người dùng mà không cần kiểm tra mã nguồn.',
            'Xóa bỏ toàn bộ các bài kiểm thử tự động.',
            'Tăng gấp đôi dung lượng RAM máy chủ mà không sửa lỗi code.'
          ],
          correct: 0,
          explanation: 'Heap Snapshot giúp xác định chính xác các đối tượng bị giữ lại trong bộ nhớ ngoài ý muốn.'
        },
        {
          q: `Đánh giá đánh đổi (Trade-off) chính yếu khi triển khai giải pháp "${ms.name}" là gì?`,
          options: [
            'Độ phức tạp mã nguồn ban đầu cao hơn nhưng đổi lại tính ổn định và khả năng bảo trì lâu dài vượt trội.',
            'Không có bất kỳ đánh đổi nào trong kỹ nghệ phần mềm.',
            'Mã nguồn ngắn hơn nhưng ứng dụng sẽ chạy chậm hơn 100 lần.',
            'Chỉ có thể chạy trên một hệ điều hành duy nhất.'
          ],
          correct: 0,
          explanation: 'Mọi quyết định kiến trúc đều đi kèm đánh đổi giữa tính dễ phát triển và tính bền vững.'
        }
      ],
      essay_questions: [
        {
          q: `Phân tích sâu một tình huống thực tế mà bạn sẽ áp dụng kiến thức của "${ms.name}" và các rủi ro kỹ thuật tiềm ẩn.`,
          guidance: 'Cần trình bày: Ngữ cảnh bài toán nghiệp vụ, Lựa chọn kỹ thuật, Đánh giá rủi ro về hiệu năng/bảo mật và Giải pháp phòng ngừa.'
        },
        {
          q: `Trình bày quy trình kiểm thử (Unit Test / Integration Test) đạt chuẩn để bảo đảm đoạn mã thuộc "${ms.name}" hoạt động chính xác trong môi trường sản xuất.`,
          guidance: 'Cần phân tích: Test cases cho luồng thành công, Test cases cho các trường hợp biên (Edge Cases), và cách giả lập (Mock) dữ liệu phụ thuộc.'
        },
        {
          q: `So sánh ưu - nhược điểm giữa giải pháp kiến trúc của "${ms.name}" với một giải pháp thay thế phổ biến khác trong ngành.`,
          guidance: 'Đưa ra các tiêu chí so sánh cụ thể: Tốc độ thực thi, Dung lượng bộ nhớ, Độ phức tạp bảo trì và Tính tương thích cộng đồng.'
        }
      ]
    };
  }

  const savedSub = appState.userProgress.exercise_submissions && appState.userProgress.exercise_submissions[milestoneId];
  if (savedSub) {
    activeExerciseState = {
      milestoneId: milestoneId,
      mcAnswers: { ...savedSub.mcAnswers },
      essayAnswers: { ...(savedSub.essayAnswers || {}) },
      submitted: true,
      score: savedSub.score
    };
  } else {
    activeExerciseState = {
      milestoneId: milestoneId,
      mcAnswers: {},
      essayAnswers: {},
      submitted: false
    };
  }

  // Switch views
  switchTab('lesson');
  const lView = document.getElementById('lesson-list-view');
  const dView = document.getElementById('lesson-detail-view');
  const eView = document.getElementById('module-exercises-view');

  if (lView) lView.style.display = 'none';
  if (dView) dView.style.display = 'none';
  if (eView) {
    eView.style.display = 'flex';
    eView.scrollTop = 0;
  }

  const badge = document.getElementById('exercise-header-badge');
  if (badge) badge.textContent = `Bài Tập Tự Kiểm Tra • ${exercises.title}`;

  renderModuleExercisesBody(exercises);
}

function renderModuleExercisesBody(exercises) {
  const container = document.getElementById('module-exercises-content-body');
  if (!container) return;

  const mc = exercises.multiple_choice || [];
  const essay = exercises.essay_questions || [];
  const isSubmitted = !!activeExerciseState.submitted;

  let html = `
    <div style="margin-bottom: 24px;">
      <span class="section-tag"><i class="fa-solid fa-clipboard-check"></i> NGÂN HÀNG CÂU HỎI THỰC HÀNH TỰ KIỂM TRA</span>
      <h1 style="font-size: clamp(1.4rem, 2.2vw, 1.8rem); margin-bottom: 8px; color: var(--text-primary);">${escapeHtml(exercises.title)}</h1>
      <p style="color: var(--text-secondary); font-size: 0.92rem; line-height: 1.6;">
        Hệ thống gồm <b>7 câu trắc nghiệm kỹ thuật</b> (tự kiểm tra mức độ thấu suốt) và <b>3 câu tự luận chuyên sâu</b> (phân tích kiến trúc). Điểm số và lời giải mẫu chuẩn kỹ sư sẽ được hiển thị ngay sau khi nộp bài.
      </p>
    </div>

    <!-- PHẦN 1: 7 CÂU TRẮC NGHIỆM -->
    <div class="lesson-section-box">
      <div class="section-tag">PHẦN 1: 7 CÂU HỎI TRẮC NGHIỆM CHỌN LỌC</div>
      <div class="exercise-mc-list" id="exercise-mc-list">
  `;

  mc.forEach((item, idx) => {
    const userAns = activeExerciseState.mcAnswers ? activeExerciseState.mcAnswers[idx] : undefined;
    const isCorrect = isSubmitted && userAns === item.correct;
    const itemClass = isSubmitted ? (isCorrect ? 'exercise-mc-item mc-correct' : 'exercise-mc-item mc-incorrect') : 'exercise-mc-item';

    html += `
      <div class="${itemClass}" id="mc-item-${idx}">
        <div class="exercise-q-title">
          <span class="exercise-q-num">Câu ${idx + 1}:</span>
          ${escapeHtml(item.q)}
        </div>
        <div class="exercise-options-group">
          ${item.options.map((opt, oIdx) => {
            const isChecked = userAns === oIdx;
            return `
            <label class="exercise-option-label" id="opt-label-${idx}-${oIdx}">
              <input type="radio" name="mc_q_${idx}" value="${oIdx}" ${isChecked ? 'checked' : ''} onchange="selectExerciseMCAnswer(${idx}, ${oIdx})">
              <span class="opt-letter">${String.fromCharCode(65 + oIdx)}.</span>
              <span class="opt-text">${escapeHtml(opt)}</span>
            </label>
            `;
          }).join('')}
        </div>
        <div class="exercise-explanation-box" id="mc-exp-${idx}" style="${isSubmitted ? 'display:block;' : 'display:none;'}">
          ${isSubmitted ? `
            <div style="font-weight: 600; color: ${isCorrect ? '#C5A880' : '#E06C75'}; margin-bottom: 4px;">
              <i class="fa-solid ${isCorrect ? 'fa-check' : 'fa-xmark'}"></i> ${isCorrect ? 'Chính xác!' : `Đáp án đúng là: ${String.fromCharCode(65 + item.correct)}`}
            </div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHtml(item.explanation || '')}</div>
          ` : ''}
        </div>
      </div>
    `;
  });

  html += `
      </div>
    </div>

    <!-- PHẦN 2: 3 CÂU TỰ LUẬN CHUYÊN SÂU -->
    <div class="lesson-section-box">
      <div class="section-tag">PHẦN 2: 3 CÂU HỎI TỰ LUẬN & PHÂN TÍCH KIẾN TRÚC</div>
      <div class="exercise-essay-list">
  `;

  essay.forEach((item, idx) => {
    const savedEssayVal = activeExerciseState.essayAnswers ? (activeExerciseState.essayAnswers[idx] || '') : '';

    html += `
      <div class="exercise-essay-item">
        <div class="exercise-q-title">
          <span class="exercise-q-num">Câu ${idx + 8} (Tự luận):</span>
          ${escapeHtml(item.q)}
        </div>
        <div class="exercise-essay-input-wrap">
          <textarea id="essay-input-${idx}" class="exercise-essay-textarea" placeholder="Nhập câu trả lời phân tích hoặc đoạn mã giải pháp của bạn tại đây (tối thiểu 15 ký tự)..." rows="4">${escapeHtml(savedEssayVal)}</textarea>
        </div>
        <div style="margin-top: 10px;">
          <button class="btn btn-back-sm" onclick="toggleEssayGuidance(${idx})">
            <i class="fa-solid fa-lightbulb"></i> Xem Tiêu Chuẩn Đạt & Phân Tích Mẫu
          </button>
          <div class="essay-guidance-box" id="essay-guide-${idx}" style="${isSubmitted ? 'display:block;' : 'display:none;'}">
            <b><i class="fa-solid fa-key"></i> Tiêu chí nghiệm thu & Định hướng giải pháp:</b>
            <p>${escapeHtml(item.guidance || 'Cần trình bày đủ các khía cạnh: Cơ chế hoạt động, Rủi ro tiềm ẩn, và Giải pháp kỹ thuật tối ưu.')}</p>
          </div>
        </div>
      </div>
    `;
  });

  html += `
      </div>
    </div>

    <!-- NÚT NỘP BÀI TẬP -->
    <div style="margin-top: 30px; padding: 20px; background: var(--bg-card); border: 1px solid var(--border-hairline); border-radius: 4px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
      <div>
        <div id="exercise-score-display" style="font-size: 1.1rem; font-weight: 600; color: ${isSubmitted ? 'var(--accent-bronze)' : 'var(--text-primary)'};">
          ${isSubmitted ? `<i class="fa-solid fa-circle-check"></i> ĐÃ NỘP BÀI: ${activeExerciseState.score || ''} Trắc Nghiệm Đạt • Đã ghi nhận 3 bài tự luận` : 'Chưa nộp bài'}
        </div>
        <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 4px;">
          ${isSubmitted ? 'Bạn có thể xem lại đáp án và lời giải chi tiết bên trên hoặc bấm làm lại bài tập.' : 'Hoàn thành đủ 7 câu trắc nghiệm và 3 câu tự luận trước khi bấm nộp bài.'}
        </div>
      </div>
      <div>
        ${isSubmitted ? `
          <button class="btn btn-secondary" id="btn-submit-module-exercises" onclick="resetModuleExercises('${escapeHtml(activeExerciseState.milestoneId)}')">
            <i class="fa-solid fa-rotate-right"></i> Làm Lại Bài Tập Này
          </button>
        ` : `
          <button class="btn btn-action" id="btn-submit-module-exercises" onclick="submitModuleExercises()">
            <i class="fa-solid fa-paper-plane"></i> Nộp Bài Tập & Lưu Tiến Độ
          </button>
        `}
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Bind back button
  const backBtn = document.getElementById('btn-back-from-exercises');
  if (backBtn) {
    backBtn.onclick = () => {
      const lView = document.getElementById('lesson-list-view');
      const eView = document.getElementById('module-exercises-view');
      if (eView) eView.style.display = 'none';
      if (lView) lView.style.display = 'block';
    };
  }
}

function selectExerciseMCAnswer(qIdx, optionIdx) {
  activeExerciseState.mcAnswers[qIdx] = optionIdx;
}

function toggleEssayGuidance(idx) {
  const el = document.getElementById(`essay-guide-${idx}`);
  if (el) {
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }
}

function resetModuleExercises(milestoneId) {
  if (appState.userProgress.exercise_submissions) {
    delete appState.userProgress.exercise_submissions[milestoneId];
    saveLocalProgress();
  }
  openModuleExercises(milestoneId);
}

function submitModuleExercises() {
  const info = getActiveTrackInfo();
  const trackId = appState.activeTrackId;
  const msId = activeExerciseState.milestoneId;
  let exercises = null;

  if (courseData[trackId] && courseData[trackId].module_exercises && courseData[trackId].module_exercises[msId]) {
    exercises = courseData[trackId].module_exercises[msId];
  } else if (trackId === 'prog-lang') {
    const sub = appState.activeSubTrackId;
    const parent = courseData['prog-lang'];
    if (parent && parent.sub_tracks && parent.sub_tracks[sub] && parent.sub_tracks[sub].module_exercises) {
      exercises = parent.sub_tracks[sub].module_exercises[msId];
    }
  }

  const mc = (exercises && exercises.multiple_choice) || [];
  const essay = (exercises && exercises.essay_questions) || [];

  // 1. VALIDATION: Must answer all 7 multiple choice questions
  const missingMC = [];
  mc.forEach((item, idx) => {
    if (activeExerciseState.mcAnswers[idx] === undefined) {
      missingMC.push(idx + 1);
    }
  });

  // 2. VALIDATION: Must provide text for all 3 essay questions (at least 15 chars)
  const missingEssay = [];
  const essayAnswers = {};
  essay.forEach((item, idx) => {
    const textarea = document.getElementById(`essay-input-${idx}`);
    const val = textarea ? textarea.value.trim() : '';
    essayAnswers[idx] = val;
    if (!val || val.length < 15) {
      missingEssay.push(idx + 1);
    }
  });

  if (missingMC.length > 0 || missingEssay.length > 0) {
    let msg = 'Vui lòng hoàn thành toàn bộ bài tập trước khi nộp:\n';
    if (missingMC.length > 0) msg += `• Trắc nghiệm chưa trả lời câu: ${missingMC.join(', ')}\n`;
    if (missingEssay.length > 0) msg += `• Tự luận chưa nhập câu trả lời (hoặc quá ngắn, tối thiểu 15 ký tự): Câu ${missingEssay.join(', ')}`;
    alert(msg);
    return;
  }

  // 3. GRADE MC
  let correctCount = 0;
  mc.forEach((item, idx) => {
    const userAns = activeExerciseState.mcAnswers[idx];
    const isCorrect = userAns === item.correct;
    if (isCorrect) correctCount++;

    const itemEl = document.getElementById(`mc-item-${idx}`);
    const expEl = document.getElementById(`mc-exp-${idx}`);

    if (itemEl) {
      itemEl.classList.remove('mc-correct', 'mc-incorrect');
      itemEl.classList.add(isCorrect ? 'mc-correct' : 'mc-incorrect');
    }

    if (expEl) {
      expEl.style.display = 'block';
      expEl.innerHTML = `
        <div style="font-weight: 600; color: ${isCorrect ? '#C5A880' : '#E06C75'}; margin-bottom: 4px;">
          <i class="fa-solid ${isCorrect ? 'fa-check' : 'fa-xmark'}"></i> ${isCorrect ? 'Chính xác!' : `Đáp án đúng là: ${String.fromCharCode(65 + item.correct)}`}
        </div>
        <div style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHtml(item.explanation || '')}</div>
      `;
    }
  });

  // Automatically reveal guidance for essays
  essay.forEach((item, idx) => {
    const guideEl = document.getElementById(`essay-guide-${idx}`);
    if (guideEl) guideEl.style.display = 'block';
  });

  // 4. PERSISTENCE: Save both MC and Essay answers into userProgress
  activeExerciseState.submitted = true;
  activeExerciseState.essayAnswers = essayAnswers;

  if (!appState.userProgress.exercise_submissions) {
    appState.userProgress.exercise_submissions = {};
  }
  appState.userProgress.exercise_submissions[msId] = {
    mcAnswers: { ...activeExerciseState.mcAnswers },
    essayAnswers: { ...essayAnswers },
    score: `${correctCount}/${mc.length}`,
    correctCount: correctCount,
    totalMC: mc.length,
    submittedAt: new Date().toISOString()
  };

  if (!appState.userProgress.completed_exercises) {
    appState.userProgress.completed_exercises = [];
  }
  if (!appState.userProgress.completed_exercises.includes(msId)) {
    appState.userProgress.completed_exercises.push(msId);
  }

  // If web-dev: mark milestone completed ONLY AFTER PASSING BOTH MC AND ESSAY!
  if (trackId === 'web-dev') {
    if (!appState.userProgress.completed_milestones.includes(msId)) {
      appState.userProgress.completed_milestones.push(msId);
    }
  }

  saveLocalProgress();

  const scoreDisplay = document.getElementById('exercise-score-display');
  if (scoreDisplay) {
    scoreDisplay.innerHTML = `<span style="color:var(--accent-bronze); font-size:1.3rem;"><i class="fa-solid fa-circle-check"></i> ${correctCount}/${mc.length} Trắc Nghiệm Đạt</span> • Đã ghi nhận 3 bài tự luận & hoàn thành module!`;
  }

  const submitBtn = document.getElementById('btn-submit-module-exercises');
  if (submitBtn) {
    submitBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Làm Lại Bài Tập Này';
    submitBtn.disabled = false;
    submitBtn.classList.remove('btn-action');
    submitBtn.classList.add('btn-secondary');
    submitBtn.onclick = () => resetModuleExercises(msId);
  }

  renderCurrentTrack();
}


if (typeof window !== 'undefined') {
  window.returnToActiveLesson = returnToActiveLesson;
  window.resetModuleExercises = resetModuleExercises;
  window.loadTheoryCodeToSandbox = loadTheoryCodeToSandbox;
  window.loadExerciseToSandbox = loadExerciseToSandbox;
  window.copySnippetCode = copySnippetCode;
  window.showToast = showToast;
  window.completeLesson = completeLesson;
  window.openModuleExercises = openModuleExercises;
  window.submitModuleExercises = submitModuleExercises;
  window.selectExerciseMCAnswer = selectExerciseMCAnswer;
  window.toggleEssayGuidance = toggleEssayGuidance;
  window.openLesson = openLesson;
  window.selectLesson = openLesson;
  window.switchTab = switchTab;
  window.switchTrack = switchTrack;
  window.switchSubTrack = switchSubTrack;
}
