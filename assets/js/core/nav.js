/* ==========================================================================
   Nav — one menu, rendered on every page from CA.NAV.
   Add a page to config.js and it shows up here automatically.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var CA = (window.CA = window.CA || {});
  var el = CA.UI.el;

  function buildHeader(activeId) {
    var site = CA.SITE;

    var links = CA.NAV.map(function (item) {
      var isActive = item.id === activeId;
      return el('a', {
        class: 'nav__link' + (isActive ? ' is-active' : ''),
        href: item.href,
        text: item.label,
        'aria-current': isActive ? 'page' : null
      });
    });

    var linkWrap = el('nav', { class: 'nav__links', id: 'primary-nav' }, links);

    var toggle = el('button', {
      class: 'nav__toggle',
      type: 'button',
      'aria-label': 'Toggle menu',
      'aria-expanded': 'false',
      'aria-controls': 'primary-nav',
      html:
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>'
    });

    toggle.addEventListener('click', function () {
      var open = linkWrap.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    return el('header', { class: 'site-header' }, [
      el('div', { class: 'site-header__inner' }, [
        el('a', { class: 'brand', href: 'index.html', 'aria-label': site.name + ' home' }, [
          el('span', { class: 'brand__mark', text: site.initials }),
          el('span', { class: 'brand__name', text: site.name })
        ]),
        linkWrap,
        toggle
      ])
    ]);
  }

  function buildFooter() {
    var site = CA.SITE;
    return el('footer', { class: 'site-footer' }, [
      el('div', { class: 'site-footer__inner' }, [
        el('p', { class: 'site-footer__text' }, [
          el('strong', { text: site.name }),
          document.createTextNode(' — your work stays on your device. Nothing is uploaded.')
        ]),
        el('nav', { class: 'site-footer__links' }, [
          el('a', { href: 'index.html', text: 'Dashboard' }),
          el('a', { href: 'workflow.html', text: 'Workflow' }),
          el('a', { href: 'essential-tools.html', text: 'Essential Tools' }),
          el('a', { href: 'privacy.html', text: 'Privacy' })
        ]),
        el('p', { class: 'site-footer__meta', text: 'Version ' + site.version })
      ])
    ]);
  }

  CA.Nav = {
    mount: function (activeId) {
      var headerSlot = document.getElementById('site-header');
      if (headerSlot) headerSlot.replaceWith(buildHeader(activeId));

      var footerSlot = document.getElementById('site-footer');
      if (footerSlot) footerSlot.replaceWith(buildFooter());
    }
  };
})(window, document);
