# Creative Assistance

A free, private workspace for creative work. Plan projects, track tasks on a simple board,
and use a handful of everyday tools.

There is no server, no database and no sign-up. Everything a visitor creates is saved in
their own browser, on their own device, and is never sent anywhere.

## Pages

| File | What it is |
| --- | --- |
| `index.html` | Home — counts, what's due soon, project progress, backup and restore |
| `workflow.html` | Projects and their tasks, moved across Ideas → In Progress → Review → Done |
| `essential-tools.html` | Quick Notes, Word Counter, Focus Timer, Colour Palette, Checklist |
| `privacy.html` | Privacy statement |
| `404.html` | Shown for an address that doesn't exist |

The two original files — `Upsworth Workflow with Nav.html` and `essential tools with nav.html` —
are kept as redirects. They used to pull their content from `D:\W\code\flow\` on one PC, so they
showed a blank page anywhere else. They now forward to `workflow.html` and `essential-tools.html`.

## How it's built

Plain HTML, CSS and JavaScript. No build step, no dependencies, no package manager.

```
index.html, workflow.html, essential-tools.html, privacy.html, 404.html
vercel.json          hosting settings (tidy URLs without .html)
assets/
  favicon.svg
  css/site.css       all styling, driven by the variables at the top of the file
  js/
    app.js           shared: config, browser storage, helpers, header and footer
    home.js          the home page
    workflow.js      the project board
    tools.js         the five tools
```

Open any `.html` file in a browser and it works — no local server needed.

## Deploying to Vercel

It's a static site, so there is nothing to configure:

1. In Vercel, choose **Add New → Project** and import this repository.
2. Leave Framework Preset as **Other**. Leave the build and output settings empty.
3. Deploy.

`vercel.json` turns on tidy addresses, so pages are served at `/workflow` and
`/essential-tools` as well as their `.html` names.
