# Creative Assistance

A free, private workspace for creative work. Plan projects, track tasks, and use a set of small everyday tools.

**Live site:** https://sumantinkerkt-prog.github.io/Creative-Assistance/

There is no server, no database and no sign-up. Everything a visitor creates is saved in their own browser on their own device, and never sent anywhere. Hosting is free and there are no running costs.

## Pages

| Page | What it does |
| --- | --- |
| `index.html` | Dashboard — live counts, what's due soon, project overview, backup and restore |
| `workflow.html` | Projects and their tasks, moved through stages on a board |
| `essential-tools.html` | Quick Notes, Word Counter, Focus Timer, Colour Palette, Checklist |
| `privacy.html` | Privacy statement |
| `404.html` | Shown for a bad address |

## How it's put together

```
index.html, workflow.html, essential-tools.html, privacy.html, 404.html
assets/
  css/site.css              all styling, driven by variables at the top
  favicon.svg
  js/
    config.js               product name, menu, stages, colours
    core/
      storage.js            saves to the browser, handles the awkward cases
      store.js              simple lists of records built on storage.js
      ui.js                 shared helpers (elements, toasts, dialogs, dates)
      nav.js                the header and footer, drawn on every page
      tools.js              the tool registry
      app.js               starts each page
    pages/                  one file per page
    tools/                  one file per tool
```

Plain HTML, CSS and JavaScript. No build step, no dependencies, no package manager. Open any `.html` file directly in a browser and it works.

## Common changes

**Rename the product.** Edit `name` in `assets/js/config.js`. Every page, menu and browser tab title follows automatically.

**Add or rename a board stage.** Edit `STAGES` in `assets/js/config.js`. The board rebuilds itself around whatever is listed.

**Add a page to the menu.** Add an entry to `NAV` in `assets/js/config.js`.

**Add a new tool.** Create a file in `assets/js/tools/` that calls `CA.Tools.register({ ... })`, then add one `<script>` line to `essential-tools.html`. Each tool gets its own private saved storage and cannot break the others — a tool that throws an error is caught and shows a message in its own card.

## Data and backups

Data lives under keys prefixed `ca:` in the browser's local storage. Because it's tied to one browser on one device, the Dashboard offers **Save a backup**, which downloads everything as a single `.json` file, and **Restore a backup**, which reads one back in. That file is the only way to move work between devices.

## Publishing

Hosted with GitHub Pages from the `main` branch. Pushing to `main` updates the live site within about a minute.
