import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ServicesPage from './Services';

const {
  sourceInstance,
  targetInstanceA,
  targetInstanceB,
  mockCompareByInstance,
  mockGetByAppInstance,
  mockSyncServices,
  mockGetImageTags,
  mockUpdateServiceImage,
  mockToast,
} = vi.hoisted(() => ({
  sourceInstance: {
    id: 'src-app-1',
    name: 'source-app',
    environmentId: 'env-src',
    cluster: 'c1',
    namespace: 'ns',
    clusterType: 'rancher',
  },
  targetInstanceA: {
    id: 'tgt-app-a',
    name: 'target-app-a',
    environmentId: 'env-tgt-a',
    cluster: 'c2',
    namespace: 'ns',
    clusterType: 'rancher',
  },
  targetInstanceB: {
    id: 'tgt-app-b',
    name: 'target-app-b',
    environmentId: 'env-tgt-b',
    cluster: 'c3',
    namespace: 'ns',
    clusterType: 'rancher',
  },
  mockCompareByInstance: vi.fn(),
  mockGetByAppInstance: vi.fn(),
  mockSyncServices: vi.fn(),
  mockGetImageTags: vi.fn(),
  mockUpdateServiceImage: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock('@/repositories/services.repository', () => ({
  ServicesRepository: {
    compareByInstance: mockCompareByInstance,
    getByAppInstance: mockGetByAppInstance,
    syncServices: mockSyncServices,
    getImageTags: mockGetImageTags,
    updateServiceImage: mockUpdateServiceImage,
  },
}));

vi.mock('@/repositories/harbor-sites.repository', () => ({
  HarborSitesRepository: {
    getActiveSite: vi.fn(),
    getArtifacts: vi.fn(),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/components/InstanceSelector', () => ({
  InstanceSelector: ({ onSelectionChange }: { onSelectionChange: (source: any, target: any) => void }) => (
    <div>
      <button data-testid="select-single" onClick={() => onSelectionChange(sourceInstance, null)}>
        select-single
      </button>
      <button data-testid="select-compare-a" onClick={() => onSelectionChange(sourceInstance, targetInstanceA)}>
        select-compare-a
      </button>
      <button data-testid="select-compare-b" onClick={() => onSelectionChange(sourceInstance, targetInstanceB)}>
        select-compare-b
      </button>
    </div>
  ),
}));

vi.mock('@/components/CompareDetailDialog', () => ({
  CompareDetailDialog: () => null,
}));

vi.mock('@/components/IconButton', () => ({
  IconButton: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={!!checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  ),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h3>{children}</h3>,
  AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogAction: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  AlertDialogCancel: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

function makeCompareResult(serviceName: string) {
  return {
    summary: {
      totalServices: 1,
      identical: 0,
      different: 1,
      missingInSource: 0,
      missingInTarget: 0,
    },
    comparisons: [
      {
        serviceName,
        status: 'different',
        workloadType: 'Deployment',
        source: { imageTag: 'v1', status: 'running' },
        target: { imageTag: 'v2', status: 'running' },
        differences: { imageTag: { source: 'v1', target: 'v2' } },
      },
    ],
  };
}

describe('ServicesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetByAppInstance.mockResolvedValue([]);
    mockCompareByInstance.mockResolvedValue(makeCompareResult('svc-a'));
    mockSyncServices.mockResolvedValue({ status: 'completed' });
    mockGetImageTags.mockResolvedValue([]);
    mockUpdateServiceImage.mockResolvedValue({ success: true });
  });

  it('shows Sync Selected only when at least one service is selected', async () => {
    mockGetByAppInstance.mockResolvedValue([{ id: 'src-svc-1', name: 'svc-a' }]);

    render(<ServicesPage />);

    fireEvent.click(screen.getByTestId('select-compare-a'));

    await waitFor(() => {
      expect(screen.getByText('svc-a')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /sync selected/i })).toBeNull();

    fireEvent.click(screen.getByRole('checkbox'));

    expect(screen.getByRole('button', { name: /sync selected/i })).toBeInTheDocument();
  });

  it('builds sync DTO from source/target instances and selected source service IDs', async () => {
    mockGetByAppInstance.mockResolvedValue([{ id: 'src-svc-1', name: 'svc-a' }]);

    render(<ServicesPage />);

    fireEvent.click(screen.getByTestId('select-compare-a'));

    await waitFor(() => {
      expect(screen.getByText('svc-a')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /sync selected/i }));
    fireEvent.click(screen.getByRole('button', { name: /sync now/i }));

    await waitFor(() => {
      expect(mockSyncServices).toHaveBeenCalledTimes(1);
    });

    expect(mockSyncServices).toHaveBeenCalledWith({
      sourceEnvironmentId: 'env-src',
      targetEnvironmentId: 'env-tgt-a',
      serviceIds: ['src-svc-1'],
      targetAppInstanceIds: ['tgt-app-a'],
    });
  });

  it('shows partial-sync toast message when sync response status is partial', async () => {
    mockGetByAppInstance.mockResolvedValue([{ id: 'src-svc-1', name: 'svc-a' }]);
    mockSyncServices.mockResolvedValue({ status: 'partial' });

    render(<ServicesPage />);

    fireEvent.click(screen.getByTestId('select-compare-a'));

    await waitFor(() => {
      expect(screen.getByText('svc-a')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /sync selected/i }));
    fireEvent.click(screen.getByRole('button', { name: /sync now/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Sync completed with errors',
        })
      );
    });
  });

  it('clears selected services when instance selection changes', async () => {
    mockCompareByInstance
      .mockResolvedValueOnce(makeCompareResult('svc-a'))
      .mockResolvedValueOnce(makeCompareResult('svc-b'));

    mockGetByAppInstance
      .mockResolvedValueOnce([{ id: 'src-svc-1', name: 'svc-a' }])
      .mockResolvedValueOnce([{ id: 'src-svc-2', name: 'svc-b' }]);

    render(<ServicesPage />);

    fireEvent.click(screen.getByTestId('select-compare-a'));

    await waitFor(() => {
      expect(screen.getByText('svc-a')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('checkbox'));

    expect(screen.getByText(/1 service\(s\) selected/i)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('select-compare-b'));

    await waitFor(() => {
      expect(screen.getByText('svc-b')).toBeInTheDocument();
    });

    expect(screen.queryByText(/service\(s\) selected/i)).toBeNull();
  });
});
