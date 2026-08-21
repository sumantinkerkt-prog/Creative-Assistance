/* ==========================================================================
   Creative Assistance — Site configuration
   --------------------------------------------------------------------------
   THIS IS THE ONLY PLACE THE PRODUCT NAME LIVES.
   Change SITE.name here and it updates across every page, menu and title.
   ========================================================================== */
(function (window) {
  'use strict';

  var CA = (window.CA = window.CA || {});

  CA.SITE = {
    name: 'Creative Assistance',
    initials: 'CA',
    tagline: 'Plan projects, track tasks and use handy creative tools — right in your browser.',
    description:
      'A free, private workspace for creative work. Organise projects, manage tasks and use a growing set of everyday tools. Everything is saved on your own device.',
    version: '1.0.0',
    // Bump this only if saved data ever needs restructuring.
    dataVersion: 1
  };

  /* Navigation — add a page here and it appears in the menu on every page. */
  CA.NAV = [
    { id: 'dashboard', label: 'Dashboard', href: 'index.html' },
    { id: 'workflow', label: 'Workflow', href: 'workflow.html' },
    { id: 'tools', label: 'Essential Tools', href: 'essential-tools.html' }
  ];

  /* The stages a task can sit in on the Workflow board.
     Add or rename stages here — the board rebuilds itself automatically. */
  CA.STAGES = [
    { id: 'idea', label: 'Ideas', accent: '#8b5cf6' },
    { id: 'active', label: 'In Progress', accent: '#6366f1' },
    { id: 'review', label: 'Review', accent: '#f59e0b' },
    { id: 'done', label: 'Done', accent: '#10b981' }
  ];

  CA.PRIORITIES = [
    { id: 'low', label: 'Low' },
    { id: 'normal', label: 'Normal' },
    { id: 'high', label: 'High' }
  ];

  CA.PROJECT_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
    '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'
  ];
})(window);
