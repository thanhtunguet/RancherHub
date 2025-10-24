# Rancher Hub - Task Completion Checklist

## When a coding task is completed, run these commands:

### 1. Linting (Required)
```bash
# Lint both applications
npm run lint

# OR individually:
npm run lint:backend
npm run lint:frontend
```

### 2. Type Checking
```bash
# Backend type checking (via build)
cd apps/backend && npm run build

# Frontend type checking (via build)  
cd apps/frontend && npm run build

# OR build both
npm run build
```

### 3. Testing (Recommended)
```bash
# Run all tests
npm run test

# OR individually:
npm run test:backend
npm run test:frontend
```

### 4. Formatting (Optional but recommended)
```bash
# Backend formatting
cd apps/backend && npm run format
```

### 5. Development Server Verification
```bash
# Ensure both servers start successfully
npm run dev

# Verify endpoints:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:3000
# - API Docs: http://localhost:3000/api/docs
```

## Error Resolution
- **ESLint errors**: Fix code style issues, disable rules only if necessary
- **TypeScript errors**: Ensure proper typing, avoid `any` unless documented
- **Build failures**: Check imports, dependencies, and TypeScript configuration
- **Test failures**: Update tests or fix implementation as needed

## Pre-commit Checklist
- [ ] Code builds without errors
- [ ] ESLint passes with no errors
- [ ] Tests pass (if applicable to changes)
- [ ] Development servers start successfully
- [ ] No console errors in browser/terminal

## Notes
- Use `npm run lint` rather than individual linting commands when possible
- TypeScript strict mode is enabled - address all type errors
- Both backend and frontend must build successfully before considering task complete