(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const config = window.InkNestConfig || {};
  const isEnabled = (key) => config[key] !== false;
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const header = $('#site-header');
  const scrollTasks = [];
  let scrollTicking = false;
  const runScrollTasks = () => {
    scrollTicking = false;
    scrollTasks.forEach((task) => task());
  };
  const requestScrollUpdate = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(runScrollTasks);
  };
  const addScrollTask = (task) => {
    scrollTasks.push(task);
    task();
  };

  if (header) {
    addScrollTask(() => {
      header.classList.toggle('is-scrolled', window.scrollY > 20);
    });
  }
  window.addEventListener('scroll', requestScrollUpdate, { passive: true });

  document.documentElement.classList.toggle('smooth-scroll', isEnabled('smoothScroll') && !prefersReducedMotion);

  let activePanel = null;
  let activeTrigger = null;
  const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const setExpanded = (trigger, expanded) => {
    if (trigger) trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  };

  const getFocusable = (panel) => $$(focusableSelector, panel).filter((item) => item.offsetParent !== null || item === document.activeElement);
  const getInertTargets = () => $$('body > *').filter((item) => !item.matches('.mobile-menu, script, style'));
  const containsActivePanel = (item) => activePanel && item.contains(activePanel);
  const isActivePanel = (item) => item === activePanel;
  const inertTargets = () => getInertTargets().filter((item) => !isActivePanel(item) && !containsActivePanel(item));
  const setBackgroundInert = (inert) => {
    inertTargets().forEach((item) => {
      if (inert) {
        item.setAttribute('inert', '');
      } else {
        item.removeAttribute('inert');
      }
    });
  };

  const openPanel = (panel, trigger) => {
    if (!panel) return;
    if (activePanel && activePanel !== panel) closePanel(activePanel, false);
    activePanel = panel;
    activeTrigger = trigger || document.activeElement;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('panel-open');
    setBackgroundInert(true);
    setExpanded(activeTrigger, true);

    const focusTarget = $('[data-mobile-close]', panel) || getFocusable(panel)[0];
    focusTarget?.focus({ preventScroll: true });
  };

  const closePanel = (panel, restoreFocus = true) => {
    if (!panel) return;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    if (!$('.mobile-menu.is-open')) {
      document.body.classList.remove('panel-open');
      setBackgroundInert(false);
    }
    if (panel === activePanel) {
      setExpanded(activeTrigger, false);
      if (restoreFocus) activeTrigger?.focus?.({ preventScroll: true });
      activePanel = null;
      activeTrigger = null;
    }
  };

  const openSearchWidget = () => {
    if (config.searchEnabled === false || !window.SearchWidget?.open) return false;
    window.SearchWidget.open();
    return true;
  };

  $('[data-search-toggle]')?.addEventListener('click', () => openSearchWidget());

  const mobileMenu = $('#mobile-menu');
  $('[data-mobile-toggle]')?.addEventListener('click', (event) => openPanel(mobileMenu, event.currentTarget));
  $('[data-mobile-close]')?.addEventListener('click', () => closePanel(mobileMenu));

  mobileMenu?.addEventListener('click', (event) => {
    if (event.target === mobileMenu) closePanel(mobileMenu);
  });

  const isTypingTarget = (element) => element?.closest?.('input, textarea, select, [contenteditable="true"]');

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closePanel(mobileMenu);
      return;
    }
    if (event.key === '/' && isEnabled('searchShortcut') && !activePanel && !isTypingTarget(document.activeElement)) {
      if (openSearchWidget()) event.preventDefault();
      return;
    }
    if (event.key !== 'Tab' || !activePanel) return;

    const focusable = getFocusable(activePanel);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  const backToTop = $('[data-back-to-top]');
  if (backToTop) {
    addScrollTask(() => {
      const visible = window.scrollY > 420;
      backToTop.classList.toggle('is-visible', visible);
      backToTop.setAttribute('aria-hidden', visible ? 'false' : 'true');
      backToTop.setAttribute('tabindex', visible ? '0' : '-1');
    });
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: isEnabled('smoothScroll') && !prefersReducedMotion ? 'smooth' : 'auto' }));
  }

  const readingProgress = $('#reading-progress');
  if (readingProgress) {
    addScrollTask(() => {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const progress = height > 0 ? Math.min(100, (window.scrollY / height) * 100) : 0;
      readingProgress.style.width = progress + '%';
    });
  }

  const postContent = $('#post-content');
  const readingTime = $('[data-reading-time]');
  if (postContent && readingTime) {
    const text = postContent.textContent.trim();
    const minutes = Math.max(1, Math.ceil(text.length / 400));
    readingTime.textContent = `约 ${minutes} 分钟阅读`;
  }

  const tocLists = $$('[data-toc-list]');
  $$('[data-toc-toggle]').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const collapsed = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      toggle.closest('.post-toc')?.classList.toggle('is-collapsed', collapsed);
    });
  });

  if (postContent && tocLists.length) {
    const headings = $$('h2, h3', postContent).filter((heading) => heading.textContent.trim());
    if (headings.length) {
      const usedIds = new Set($$('[id]').map((item) => item.id));
      const toSlug = (text) => text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w一-龥-]/g, '') || 'heading';
      const uniqueId = (base) => {
        let id = base;
        let index = 2;
        while (usedIds.has(id)) {
          id = `${base}-${index}`;
          index += 1;
        }
        usedIds.add(id);
        return id;
      };

      headings.forEach((heading) => {
        if (!heading.id) heading.id = uniqueId(toSlug(heading.textContent));
      });

      tocLists.forEach((tocList) => {
        headings.forEach((heading) => {
          const link = document.createElement('a');
          link.href = '#' + encodeURIComponent(heading.id);
          link.textContent = heading.textContent.trim();
          link.className = 'toc-link toc-link--' + heading.tagName.toLowerCase();
          link.dataset.targetId = heading.id;
          tocList.appendChild(link);
        });
      });

      const tocLinks = $$('.toc-link');
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            tocLinks.forEach((link) => link.classList.toggle('is-active', link.dataset.targetId === entry.target.id));
          });
        }, { rootMargin: '-20% 0px -65% 0px' });
        headings.forEach((heading) => observer.observe(heading));
      } else {
        tocLinks[0]?.classList.add('is-active');
      }
    } else {
      $$('.post-toc').forEach((toc) => toc.remove());
    }
  }

  if (isEnabled('lazyload')) {
    $$('.prose img').forEach((image) => {
      if (!image.hasAttribute('loading')) image.setAttribute('loading', 'lazy');
      if (!image.hasAttribute('decoding')) image.setAttribute('decoding', 'async');
    });
  }

  if (isEnabled('codeCopy')) {
    $$('pre').forEach((pre) => {
      if (pre.querySelector('.code-copy')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'code-copy';
      button.textContent = '复制';
      button.setAttribute('aria-live', 'polite');
      button.addEventListener('click', async () => {
        const code = pre.querySelector('code')?.innerText || pre.innerText;
        try {
          await navigator.clipboard.writeText(code);
          button.textContent = '已复制';
          setTimeout(() => { button.textContent = '复制'; }, 1600);
        } catch (error) {
          button.textContent = '复制失败';
          setTimeout(() => { button.textContent = '复制'; }, 1600);
        }
      });
      pre.appendChild(button);
    });
  }

  const copyText = async (button, text, successText, defaultText) => {
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = successText;
    } catch (error) {
      button.textContent = '复制失败';
    }
    setTimeout(() => { button.textContent = defaultText; }, 1600);
  };

  $('[data-share-current]')?.addEventListener('click', (event) => {
    copyText(event.currentTarget, window.location.href, '链接已复制', '复制链接');
  });


  const proseImages = $$('.prose img');
  if (isEnabled('fancybox') && proseImages.length && config.fancyboxCss && config.fancyboxJs && !window.__InkNestFancyboxLoading) {
    window.__InkNestFancyboxLoading = true;
    if (!$(`link[href="${config.fancyboxCss}"]`)) {
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = config.fancyboxCss;
      document.head.appendChild(stylesheet);
    }

    if (window.Fancybox) {
      window.Fancybox.bind('.prose img', {});
    } else {
      const script = document.createElement('script');
      script.src = config.fancyboxJs;
      script.onload = () => window.Fancybox?.bind('.prose img', {});
      script.onerror = () => { window.__InkNestFancyboxLoading = false; };
      document.body.appendChild(script);
    }
  }
})();
