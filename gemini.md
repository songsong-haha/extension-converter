# Enterprise Next.js Project Structure & Naming Conventions

This document outlines the recommended package structure and file naming conventions for enterprise-level Next.js applications, focusing on scalability, maintainability, and developer experience.

## 1. Directory Structure

For enterprise applications, adopting a **Feature-First** architecture (inspired by Feature-Sliced Design) is highly recommended. This organizes code by business domain rather than technical layers. We also recommend using the `src/` directory to separate application code from root-level configuration.

### Recommended Tree

```
.
├── src/
│   ├── app/                    # Next.js App Router (Routing layer only)
│   │   ├── (auth)/             # Route Group: Authentication routes (doesn't affect URL)
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/        # Route Group: Dashboard routes
│   │   │   ├── layout.tsx      # Dashboard layout (sidebar, header)
│   │   │   └── page.tsx        # Dashboard home
│   │   ├── api/                # API Routes
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Landing page
│   │
│   ├── features/               # Feature-based modules (The core business logic)
│   │   ├── auth/               # Example Feature: Auth
│   │   │   ├── components/     # Components specific to Auth (e.g., LoginForm)
│   │   │   ├── hooks/          # Hooks specific to Auth (e.g., useLogin)
│   │   │   ├── lib/            # Utilities/Logic specific to Auth (e.g., auth-service)
│   │   │   └── types/          # Types specific to Auth
│   │   └── dashboard/          # Example Feature: Dashboard
│   │       ├── components/
│   │       └── ...
│   │
│   ├── components/             # Shared/Generic UI Components (Design System)
│   │   ├── ui/                 # Atomic UI components (Button, Input, Card)
│   │   │   ├── button.tsx
│   │   │   └── input.tsx
│   │   └── layout/             # Shared layout components (Header, Footer)
│   │
│   ├── lib/                    # Shared Utilities & Libraries
│   │   ├── api-client.ts       # Global API client (Axios/Fetch wrapper)
│   │   ├── db.ts               # Database connection
│   │   └── utils.ts            # Generic helper functions (cn, formatting)
│   │
│   ├── hooks/                  # Shared Custom Hooks
│   │   └── use-media-query.ts
│   │
│   ├── types/                  # Shared TypeScript Definitions
│   │   └── api-types.ts        # Global API response types
│   │
│   ├── constants/              # Shared Constants
│   │   └── config.ts
│   │
│   └── styles/                 # Shared logic for styles (if not using Tailwind utility classes exclusively)
│
├── public/                     # Static Assets (images, fonts)
├── .eslintrc.json
├── next.config.js
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 2. Key Architectural Principles

### The `features/` Directory

Instead of grouping files by type (e.g., putting all components in `components/`), group them by **feature**.

- **Rule:** If a component/hook/utility is _only_ used within a specific feature (e.g., "User Profile"), it belongs in `src/features/user-profile/`.
- **Benefit:** This keeps related code colocated, making it easier to modify or delete features without digging through the entire codebase.

### The `app/` Directory

Keep logic in `app/` minimal. It should primarily handle:

- Routing definitions (`page.tsx`)
- Layout structure (`layout.tsx`)
- Data fetching (calling services defined in `features/` or `lib/`)
- Metadata (SEO)

### The `components/ui/` Directory

This serves as your internal "Design System".

- Components here should be **dumb** (presentational) and highly reusable.
- They should not contain business logic or API calls.
- Examples: `Button`, `Modal`, `Tabs`, `Dropdown`.

---

## 3. Naming Conventions

Consistency is key for enterprise teams.

### Files & Directories

Use **kebab-case** for all files and directories. This avoids case-sensitivity issues across different operating systems (macOS/Windows/Linux).

| Type                      | Convention             | Example                                 |
| :------------------------ | :--------------------- | :-------------------------------------- |
| **Directories**           | `kebab-case`           | `user-profile/`, `components/`          |
| **Component Files**       | `kebab-case`           | `user-avatar.tsx`, `submit-button.tsx`  |
| **Utility Files**         | `kebab-case`           | `date-format.ts`, `api-client.ts`       |
| **Next.js Special Files** | `lowercase` (reserved) | `page.tsx`, `layout.tsx`, `loading.tsx` |

> **Note:** Some teams prefer `PascalCase` for component filenames (e.g., `UserAvatar.tsx`). While valid, `kebab-case` is safer for cross-platform compatibility and URL consistency. Choose one and strictly enforce it.

### Code Identifiers

| Type                 | Convention                 | Example                           |
| :------------------- | :------------------------- | :-------------------------------- |
| **React Components** | `PascalCase`               | `export function UserAvatar() {}` |
| **Functions**        | `camelCase`                | `function formatDate() {}`        |
| **Variables**        | `camelCase`                | `const isLoading = true;`         |
| **Constants**        | `UPPER_SNAKE_CASE`         | `const MAX_RETRIES = 3;`          |
| **Types/Interfaces** | `PascalCase`               | `interface UserProfile {}`        |
| **Custom Hooks**     | `camelCase` (prefix `use`) | `function useAuth() {}`           |

### Component Props

- Boolean props should use auxiliary verbs (is, has, should).
  - ✅ `isOpen`, `hasError`, `shouldRender`
  - ❌ `open`, `error`, `render`
- Event handlers should start with `on`.
  - ✅ `onClick`, `onSubmit`

---

## 4. Best Practices Checklist

- [ ] **Use `src/`:** Protects your code from root-level clutter.
- [ ] **Colocation:** Keep things as close as possible to where they are used.
- [ ] **Barrel Files (index.ts):** Use sparingly. They can obscure dependency trees and slow down compilation. Prefer direct imports in modern bundlers unless necessary for a library interface.
- [ ] **Absolute Imports:** Configure `tsconfig.json` to allow absolute imports (e.g., `import Button from "@/components/ui/button"`).
  ```json
  "paths": {
    "@/*": ["./src/*"]
  }
  ```
- [ ] **Server Actions:** Co-locate server actions within the feature folder or next to the form that uses them, or in a dedicated `actions.ts` file within the feature.
