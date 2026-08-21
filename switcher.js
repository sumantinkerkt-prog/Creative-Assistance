/*
 * Creative Assistance - Page Switcher
 * -----------------------------------
 * One shared file that puts the same navigation dock on every page of the app.
 * All pages are shown as icons at all times, so switching is a single click.
 * Include it once per page, just before </body>:
 *
 *     <script src="switcher.js"></script>
 *
 * To add, rename or reorder pages later, edit the PAGES list below only.
 * Every page picks the change up automatically.
 *
 * Notes:
 * - No dependencies, no build step. Works from a web server or straight off disk.
 * - All markup and styling live inside a shadow root, so this cannot clash with
 *   (or be broken by) the very different styles used on each page.
 */
(function () {
    'use strict';

    if (window.__caSwitcherLoaded) return;
    window.__caSwitcherLoaded = true;

    /* ---------------------------------------------------------------
     * The pages of the app. This is the single place to edit.
     * --------------------------------------------------------------- */
    var PAGES = [
        {
            file: 'index.html',
            label: 'Home',
            icon: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>'
        },
        {
            file: 'text-studio.html',
            label: 'Text Studio',
            icon: '<path d="M4 6h16"/><path d="M4 12h11"/><path d="M4 18h7"/>'
        },
        {
            file: 'image-analyzer.html',
            label: 'Image Analyzer',
            icon: '<path d="M5 3v13a2 2 0 0 0 2 2h13"/><path d="M19 21V8a2 2 0 0 0-2-2H4"/>'
        },
        {
            file: 'compress-and-upscale.html',
            label: 'Compress & Upscale',
            icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m8 14-2.5 3.5h13L14 10l-3 4"/><circle cx="9" cy="8.5" r="1.4"/>'
        }
    ];

    /* Older file names, kept so any saved bookmark still highlights correctly. */
    var ALIASES = {
        'essential tools with nav.html': 'image-analyzer.html',
        'text studio.html': 'text-studio.html',
        'compress and upscale.html': 'compress-and-upscale.html',
        '': 'index.html'
    };

    /* ---------------------------------------------------------------
     * Which page are we on?
     * --------------------------------------------------------------- */
    function currentFile() {
        var path = window.location.pathname || '';
        var name = path.slice(path.lastIndexOf('/') + 1);
        try { name = decodeURIComponent(name); } catch (e) { /* leave as-is */ }
        name = name.toLowerCase();
        return ALIASES[name] || name;
    }

    var CURRENT = currentFile();

    var STYLES = [
        ':host{all:initial;position:fixed;right:20px;bottom:20px;z-index:2147483000;',
        'font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}',
        '*{box-sizing:border-box;margin:0;padding:0;}',

        /* the dock: always on screen, every page shown at once */
        '.dock{display:flex;align-items:center;gap:4px;padding:6px;',
        'background:rgba(19,27,44,.92);border:1px solid rgba(148,163,184,.22);border-radius:999px;',
        '-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);',
        'box-shadow:0 12px 34px -10px rgba(0,0,0,.75),0 2px 6px rgba(0,0,0,.35);}',

        /* one tab per page - a single click goes straight there */
        '.tab{position:relative;flex:none;display:inline-flex;align-items:center;justify-content:center;',
        'gap:8px;width:40px;height:40px;border-radius:999px;text-decoration:none;color:#94a3b8;',
        'border:1px solid transparent;',
        'transition:background .15s ease,color .15s ease,border-color .15s ease;}',
        '.tab:hover{background:rgba(99,102,241,.16);color:#e2e8f0;}',
        '.tab:focus-visible{outline:2px solid #6366f1;outline-offset:2px;}',
        '.tab svg{flex:none;}',

        /* the page you are on: highlighted and named, so you always know where you are */
        '.tab.here{width:auto;padding:0 14px;background:rgba(16,185,129,.15);color:#d1fae5;',
        'border-color:rgba(16,185,129,.32);cursor:default;}',
        '.tab.here svg{color:#34d399;}',
        '.name{display:none;font-size:12.5px;font-weight:600;line-height:1;white-space:nowrap;',
        'max-width:150px;overflow:hidden;text-overflow:ellipsis;}',
        '.tab.here .name{display:block;}',

        /* hover label for the other pages */
        '.tip{position:absolute;bottom:calc(100% + 9px);right:-6px;',
        'background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:8px;',
        'padding:5px 9px;font-size:11px;font-weight:600;line-height:1;white-space:nowrap;',
        'box-shadow:0 8px 20px -6px rgba(0,0,0,.7);',
        'opacity:0;transform:translateY(3px);pointer-events:none;',
        'transition:opacity .15s ease,transform .15s ease;}',
        '.tab:hover .tip,.tab:focus-visible .tip{opacity:1;transform:translateY(0);}',
        '.tab.here .tip{display:none;}',

        /* small screens */
        '@media (max-width:560px){',
        ':host{right:12px;bottom:12px;}',
        '.tab{width:38px;height:38px;}',
        '.tab.here{padding:0 12px;}',
        '.name{max-width:96px;font-size:12px;}',
        '}',
        '@media (prefers-reduced-motion:reduce){.tab,.tip{transition:none;}}',
        '@media print{:host{display:none;}}'
    ].join('');

    function svg(inner, size) {
        return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" ' +
            'stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ' +
            'aria-hidden="true">' + inner + '</svg>';
    }

    function esc(text) {
        return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function build() {
        var host = document.createElement('div');
        host.id = 'ca-page-switcher';
        var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : null;
        if (!root) return; /* very old browser: skip rather than break the page */

        var tabs = PAGES.map(function (page) {
            var here = page.file.toLowerCase() === CURRENT;
            return '<a class="tab' + (here ? ' here' : '') + '"' +
                ' href="' + esc(page.file) + '"' +
                ' aria-label="' + esc(page.label) + '"' +
                (here ? ' aria-current="page"' : '') + '>' +
                svg(page.icon, 18) +
                '<span class="name">' + esc(page.label) + '</span>' +
                '<span class="tip">' + esc(page.label) + '</span>' +
                '</a>';
        }).join('');

        root.innerHTML =
            '<style>' + STYLES + '</style>' +
            '<nav class="dock" aria-label="App pages">' + tabs + '</nav>';

        /* clicking the page you are already on should do nothing */
        root.querySelectorAll('.tab.here').forEach(function (tab) {
            tab.addEventListener('click', function (event) {
                event.preventDefault();
            });
        });

        document.body.appendChild(host);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', build);
    } else {
        build();
    }
})();
