# Development Context

## Project Overview
**Rancher Hub** - Service Sync Manager for managing and synchronizing services across different environments in Rancher clusters.

## Development Notes
- Uses SQLite for development, PostgreSQL ready for production
- All APIs documented with Swagger/OpenAPI
- Real-time updates with React Query caching
- Comprehensive error handling and logging
- Mock data available for development without real Rancher

## Coding Standards (CRITICAL - MUST FOLLOW)

### Ant Design Import Rules ⚠️

**ALWAYS use path imports. NEVER use barrel imports.**

❌ **WRONG - DO NOT USE:**
```typescript
import { Button, Modal, Form } from 'antd';
```

✅ **CORRECT - ALWAYS USE:**
```typescript
import Button from 'antd/es/button';
import Modal from 'antd/es/modal';
import Form from 'antd/es/form';
```

**Why this matters:**
- Reduces initial bundle size by ~87% (from 498 kB to 61 kB gzipped)
- Enables better tree-shaking and code splitting
- Improves initial page load performance significantly
- Maintains consistency across the entire codebase

**Common component mappings:**
- `Button` → `antd/es/button`
- `Modal` → `antd/es/modal`
- `Form` → `antd/es/form`
- `Input` → `antd/es/input`
- `Select` → `antd/es/select`
- `Table` → `antd/es/table`
- `message` → `antd/es/message`
- `notification` → `antd/es/notification`
- `Typography` → `antd/es/typography`
- `Card` → `antd/es/card`
- `Space` → `antd/es/space`
- `Spin` → `antd/es/spin`
- `Tooltip` → `antd/es/tooltip`
- `Dropdown` → `antd/es/dropdown`
- For kebab-case: `DatePicker` → `antd/es/date-picker`, `InputNumber` → `antd/es/input-number`

**This rule applies to:**
- All new code
- All modified files
- Any file you touch for any reason

**Violation of this rule will require immediate refactoring.**

## Testing

You MUST ensure:

- Both backend and frontend build successfully
- All TypeScript compilation passes
- API endpoints tested and functional
- UI components rendering correctly

## Don't

During development, I will run development server by myself. Therefore, you don't:

- Run dev server to test the code.
- Build the project because it will override development artifacts

To test your code, run type checking and eslint only. For complex tasks, you may need to write a test case to test it.

## Documentation

- Keep documentation UP-TO-DATE
- Whenever you make a change or finish a task, check for @docs/CURRENT_STATUS.md and @docs/ROADMAP.md to update the technical document status and roadmap accordingly. If the changes can be see on the UI or affect backend APIs, consider asking me to allow you to update them in project README, too.
