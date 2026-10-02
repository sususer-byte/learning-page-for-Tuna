/* ============================================================
   HOMEPAGE.JS — Vanilla JS (Không thư viện ngoài)
   Hiệu ứng & Tương tác theo mục 17, 21 của brief
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     1. DARK / LIGHT MODE TOGGLE (mục 5)
     Persist qua localStorage
     ============================================================ */
  const themeToggle = document.getElementById('theme-toggle');
  const toggleIcon = document.getElementById('toggle-icon');
  const html = document.documentElement;

  // Load saved theme
  const savedTheme = localStorage.getItem('dev-academy-theme');
  if (savedTheme) {
    html.setAttribute('data-theme', savedTheme);
    updateToggleIcon(savedTheme);
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      const current = html.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('dev-academy-theme', next);
      updateToggleIcon(next);
    });
  }

  function updateToggleIcon(theme) {
    if (toggleIcon) {
      toggleIcon.textContent = theme === 'dark' ? '☾' : '☀';
    }
  }

  /* ============================================================
     2. MOBILE MENU TOGGLE
     ============================================================ */
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mainNav = document.getElementById('main-nav');

  if (mobileMenuBtn && mainNav) {
    mobileMenuBtn.addEventListener('click', function () {
      mainNav.classList.toggle('mobile-open');
      this.textContent = mainNav.classList.contains('mobile-open') ? '✕' : '☰';
    });

    // Close menu on nav link click
    mainNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mainNav.classList.remove('mobile-open');
        mobileMenuBtn.textContent = '☰';
      });
    });
  }

  /* ============================================================
     3. HERO SECTION — MACOS TERMINAL C++ CONTINUOUS LIVE ENGINE
     Hiệu ứng đánh máy code C++ liên tục xoay vòng, không bao giờ đứng yên
     ============================================================ */
  const heroTerminalBody = document.getElementById('hero-terminal-body');
  const heroTerminalContainer = document.getElementById('hero-terminal-container');
  const tabButtons = document.querySelectorAll('.terminal-tab-btn');

  const terminalSnippets = [
    {
      fileName: 'main.cpp',
      tabIndex: 0,
      lines: [
        { type: 'comment', text: '// DEV ACADEMY v4.0 — C++ Architecture Masterclass' },
        { type: 'preprocessor', text: '#include <iostream>' },
        { type: 'preprocessor', text: '#include <vector>' },
        { type: 'preprocessor', text: '#include <memory>' },
        { type: 'blank', text: '' },
        { type: 'class-head', text: 'class SoftwareArchitect {' },
        { type: 'keyword', text: 'public:' },
        { type: 'method', text: '  void buildFuture() {' },
        { type: 'cout', text: '    std::cout << ">> DEV ACADEMY: Kỹ Nghệ Lập Trình Thực Chiến.\\n";' },
        { type: 'cout', text: '    std::cout << "[+] Khởi động Client-Side Offline First Engine...\\n";' },
        { type: 'cout', text: '    std::cout << "[+] Lộ trình chuẩn: Foundation → Proficiency.\\n";' },
        { type: 'brace', text: '  }' },
        { type: 'brace', text: '};' },
        { type: 'blank', text: '' },
        { type: 'main', text: 'int main() {' },
        { type: 'inst', text: '  SoftwareArchitect engineer;' },
        { type: 'call', text: '  engineer.buildFuture();' },
        { type: 'ret', text: '  return 0;' },
        { type: 'brace', text: '}' }
      ],
      runCommand: 'g++ -std=c++20 -O3 -Wall main.cpp -o main && ./main',
      runOutput: [
        '>> DEV ACADEMY: Kỹ Nghệ Lập Trình Thực Chiến.',
        '[+] Khởi động Client-Side Offline First Engine...',
        '[+] Lộ trình chuẩn: Foundation → Proficiency.',
        '[OK] Quá trình thực thi hoàn tất trong 0.012s.'
      ]
    },
    {
      fileName: 'socket_reactor.cpp',
      tabIndex: 1,
      lines: [
        { type: 'comment', text: '// DEV ACADEMY — Low-Latency Network Reactor' },
        { type: 'preprocessor', text: '#include <iostream>' },
        { type: 'preprocessor', text: '#include <sys/socket.h>' },
        { type: 'preprocessor', text: '#include <unistd.h>' },
        { type: 'blank', text: '' },
        { type: 'class-head', text: 'class SocketReactor {' },
        { type: 'keyword', text: 'public:' },
        { type: 'method', text: '  void listenPort(int port) {' },
        { type: 'cout', text: '    std::cout << ">> [REACTOR] Non-blocking Epoll listening port: " << port << "\\n";' },
        { type: 'cout', text: '    std::cout << "[+] Throughput: 1,250,000 req/s | Latency: 1.8us\\n";' },
        { type: 'brace', text: '  }' },
        { type: 'brace', text: '};' },
        { type: 'blank', text: '' },
        { type: 'main', text: 'int main() {' },
        { type: 'inst', text: '  SocketReactor server;' },
        { type: 'call', text: '  server.listenPort(8080);' },
        { type: 'ret', text: '  return 0;' },
        { type: 'brace', text: '}' }
      ],
      runCommand: 'clang++ -std=c++20 socket_reactor.cpp -o reactor && ./reactor',
      runOutput: [
        '>> [REACTOR] Non-blocking Epoll listening port: 8080',
        '[+] Throughput: 1,250,000 req/s | Latency: 1.8us',
        '[OK] Server socket daemonized successfully.'
      ]
    },
    {
      fileName: 'physics_engine.cpp',
      tabIndex: 2,
      lines: [
        { type: 'comment', text: '// DEV ACADEMY — 2D Pixel Physics Simulation' },
        { type: 'preprocessor', text: '#include <iostream>' },
        { type: 'preprocessor', text: '#include <vector>' },
        { type: 'blank', text: '' },
        { type: 'class-head', text: 'struct RigidBody2D {' },
        { type: 'keyword', text: 'public:' },
        { type: 'inst', text: '  float posX = 120.0f, posY = 85.0f;' },
        { type: 'method', text: '  void simulate(float dt) {' },
        { type: 'cout', text: '    std::cout << ">> [PHYSICS] BVH Tree Collisions Resolved: 0 overhead.\\n";' },
        { type: 'cout', text: '    std::cout << "[+] Locked 60 FPS | AABB Narrowphase Collision OK.\\n";' },
        { type: 'brace', text: '  }' },
        { type: 'brace', text: '};' },
        { type: 'blank', text: '' },
        { type: 'main', text: 'int main() {' },
        { type: 'inst', text: '  RigidBody2D player;' },
        { type: 'call', text: '  player.simulate(0.016f);' },
        { type: 'ret', text: '  return 0;' },
        { type: 'brace', text: '}' }
      ],
      runCommand: 'g++ -std=c++20 -O2 physics_engine.cpp -o physics && ./physics',
      runOutput: [
        '>> [PHYSICS] BVH Tree Collisions Resolved: 0 overhead.',
        '[+] Locked 60 FPS | AABB Narrowphase Collision OK.',
        '[OK] Engine simulation cycle terminated cleanly.'
      ]
    }
  ];

  let currentSnippetIdx = 0;
  let typingTimeoutId = null;
  let isTerminalRunning = false;

  function setTerminalActiveTab(idx) {
    if (!tabButtons || tabButtons.length === 0) return;
    tabButtons.forEach(btn => {
      const sIdx = parseInt(btn.getAttribute('data-snippet'), 10);
      if (sIdx === idx) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function runLiveTerminalSimulation(targetSnippetIdx) {
    if (!heroTerminalBody) return;
    if (typingTimeoutId) clearTimeout(typingTimeoutId);
    isTerminalRunning = true;

    if (typeof targetSnippetIdx === 'number') {
      currentSnippetIdx = targetSnippetIdx % terminalSnippets.length;
    }

    setTerminalActiveTab(currentSnippetIdx);
    const snippet = terminalSnippets[currentSnippetIdx];
    const scriptLines = snippet.lines;

    heroTerminalBody.innerHTML = '';
    const codeContainer = document.createElement('div');
    codeContainer.className = 'terminal-code-stream';
    heroTerminalBody.appendChild(codeContainer);

    let lineIdx = 0;
    let charIdx = 0;
    let currentLineEl = null;

    function typeNextChar() {
      if (!isTerminalRunning) return;

      if (lineIdx >= scriptLines.length) {
        // Complete code typing -> show compile & run output
        showExecutionOutput(snippet);
        return;
      }

      const item = scriptLines[lineIdx];

      if (item.type === 'blank') {
        const blank = document.createElement('div');
        blank.className = 'code-line';
        blank.innerHTML = '&nbsp;';
        codeContainer.appendChild(blank);
        lineIdx++;
        charIdx = 0;
        currentLineEl = null;
        typingTimeoutId = setTimeout(typeNextChar, 40);
        return;
      }

      if (!currentLineEl) {
        currentLineEl = document.createElement('div');
        currentLineEl.className = 'code-line';
        codeContainer.appendChild(currentLineEl);
      }

      const fullText = item.text;
      if (charIdx < fullText.length) {
        const substr = fullText.substring(0, charIdx + 1);
        currentLineEl.innerHTML = syntaxHighlightCpp(substr, item.type) + '<span class="terminal-cursor"></span>';
        charIdx++;
        heroTerminalBody.scrollTop = heroTerminalBody.scrollHeight;
        const speed = Math.floor(Math.random() * 12) + 14;
        typingTimeoutId = setTimeout(typeNextChar, speed);
      } else {
        currentLineEl.innerHTML = syntaxHighlightCpp(fullText, item.type);
        lineIdx++;
        charIdx = 0;
        currentLineEl = null;
        typingTimeoutId = setTimeout(typeNextChar, 45);
      }
    }

    function showExecutionOutput(currentSnippet) {
      const promptBox = document.createElement('div');
      promptBox.className = 'terminal-run-prompt';
      promptBox.innerHTML = '<span class="prompt-user">dev-academy@macos</span>:<span class="prompt-dir">~/curriculum</span>$ <span class="c-func">' + escapeHtml(currentSnippet.runCommand) + '</span>';
      codeContainer.appendChild(promptBox);

      const outputBox = document.createElement('div');
      outputBox.className = 'terminal-run-output';
      codeContainer.appendChild(outputBox);
      heroTerminalBody.scrollTop = heroTerminalBody.scrollHeight;

      let outIdx = 0;
      function stepOutput() {
        if (!isTerminalRunning) return;
        if (outIdx < currentSnippet.runOutput.length) {
          const outLine = document.createElement('div');
          outLine.style.color = outIdx === currentSnippet.runOutput.length - 1 ? '#98C379' : '#C5A880';
          outLine.innerHTML = escapeHtml(currentSnippet.runOutput[outIdx]);
          outputBox.appendChild(outLine);
          heroTerminalBody.scrollTop = heroTerminalBody.scrollHeight;
          outIdx++;
          typingTimeoutId = setTimeout(stepOutput, 180);
        } else {
          // Finished output -> hold for 3.5s then loop to next snippet
          const endCursor = document.createElement('span');
          endCursor.className = 'terminal-cursor';
          outputBox.appendChild(endCursor);
          heroTerminalBody.scrollTop = heroTerminalBody.scrollHeight;

          typingTimeoutId = setTimeout(function () {
            currentSnippetIdx = (currentSnippetIdx + 1) % terminalSnippets.length;
            runLiveTerminalSimulation();
          }, 3500);
        }
      }

      typingTimeoutId = setTimeout(stepOutput, 300);
    }

    typeNextChar();
  }

  function syntaxHighlightCpp(text, type) {
    if (type === 'comment') return '<span class="c-comment">' + escapeHtml(text) + '</span>';
    if (type === 'preprocessor') {
      return text.replace(/(#include)\s*(<[^>]+>)/, '<span class="c-preprocessor">$1</span> <span class="c-string">$2</span>');
    }
    if (type === 'class-head') {
      return text.replace(/(class|struct)\s+([A-Za-z0-9_]+)/, '<span class="c-keyword">$1</span> <span class="c-type">$2</span>');
    }
    if (type === 'keyword') return '<span class="c-keyword">' + escapeHtml(text) + '</span>';
    if (type === 'method') {
      return text.replace(/(void)\s+([A-Za-z0-9_]+)/, '<span class="c-type">$1</span> <span class="c-func">$2</span>');
    }
    if (type === 'cout') {
      return text.replace(/(std::cout)\s*(<<)\s*("[^"]*")/, '<span class="c-type">$1</span> &lt;&lt; <span class="c-string">$3</span>');
    }
    if (type === 'main') {
      return text.replace(/(int)\s+(main)/, '<span class="c-type">$1</span> <span class="c-func">$2</span>');
    }
    if (type === 'inst') {
      return text.replace(/(SoftwareArchitect|SocketReactor|RigidBody2D|float)\s+([A-Za-z0-9_]+)/, '<span class="c-type">$1</span> $2');
    }
    if (type === 'call') {
      return text.replace(/([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)/, '$1.<span class="c-func">$2</span>');
    }
    if (type === 'ret') {
      return text.replace(/(return)\s+([0-9]+)/, '<span class="c-keyword">$1</span> <span class="c-number">$2</span>');
    }
    return escapeHtml(text);
  }

  // Bind Tab Click Listeners
  if (tabButtons && tabButtons.length > 0) {
    tabButtons.forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const sIdx = parseInt(this.getAttribute('data-snippet'), 10);
        runLiveTerminalSimulation(sIdx);
      });
    });
  }

  // Click on terminal window advances immediately to next snippet
  if (heroTerminalContainer) {
    heroTerminalContainer.style.cursor = 'pointer';
    heroTerminalContainer.title = 'Bấm vào để chuyển ngay sang đoạn code tiếp theo';
    heroTerminalContainer.addEventListener('click', function (e) {
      if (e.target.closest('.terminal-tab-btn')) return;
      currentSnippetIdx = (currentSnippetIdx + 1) % terminalSnippets.length;
      runLiveTerminalSimulation(currentSnippetIdx);
    });
  }

  // Start live terminal simulation on page load
  if (heroTerminalBody) {
    setTimeout(function () {
      runLiveTerminalSimulation(0);
    }, 350);
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /* ============================================================
     4. FAQ ACCORDION (mục 14)
     Toggle class + CSS transition height
     ============================================================ */
  var faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(function (item) {
    var btn = item.querySelector('.faq-question');
    if (btn) {
      btn.addEventListener('click', function () {
        var isActive = item.classList.contains('active');

        // Close all others (optional — single-open accordion)
        faqItems.forEach(function (other) {
          other.classList.remove('active');
          var otherBtn = other.querySelector('.faq-question');
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        });

        // Toggle current
        if (!isActive) {
          item.classList.add('active');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    }
  });

  /* ============================================================
     5. MAGNETIC BUTTON — Desktop Only (mục 13, 21)
     Chỉ bind trên desktop (pointer: fine media query)
     Tắt trên touch device
     ============================================================ */
  var magneticWrap = document.getElementById('magnetic-wrap');
  var magneticBtn = document.getElementById('btn-magnetic');

  if (magneticWrap && magneticBtn) {
    // Only enable on devices with fine pointer (mouse/trackpad)
    var hasFinePointer = window.matchMedia('(pointer: fine)').matches;

    if (hasFinePointer) {
      magneticWrap.addEventListener('mousemove', function (e) {
        var rect = magneticWrap.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;

        // Magnetic pull — limited range
        var pullStrength = 0.3;
        var maxPull = 20;
        var moveX = Math.max(-maxPull, Math.min(maxPull, x * pullStrength));
        var moveY = Math.max(-maxPull, Math.min(maxPull, y * pullStrength));

        magneticBtn.style.transform = 'translate(' + moveX + 'px, ' + moveY + 'px)';
      });

      magneticWrap.addEventListener('mouseleave', function () {
        magneticBtn.style.transform = 'translate(0, 0)';
      });
    }
  }

  /* ============================================================
     6. HORIZONTAL SCROLL — USP Section Desktop (mục 11, 16)
     Desktop: mouse wheel → horizontal scroll
     Mobile: native swipe (no JS needed — handled by CSS overflow-x)
     ============================================================ */
  var uspScroll = document.getElementById('usp-scroll');

  if (uspScroll) {
    var isDesktop = window.matchMedia('(min-width: 1024px)').matches;

    if (isDesktop) {
      uspScroll.addEventListener('wheel', function (e) {
        // Only hijack if there's horizontal content to scroll
        var maxScroll = uspScroll.scrollWidth - uspScroll.clientWidth;
        if (maxScroll <= 0) return;

        // Prevent vertical scroll, do horizontal instead
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          uspScroll.scrollLeft += e.deltaY;
        }
      }, { passive: false });
    }
  }

  /* ============================================================
     7. SMOOTH SCROLL — Nav Links (mục 17)
     scrollIntoView for anchor links
     ============================================================ */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var targetId = this.getAttribute('href');
      if (targetId === '#') return;

      var target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ============================================================
     8. HEADER SCROLL EFFECT
     Add subtle border on scroll
     ============================================================ */
  var header = document.getElementById('site-header');

  if (header) {
    var scrollThreshold = 50;

    window.addEventListener('scroll', function () {
      if (window.scrollY > scrollThreshold) {
        header.style.borderBottomColor = 'var(--border-hover)';
      } else {
        header.style.borderBottomColor = 'var(--border-color)';
      }
    }, { passive: true });
  }

  /* ============================================================
     9. INTERSECTION OBSERVER — Lazy behaviors (mục 21)
     Stop animations when out of viewport for performance
     ============================================================ */
  if ('IntersectionObserver' in window) {
    // Pause marquee when out of viewport
    var marqueeTrack = document.querySelector('.marquee-track');
    if (marqueeTrack) {
      var marqueeObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            marqueeTrack.style.animationPlayState = 'running';
          } else {
            marqueeTrack.style.animationPlayState = 'paused';
          }
        });
      }, { threshold: 0 });

      marqueeObserver.observe(marqueeTrack.parentElement);
    }

    // Future: lazy-load videos/images in showcase when they enter viewport
    var showcaseMedia = document.querySelectorAll('.showcase-media video, .showcase-media img');
    if (showcaseMedia.length > 0) {
      var mediaObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var el = entry.target;
            if (el.tagName === 'VIDEO') {
              el.play();
            }
            mediaObserver.unobserve(el);
          } else {
            if (entry.target.tagName === 'VIDEO') {
              entry.target.pause();
            }
          }
        });
      }, { threshold: 0.25 });

      showcaseMedia.forEach(function (el) {
        mediaObserver.observe(el);
      });
    }
  }

  /* ============================================================
     10. PAGE TRANSITIONS TO APP (learn.html)
     ============================================================ */
  document.querySelectorAll('a[href*="learn.html"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var targetUrl = link.getAttribute('href');
      if (!targetUrl || targetUrl.startsWith('#')) return;
      e.preventDefault();
      document.body.classList.add('page-exit');
      setTimeout(function () {
        window.location.href = targetUrl;
      }, 240);
    });
  });

  /* ============================================================
     11. SCROLL-DRIVEN ALTERNATING ANIMATIONS & TYPEWRITER HEADINGS
     - Hiệu ứng xen kẽ:
       + Khung lẻ (Chương 1, 3, Engine, ...): Trượt từ 2 bên vào, khi cuộn qua thì kéo dạt ra 2 bên
       + Khung chẵn (Chương 2, 4, Triết lý, FAQ): Phóng to nhẹ và làm mờ (zoom-fade), khi cuộn qua thì fade mờ
     - Hiệu ứng chữ: Khi tiêu đề cuộn vào tầm nhìn, xuất hiện hiệu ứng đánh máy (typewriter)
     ============================================================ */
  function initScrollDrivenAnimations() {
    if (!('IntersectionObserver' in window)) return;

    // 1. Tag chapter blocks and major sections with alternating animation classes
    var chapterBlocks = document.querySelectorAll('.chapter-block');
    chapterBlocks.forEach(function (block, idx) {
      if (idx % 2 === 0) {
        // Human 1st, 3rd chapters -> Slide Left / Right
        block.classList.add(idx % 4 === 0 ? 'anim-slide-left' : 'anim-slide-right');
      } else {
        // Human 2nd, 4th chapters -> Zoom & Blur Fade
        block.classList.add('anim-zoom-fade');
      }
    });

    var otherCards = document.querySelectorAll('.philosophy-col, .engine-card, .faq-item, .section-lead-container, .hero-content-wrap');
    otherCards.forEach(function (card, idx) {
      if (idx % 2 === 0) {
        card.classList.add('anim-zoom-fade');
      } else {
        card.classList.add(idx % 4 === 1 ? 'anim-slide-left' : 'anim-slide-right');
      }
    });

    // 2. Set up IntersectionObserver for blocks
    var animObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var el = entry.target;
        if (entry.isIntersecting) {
          el.classList.add('in-view');
          el.classList.remove('exited-up');
        } else {
          // Check if element has scrolled past above viewport
          if (entry.boundingClientRect.top < 0) {
            el.classList.add('exited-up');
            el.classList.remove('in-view');
          } else {
            // Scrolled below viewport
            el.classList.remove('in-view', 'exited-up');
          }
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -30px 0px'
    });

    document.querySelectorAll('.anim-slide-left, .anim-slide-right, .anim-zoom-fade').forEach(function (el) {
      animObserver.observe(el);
      // Immediately reveal elements that are already in viewport
      var rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.9 && rect.bottom > 0) {
        el.classList.add('in-view');
      }
    });

    // 3. Typewriter Effect for Section Headings
    var headingTargets = document.querySelectorAll('.editorial-heading, .chapter-title, .engine-title, .pillar-title, .editorial-eyebrow');
    var typedHeadingSet = new WeakSet();

    var typewriterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          if (!typedHeadingSet.has(el)) {
            typedHeadingSet.add(el);
            runTypewriterOnElement(el);
          }
        }
      });
    }, {
      threshold: 0.15
    });

    headingTargets.forEach(function (h) {
      typewriterObserver.observe(h);
    });

    function runTypewriterOnElement(el) {
      var fullText = el.getAttribute('data-orig-text') || el.textContent.trim();
      el.setAttribute('data-orig-text', fullText);
      el.innerHTML = '<span class="typewriter-content"></span><span class="typewriter-cursor"></span>';
      var contentSpan = el.querySelector('.typewriter-content');
      var cursorSpan = el.querySelector('.typewriter-cursor');

      var charIdx = 0;
      function step() {
        if (charIdx < fullText.length) {
          contentSpan.textContent += fullText[charIdx];
          charIdx++;
          setTimeout(step, 24);
        } else {
          // Remove cursor after 1.5s
          setTimeout(function () {
            if (cursorSpan) cursorSpan.remove();
          }, 1500);
        }
      }
      step();
    }
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollDrivenAnimations);
  } else {
    initScrollDrivenAnimations();
  }

})();
