/*
 * Creative Assistance - Page Switcher
 * -----------------------------------
 * One shared file that puts the same "jump to any page" control on every page
 * of the app. Include it once per page, just before </body>:
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
            hint: 'Projects, tasks & notes',
            icon: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>'
        },
        {
            file: 'text-studio.html',
            label: 'Text Studio',
            hint: 'Write, transform & count',
            icon: '<path d="M4 6h16"/><path d="M4 12h11"/><path d="M4 18h7"/>'
        },
        {
            file: 'image-analyzer.html',
            label: 'Image Analyzer',
            hint: 'Aspect ratios & AI sizes',
            icon: '<path d="M5 3v13a2 2 0 0 0 2 2h13"/><path d="M19 21V8a2 2 0 0 0-2-2H4"/>'
        },
        {
            file: 'compress-and-upscale.html',
            label: 'Compress & Upscale',
            hint: 'Shrink or enlarge files',
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
    var activePage = null;
    for (var i = 0; i < PAGES.length; i++) {
        if (PAGES[i].file.toLowerCase() === CURRENT) { activePage = PAGES[i]; break; }
    }

    var STYLES = [
        ':host{all:initial;position:fixed;right:20px;bottom:20px;z-index:2147483000;',
        'font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}',
        '*{box-sizing:border-box;margin:0;padding:0;}',
        '.wrap{position:relative;display:flex;flex-direction:column;align-items:flex-end;gap:10px;}',

        /* the always-visible button */
        '.fab{display:inline-flex;align-items:center;gap:9px;cursor:pointer;',
        'background:rgba(19,27,44,.92);color:#e2e8f0;border:1px solid rgba(148,163,184,.22);',
        'border-radius:999px;padding:11px 16px;font-size:13px;font-weight:600;line-height:1;',
        '-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);',
        'box-shadow:0 10px 30px -8px rgba(0,0,0,.7),0 2px 6px rgba(0,0,0,.35);',
        'transition:transform .18s ease,border-color .18s ease,background .18s ease;}',
        '.fab:hover{transform:translateY(-2px);border-color:rgba(99,102,241,.55);background:rgba(26,35,51,.96);}',
        '.fab:active{transform:translateY(0);}',
        '.fab:focus-visible{outline:2px solid #6366f1;outline-offset:3px;}',
        '.fab .grid{color:#818cf8;flex:none;}',
        '.fab .name{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
        '.fab .chev{color:#64748b;flex:none;transition:transform .2s ease;}',
        '.open .fab .chev{transform:rotate(180deg);}',

        /* the list of pages */
        '.panel{position:absolute;right:0;bottom:calc(100% + 10px);width:270px;',
        'background:rgba(15,22,38,.97);border:1px solid rgba(148,163,184,.2);border-radius:16px;',
        '-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);padding:8px;',
        'box-shadow:0 24px 60px -12px rgba(0,0,0,.85);',
        'opacity:0;transform:translateY(8px) scale(.97);transform-origin:bottom right;',
        'pointer-events:none;transition:opacity .18s ease,transform .18s ease;}',
        '.open .panel{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;}',
        '.cap{padding:8px 10px 10px;font-size:10px;font-weight:700;letter-spacing:.09em;',
        'text-transform:uppercase;color:#64748b;}',
        '.item{display:flex;align-items:center;gap:11px;width:100%;text-align:left;',
        'padding:9px 10px;border-radius:11px;text-decoration:none;color:#cbd5e1;',
        'transition:background .15s ease,color .15s ease;}',
        '.item+.item{margin-top:2px;}',
        '.item:hover{background:rgba(99,102,241,.14);color:#f1f5f9;}',
        '.item:focus-visible{outline:2px solid #6366f1;outline-offset:-2px;}',
        '.ic{flex:none;width:32px;height:32px;display:grid;place-items:center;border-radius:9px;',
        'background:rgba(99,102,241,.13);color:#818cf8;border:1px solid rgba(99,102,241,.2);}',
        '.txt{min-width:0;flex:1;display:flex;flex-direction:column;}',
        '.lbl{display:block;font-size:13px;font-weight:600;line-height:1.3;',
        'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
        '.hint{display:block;font-size:11px;color:#64748b;line-height:1.3;margin-top:2px;',
        'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
        '.item.here{background:rgba(16,185,129,.12);color:#f1f5f9;cursor:default;}',
        '.item.here .ic{background:rgba(16,185,129,.16);color:#34d399;border-color:rgba(16,185,129,.28);}',
        '.badge{flex:none;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;',
        'color:#34d399;background:rgba(16,185,129,.14);border:1px solid rgba(16,185,129,.28);',
        'border-radius:999px;padding:3px 7px;}',

        /* small screens: shrink to just the icon */
        '@media (max-width:560px){',
        ':host{right:14px;bottom:14px;}',
        '.fab{padding:11px 13px;}',
        '.fab .name,.fab .chev{display:none;}',
        '.panel{width:min(84vw,260px);}',
        '}',
        '@media (prefers-reduced-motion:reduce){.fab,.panel,.chev{transition:none;}}',
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

        var gridIcon = svg('<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/>' +
            '<rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>', 16);
        var chevIcon = svg('<path d="m6 15 6-6 6 6"/>', 14);

        var items = PAGES.map(function (page) {
            var here = activePage && page.file === activePage.file;
            return '<a class="item' + (here ? ' here' : '') + '"' +
                (here ? ' aria-current="page"' : '') +
                ' href="' + esc(page.file) + '">' +
                '<span class="ic">' + svg(page.icon, 17) + '</span>' +
                '<span class="txt"><span class="lbl">' + esc(page.label) + '</span>' +
                '<span class="hint">' + esc(page.hint) + '</span></span>' +
                (here ? '<span class="badge">Here</span>' : '') +
                '</a>';
        }).join('');

        root.innerHTML =
            '<style>' + STYLES + '</style>' +
            '<div class="wrap" part="wrap">' +
            '<nav class="panel" aria-label="All pages">' +
            '<div class="cap">Go to page</div>' + items +
            '</nav>' +
            '<button class="fab" type="button" aria-expanded="false" aria-label="Switch page">' +
            '<span class="grid">' + gridIcon + '</span>' +
            '<span class="name">' + esc(activePage ? activePage.label : 'Pages') + '</span>' +
            '<span class="chev">' + chevIcon + '</span>' +
            '</button>' +
            '</div>';

        document.body.appendChild(host);

        var wrap = root.querySelector('.wrap');
        var fab = root.querySelector('.fab');
        var firstLink = root.querySelector('.item:not(.here)');

        function setOpen(open, moveFocus) {
            wrap.classList.toggle('open', open);
            fab.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open && moveFocus && firstLink) firstLink.focus();
        }

        fab.addEventListener('click', function (event) {
            event.stopPropagation();
            /* detail 0 means the button was activated by keyboard, not a mouse -
               only then does jumping focus into the list help rather than distract */
            setOpen(!wrap.classList.contains('open'), event.detail === 0);
        });

        /* clicking the page you are already on does nothing but close the list */
        root.querySelectorAll('.item.here').forEach(function (link) {
            link.addEventListener('click', function (event) {
                event.preventDefault();
                setOpen(false);
            });
        });

        document.addEventListener('click', function (event) {
            var path = event.composedPath ? event.composedPath() : [];
            if (path.indexOf(host) === -1) setOpen(false);
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && wrap.classList.contains('open')) {
                setOpen(false);
                fab.focus();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', build);
    } else {
        build();
    }
})();
