# SuperAdmin Theme & Structure Guide

This guide outlines the standard styling conventions, file structures, and best practices for the SuperAdmin portal within the Ticket Tracking System (TTS).

## 1. Design Philosophy
The SuperAdmin interface follows a **"Clean & Standard"** design language, moving away from custom dark/blue themes to a standardized light/white layout that integrates seamlessly with the rest of the application. It relies on the global CSS variables defined in `src/index.css`.

## 2. Global Theme Variables
Do not define local colors (like hardcoded hex codes) for structural elements. Use the global CSS variables.

### Core Colors
| Variable | Description | Standard Value (Light) |
| :--- | :--- | :--- |
| `--color-primary` | Main brand color (Buttons, Active links) | `#007bff` (Blue) |
| `--color-secondary` | Secondary actions | `#6c757d` (Gray) |
| `--color-danger` | Destructive actions / Errors | `#dc3545` (Red) |
| `--color-success` | Success states | `#28a745` (Green) |
| `--color-warning` | Warning states | `#ffc107` (Yellow) |

### Backgrounds & Text
| Variable | Description |
| :--- | :--- |
| `--bg-color` | Main page background (Light Gray/White) |
| `--card-bg` | Container/Card background (White) |
| `--heading-color` | Headings (H1, H2, etc.) |
| `--text-color` | Body text |
| `--muted-text-color` | Secondary text / Subtitles |
| `--border-color` | Borders and dividers |

## 3. Component Structure
All SuperAdmin pages should be wrapped in the `SuperAdminLayout` component.

```jsx
import SuperAdminLayout from '../../../components/SuperAdminLayout/SuperAdminLayout';

const MyPage = () => {
  return (
    <SuperAdminLayout>
      <div className="page-wrapper">
        <header className="page-header">
           {/* Title and Actions */}
        </header>
        <div className="page-content">
           {/* Main Content */}
        </div>
      </div>
    </SuperAdminLayout>
  );
};
```

## 4. CSS Module Standards
Avoid using `:root` in module CSS files to override global colors.

**Bad Practice:**
```css
/* Avoid this */
:root {
  --primary-color: #1a1a2e; /* Custom dark blue */
}
.card {
  background-color: #16213e; /* Hardcoded dark */
}
```

**Good Practice:**
```css
.card {
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  border-radius: var(--radius-md);
}
```

## 5. Navigation & Sidebar
The Sidebar uses `NavLink` from `react-router-dom`. Ensure `isActive` state is correctly handled for highlighting.

```jsx
<NavLink 
  to="/path" 
  className={({ isActive }) => isActive ? styles.active : ''}
>
  Label
</NavLink>
```

## 6. Common Components
Reuse components from `src/components/common` whenever possible:
*   `Button`
*   `Input`
*   `Card`
*   `Table`
*   `Badge`
*   `Alert`
*   `Modal`

## 7. Directory Structure
```text
src/features/superadmin/
├── FeatureName/
│   ├── index.js
│   ├── FeatureName.jsx
│   └── FeatureName.module.css
```
