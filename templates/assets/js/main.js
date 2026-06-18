(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const header = $('#site-header');
  const updateHeader = () => {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 20);
  };
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const openPanel = (panel) => {
    if (!panel) return;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('panel-open');
  };

  const closePanel = (panel) => {
    if (!panel) return;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    if (!$('.search-panel.is-open') && !$('.mobile-menu.is-open')) {
      document.body.classList.remove('panel-open');
    }
  };

  const searchPanel = $('#search-panel');
  $('[data-search-toggle]')?.addEventListener('click', () => openPanel(searchPanel));
  $('[data-search-close]')?.addEventListener('click', () => closePanel(searchPanel));

  const mobileMenu = $('#mobile-menu');
  $('[data-mobile-toggle]')?.addEventListener('click', () => openPanel(mobileMenu));
  $('[data-mobile-close]')?.addEventListener('click', () => closePanel(mobileMenu));

  [searchPanel, mobileMenu].forEach((panel) => {
    panel?.addEventListener('click', (event) => {
      if (event.target === panel) closePanel(panel);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    [searchPanel, mobileMenu].forEach(closePanel);
  });

  const backToTop = $('[data-back-to-top]');
  if (backToTop) {
    const updateBackToTop = () => backToTop.classList.toggle('is-visible', window.scrollY > 420);
    updateBackToTop();
    window.addEventListener('scroll', updateBackToTop, { passive: true });
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  const readingProgress = $('#reading-progress');
  if (readingProgress) {
    const updateProgress = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const progress = height > 0 ? Math.min(100, (window.scrollY / height) * 100) : 0;
      readingProgress.style.width = progress + '%';
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
  }

  const postContent = $('#post-content');
  const tocList = $('#toc-list');
  if (postContent && tocList) {
    const headings = $$('h2, h3', postContent).filter((heading) => heading.textContent.trim());
    if (headings.length) {
      headings.forEach((heading, index) => {
        if (!heading.id) heading.id = 'heading-' + index;
        const link = document.createElement('a');
        link.href = '#' + heading.id;
        link.textContent = heading.textContent.trim();
        link.className = 'toc-link toc-link--' + heading.tagName.toLowerCase();
        tocList.appendChild(link);
      });

      const tocLinks = $$('.toc-link', tocList);
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          tocLinks.forEach((link) => link.classList.toggle('is-active', link.getAttribute('href') === '#' + entry.target.id));
        });
      }, { rootMargin: '-20% 0px -65% 0px' });
      headings.forEach((heading) => observer.observe(heading));
    } else {
      $('#post-toc')?.remove();
    }
  }

  $$('pre').forEach((pre) => {
    if (pre.querySelector('.code-copy')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'code-copy';
    button.textContent = '复制';
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

  $('[data-share-current]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    try {
      await navigator.clipboard.writeText(window.location.href);
      button.textContent = '链接已复制';
      setTimeout(() => { button.textContent = '复制链接'; }, 1600);
    } catch (error) {
      button.textContent = '复制失败';
      setTimeout(() => { button.textContent = '复制链接'; }, 1600);
    }
  });

  if (window.Fancybox) {
    Fancybox.bind('.prose img', {});
  }
})();
