---
name: redmine-theme-developer
description: Expert in Redmine 6.x theme development, focus on modern UI/UX using CSS-only overrides and theme.js enhancements.
---

# Redmine Theme Developer Skill

This skill encompasses the knowledge and best practices for developing modern, high-quality themes for Redmine 6.x.

## 1. Redmine 6.x Environment
- **Version:** Redmine 6.0+ (using Propshaft asset pipeline).
- **Theme Location:** `/themes/<theme_name>` (Note: In Redmine < 6.0, it was `public/themes/`).
- **Live Reloading:** In dockerized environments, `themes/` is typically bind-mounted. Changes to CSS/JS are reflected immediately.
- **Reference Code:** Use `.references/redmine` to explore default styling and templates.

## 2. Directory Structure
A standard Redmine theme must follow this structure:
```text
themes/
  +- <theme-name>/
       +- favicon/          (Optional: custom icons)
       +- javascripts/      (Optional: contains theme.js)
       +- stylesheets/      (Required: application.css)
```

## 3. Core Principles & Inheritance
- **Base Style:** Always inherit from the default Redmine styles using the Propshaft-compatible import:
  ```css
  @import url(../../../stylesheets/application.css);
  ```
- **Modernization:** Replace outdated table-based look with modern "Design Tokens" (CSS Variables).
- **CSS Variables:** Define tokens for colors, shadows, radii, and spacing to ensure consistency.

## 4. Modern UI Implementation (Modern Theme Patterns)
Refer to your theme in `themes/` for these patterns:
- **Typography:** Use modern fonts like 'Inter' via Google Fonts.
- **Top Menu:** Convert the legacy top-menu into a sleek, dark navigation bar.
- **Header Layout:** Use JavaScript in `theme.js` to unify the Header (Project title + widgets) into a flex container for better spacing.
- **Sidebar Enhancements:** Style the sidebar with subtle shadows, rounded corners, and clear typography.
- **No Yellow:** Replace the default yellow "issue" and "flash" backgrounds with modern accent colors and soft borders.
- **Tables:** Use `border-collapse: separate` and `border-radius` for a modern "card-like" table look.

## 5. JavaScript Enhancements (`theme.js`)
Redmine automatically loads `javascripts/theme.js` if it exists. Use it for:
- **Input Placeholders:** Adding `placeholder` attributes to search/jump inputs.
- **Icon Injection:** Inserting SVG icons into buttons and links.
- **Dynamic Layout:** Moving DOM elements (like `#quick-search`) into new containers for better layout control.
- **Custom Components:** Implementing hover-based dropdowns for account menus.
- **Label Cleaning:** Hiding redundant labels or text nodes (e.g., "Search:").

## 6. Reference Paths
- **Core Stylesheets:** `.references/redmine/app/assets/stylesheets/application.css`
- **Component Styling:** Use `.references/redmine/app/assets/themes/` to see how official alternate themes are structured.

---

## Detailed Reference Paths

### Base styles to examine before overriding:
- `.references/redmine/app/assets/stylesheets/application.css` — main entry point, defines all base classes
- `.references/redmine/app/assets/stylesheets/responsive.css` — responsive breakpoints (don't break these)
- `.references/redmine/app/assets/stylesheets/print.css` — print styles (don't break)
- `.references/redmine/app/assets/themes/alternate/stylesheets/application.css` — official alternate theme (good override reference)
- `.references/redmine/app/assets/themes/classic/stylesheets/application.css` — classic theme (shows full override approach)

### Propshaft Asset Pipeline (Redmine 6.x — NOT Sprockets)

Redmine 6.x uses Propshaft, not Sprockets. Key differences:
- **No compilation step** — CSS is served directly from `public/themes/<theme-name>/stylesheets/`
- **No `@import` preprocessing** — use native CSS `@import url(...)` syntax only
- **Correct base import** (count the `../` levels: `themes/<name>/stylesheets/` → `themes/<name>/` → `themes/` → `public/` → `stylesheets/`):
  ```css
  @import url(../../../stylesheets/application.css);
  ```
- **No asset fingerprinting** for theme files (they're served from `public/themes/` directly)
- **Plugin assets** are auto-copied to `public/plugin_assets/<plugin_name>/` on Redmine startup

### CSS Custom Property Conventions

Define all design tokens in `:root` at the top of `application.css`. Use these names for consistency:

```css
:root {
  /* Brand colors */
  --primary-color: #1a1f36;
  --primary-dark: #12162a;
  --accent-color: #4c6ef5;
  --accent-hover: #3b5bdb;

  /* Surfaces */
  --bg-color: #f1f3f5;
  --bg-secondary: #ffffff;
  --surface-color: #ffffff;

  /* Text */
  --text-color: #212529;
  --text-muted: #6c757d;
  --text-inverse: #ffffff;

  /* Borders */
  --border-color: #dee2e6;
  --border-radius: 6px;

  /* Elevation */
  --shadow-xs: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-sm: 0 1px 4px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.10);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.12);

  /* Typography */
  --font-family-base: 'Inter', system-ui, -apple-system, sans-serif;
  --font-size-base: 14px;

  /* Status */
  --color-success: #12b886;
  --color-error: #e03131;
  --color-warning: #f59f00;
  --color-info: #4c6ef5;

  /* Navigation */
  --top-nav-bg: var(--primary-color);
  --top-nav-text: var(--text-inverse);

  /* Sidebar */
  --sidebar-bg: #ffffff;
  --sidebar-width: 220px;
}
```

### theme.js Patterns

Redmine auto-loads `javascripts/theme.js` from the theme directory. Key patterns:

```javascript
// Always wait for DOM
document.addEventListener('DOMContentLoaded', function () {

  // Guard ALL queries — elements may not exist on every page
  const topMenu = document.querySelector('#top-menu ul');
  if (!topMenu) return;

  // Key Redmine DOM selectors (Redmine 6.x):
  // #top-menu ul        — top navigation items
  // #quick-search       — search form wrapper
  // #main-menu          — project tab navigation
  // .sidebar            — sidebar container
  // #content            — main content area
  // .flash.notice       — success flash message
  // .flash.error        — error flash message
  // .flash.warning      — warning flash message
  // .icon-add           — add/new action icons
  // .icon-edit          — edit action icons
  // #account            — account/login area in header
  // #header             — full page header

  // Hover dropdown pattern:
  const trigger = document.querySelector('#account');
  const dropdown = document.querySelector('#account-dropdown');
  if (trigger && dropdown) {
    trigger.addEventListener('mouseenter', () => dropdown.classList.add('visible'));
    document.addEventListener('click', (e) => {
      if (!trigger.contains(e.target)) dropdown.classList.remove('visible');
    });
  }
});
```

### Common Override Targets

When overriding Redmine's default styles, check `.references/redmine/app/assets/stylesheets/application.css` for the actual selectors. Key areas:

- **Flash messages**: `.flash`, `.flash.notice`, `.flash.error`, `.flash.warning`
- **Issue status badges**: `.issue-status-*` (generated class names)
- **Priority icons**: `.icon-priority-*`
- **Tables**: `table.list`, `table.list td`, `table.list th`
- **Forms**: `#content form`, `p.buttons`, `div.box`
- **Sidebar boxes**: `div#sidebar div.box`
- **Contextual buttons**: `a.icon`, `a.icon-add`, `a.icon-edit`, `a.icon-del`

---

## Scaffolding a New Theme

When a developer asks to create or scaffold a new theme, follow this workflow:

### Required Information (prompt if not provided)

1. **Theme directory name** — lowercase, hyphenated (e.g. `my-theme`)
2. **Include `theme.js`?** — for DOM manipulation (yes/no)
3. **Color scheme** — optional, used to seed initial CSS custom properties

### Generated Structure

```
themes/<theme_name>/
├── stylesheets/
│   └── application.css     # Main stylesheet — imports base, then overrides
└── javascripts/
    └── theme.js             # Optional DOM manipulation (loaded after DOMContentLoaded)
```

### `stylesheets/application.css` Template

```css
/* Import Redmine's base stylesheet — ALWAYS first */
@import url("../../../stylesheets/application.css");

:root {
  /* Override Redmine colour tokens here */
  /* --primary:    #3b82f6; */
  /* --header-bg:  #1e3a5f; */
}
```

**Important:** The `@import` path is relative to where Propshaft serves the file. Use exactly `../../../stylesheets/application.css` for themes in the standard location.

### `javascripts/theme.js` Template

```javascript
document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('theme-<name>');
  // Light DOM manipulation here — no jQuery dependency
});
```

### Post-Scaffold Steps

1. Hard-refresh browser (Ctrl+Shift+R)
2. Activate: **Administration > Settings > Display > Theme**
3. Verify CSS loads by checking DevTools Network tab

### Quick Scaffold

```bash
bash scripts/scaffold-theme.sh my-theme
# or interactively:
make scaffold-theme
```
