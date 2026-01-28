# UI Refactoring Plan: Unified Design System

This document outlines the strategy to unify the Auth Frontend UI, eliminate hardcoded styles, and establish a consistent design system based on standardized CSS variables and atomic components.

## 1. Design Tokens (CSS Variables)
Refactor `src/index.css` to act as the single source of truth. All feature-level styles MUST use these variables.

### Categories to Standardize:
- **Colors**: Primary, Secondary, Success, Danger, Warning, Info.
- **Backgrounds**: Main body background, Card background, Input background.
- **Typography**: Font sizes (sm, base, lg, xl), Weights, Line heights.
- **Spacing**: Consistent margins and padding (4px, 8px, 16px, 24px, 32px).
- **Elevation**: Shadow levels for cards, modals, and dropdowns.
- **Borders**: Widths, Colors, and Radius (sm, md, lg).

---

## 2. Atomic Component Library
Build reusable UI elements in `src/components/common`. These components will encapsulate the design system logic.

### Priority Components:
1.  **Button**: Supports variants (`primary`, `secondary`, `danger`, `outline`), sizes, and loading states.
2.  **Input Field**: Standardized text, email, password inputs with labels and validation error display.
3.  **Card**: Container with standardized padding, border-radius, and shadow.
4.  **Badge/Tag**: For status indicators (e.g., "Active", "Pending", "Staff").
5.  **Modal**: Generic portal-based wrapper for all dialogs.
6.  **Table**: Reusable data table styles with consistent header and row formatting.

---

## 3. Directory Restructuring
Organize components and styles to support scalability.

```text
src/
├── components/
│   ├── common/           # Atomic UI Elements (Button, Input, Card)
│   └── layout/           # Shared Layout wrappers (Auth, Main, SuperAdmin)
├── styles/
│   ├── variables.css     # CSS Variable definitions
│   └── mixins.css        # Flexbox/Grid utility snippets
└── features/             # Updated to use common components
```

---

## 4. Refactoring Rules
To ensure long-term maintainability, the following rules apply during the refactor:

- **Rule #1: No Hex/RGB/HSL in Feature CSS**: Feature-specific `.module.css` files should only reference `var(--color-name)`.
- **Rule #2: Standardized Spacing**: Use spacing variables (e.g., `padding: var(--space-md)`) instead of raw pixel values.
- **Rule #3: Component Over HTML**: Use `<Button>` instead of `<button>`, and `<Card>` instead of `<div className="card">`.
- **Rule #4: Mobile First**: All layout components must be responsive by default using CSS Grid/Flexbox and standardized breakpoints.

---

## 5. Execution Roadmap

### Phase 1: Foundation
- [ ] Define all CSS variables in `index.css`.
- [ ] Create `Button`, `Input`, and `Card` components.

### Phase 2: Auth Feature Unification
- [ ] Refactor Login/Register/Forgot Password to use the new atomic components.
- [ ] Implement a shared `AuthLayout` for these pages.

### Phase 3: Admin & Dashboard Unification
- [ ] Standardize Table components for Agent Management and User Masterlists.
- [ ] Unify Sidebar and Navbar spacing across Staff and SuperAdmin views.

### Phase 4: Audit & Cleanup
- [ ] Remove all unused CSS and legacy style files.
- [ ] Perform a final check for any remaining hardcoded values.
