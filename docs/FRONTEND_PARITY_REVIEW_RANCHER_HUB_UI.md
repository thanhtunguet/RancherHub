# Frontend Parity Review: `apps/rancher-hub-ui` vs `apps/frontend`

Date: February 27, 2026  
Project: RancherHub

## Scope

- Reviewed functional parity between:
  - Old frontend: `apps/frontend` (React + Ant Design)
  - New frontend: `apps/rancher-hub-ui` (React + shadcn/ui)
- Focused on:
  - Route and feature coverage
  - API contract correctness
  - Behavior regressions in high-risk flows (sync, auth/2FA, monitoring, configmaps/secrets, harbor browser)

## Findings (Ordered by Severity)

### 1. Resolved (February 27, 2026): Compare sync now sends real service IDs

- Compare selection now maps selected service names to source service IDs before sync request.
- Only syncable rows (services present in source) are selectable.
- Sync payload now consistently sends real IDs in `serviceIds`.

Evidence:
- Updated compare/sync flow: `apps/rancher-hub-ui/src/pages/Services.tsx`
- Backend requirement remains: `apps/backend/src/modules/services/dto/sync-services.dto.ts`
- Sync lookup by ID remains: `apps/backend/src/modules/services/services.service/sync-single-service.ts`

Outcome:
- Compare-mode sync no longer sends service names as IDs.

---

### 2. Resolved (February 27, 2026): Generic cluster active toggle now sends `active` body and supports deactivate

- New frontend now sends `{ active: boolean }` to `POST /api/generic-clusters/:id/set-active`.
- Generic cluster page now supports both activate and deactivate flows explicitly.
- Toggle action now has loading state and clearer action feedback.

Evidence:
- Updated repository payload: `apps/rancher-hub-ui/src/repositories/generic-clusters.repository.ts`
- Updated toggle behavior/UI: `apps/rancher-hub-ui/src/pages/GenericClusters.tsx`
- Backend contract (unchanged): `apps/backend/src/modules/generic-cluster-sites/generic-cluster-sites.controller.ts`

Outcome:
- Active state updates are now aligned with backend API contract.

---

### 3. Resolved (February 27, 2026): Harbor endpoint path params URL-encoded

- Harbor repository methods now URL-encode `projectName`, `repositoryName`, and `tag`.
- Behavior is aligned with old frontend endpoint construction.

Evidence:
- Updated: `apps/rancher-hub-ui/src/repositories/harbor-sites.repository.ts`
- Baseline reference: `apps/frontend/src/services/api.ts`

Outcome:
- Harbor browse/tag-detail requests are safe for names containing `/`, spaces, `%`, `+`, etc.

---

### 4. Resolved (February 27, 2026): Trusted device login flow parity restored

- New login now sends `trustDevice`, `deviceFingerprint`, `deviceName`, and `userAgent` in the auth flow.
- OTP step now exposes “Trust this device for 30 days”.
- Device fingerprint generation has been restored in new frontend utility code.

Evidence:
- Updated login page: `apps/rancher-hub-ui/src/pages/Login.tsx`
- New utility: `apps/rancher-hub-ui/src/lib/device-fingerprint.ts`
- DTO supports fields: `apps/rancher-hub-ui/src/api/types.ts`

Outcome:
- Trusted-device lifecycle parity is restored for login/2FA flow.

---

### 5. Resolved (February 27, 2026): ConfigMap/Secret sync actions restored in new UI

- Compare mode now exposes `Sync Selected` for ConfigMaps and Secrets.
- Sync calls now execute through `syncKey` / `syncKeys` with source/target app-instance payloads.
- Selection is restricted to syncable rows (source exists and row is not identical).

Evidence:
- Updated compare/sync flow: `apps/rancher-hub-ui/src/pages/ConfigMaps.tsx`
- Updated compare/sync flow: `apps/rancher-hub-ui/src/pages/Secrets.tsx`
- Typed sync/detail contracts: `apps/rancher-hub-ui/src/api/types.ts`
- Repository typing + usage: `apps/rancher-hub-ui/src/repositories/configmaps.repository.ts`, `apps/rancher-hub-ui/src/repositories/secrets.repository.ts`
- Detail rendering normalized to key/value map (values masked for Secrets): `apps/rancher-hub-ui/src/components/CompareDetailDialog.tsx`

Outcome:
- ConfigMap/Secret write-path parity is restored for key synchronization from source to target.

---

### 6. Resolved (February 27, 2026): Monitoring instance lifecycle parity restored

- Monitoring page now supports edit, delete, and enable/disable toggle for monitored instances.
- Create/edit dialog is unified and delete is protected with confirmation.

Evidence:
- Updated: `apps/rancher-hub-ui/src/pages/Monitoring.tsx`
- Previous baseline: `apps/frontend/src/pages/MonitoredInstancesPage.tsx`

Outcome:
- Core monitored-instance lifecycle actions are now available in the new frontend.

---

### 7. Resolved (February 27, 2026): Storage view restored in new frontend

- Added a dedicated Storage View page in new UI style.
- Restored `/storage` route and sidebar navigation entry.
- Reused existing storage API workflow (`getAppInstancesTree`, `getWithImageSizes`) with summary + table view.

Evidence:
- New page: `apps/rancher-hub-ui/src/pages/Storage.tsx`
- Route restored: `apps/rancher-hub-ui/src/App.tsx`
- Navigation restored: `apps/rancher-hub-ui/src/components/layout/AppLayout.tsx`

Outcome:
- Storage feature parity is restored and available from the new frontend navigation.

---

### 8. Medium: Workspace/CI scripts still wired to old frontend app

- Root workspace and scripts reference `apps/frontend`, not `apps/rancher-hub-ui`.

Evidence:
- Root `package.json` workspaces/scripts.

Impact:
- New frontend may not be covered by existing root lint/test pipelines.

## Validation Results

Executed in `apps/rancher-hub-ui`:

- Type check: `npx tsc -p tsconfig.app.json --noEmit`  
  - Result: Passed
- Lint: `npm run lint`  
  - Result: Failed (`17 errors`, `27 warnings`)
  - Main errors include `no-explicit-any`, `no-empty-object-type`, and Tailwind config import rule issues.

## Notes

- Endpoint coverage at repository layer is mostly present.
- Remaining parity gap in this review: workspace/CI scripts still target `apps/frontend`.
