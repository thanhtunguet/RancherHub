import React from 'react';
import type { PropsWithChildren, ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import StoragePage from './Storage';
import type { AppInstanceTreeItem } from '@/api/types';

const { mockGetAppInstancesTree, mockGetWithImageSizes, mockToast } = vi.hoisted(() => ({
  mockGetAppInstancesTree: vi.fn(),
  mockGetWithImageSizes: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock('@/repositories/services.repository', () => ({
  ServicesRepository: {
    getAppInstancesTree: mockGetAppInstancesTree,
    getWithImageSizes: mockGetWithImageSizes,
  },
}));

vi.mock('@/repositories/harbor-sites.repository', () => ({
  HarborSitesRepository: {
    getActiveSite: vi.fn(),
    testImageSize: vi.fn(),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

type PassthroughProps = PropsWithChildren<{ placeholder?: ReactNode }>;

// Radix Select renders its content in a closed portal in jsdom, so the tree
// options are never in the DOM. Render them inline for assertions.
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: PassthroughProps) => <div>{children}</div>,
  SelectTrigger: ({ children }: PassthroughProps) => <div>{children}</div>,
  SelectValue: ({ placeholder }: PassthroughProps) => <span>{placeholder}</span>,
  SelectContent: ({ children }: PassthroughProps) => <div>{children}</div>,
  SelectGroup: ({ children }: PassthroughProps) => <div>{children}</div>,
  SelectLabel: ({ children }: PassthroughProps) => <div>{children}</div>,
  SelectItem: ({ children }: PassthroughProps) => <div>{children}</div>,
}));

describe('StoragePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWithImageSizes.mockResolvedValue([]);
  });

  it('does not crash when an environment omits appInstances (backend parity regression)', async () => {
    // Older Go backends dropped the appInstances key entirely, which made
    // env.appInstances.find(...) throw during render.
    mockGetAppInstancesTree.mockResolvedValue([
      { id: 'env-1', name: 'Empty', appInstances: undefined },
    ]);

    render(<StoragePage />);

    expect(await screen.findByText('Storage View')).toBeInTheDocument();
    await waitFor(() => expect(mockGetAppInstancesTree).toHaveBeenCalled());
  });

  it('falls back to an empty tree when the response is not an array', async () => {
    mockGetAppInstancesTree.mockResolvedValue(null);

    render(<StoragePage />);

    expect(await screen.findByText('Storage View')).toBeInTheDocument();
    expect(await screen.findByText('No app instances available')).toBeInTheDocument();
  });

  it('renders app instances from a well-formed tree', async () => {
    mockGetAppInstancesTree.mockResolvedValue([
      {
        id: 'env-1',
        name: 'Production',
        appInstances: [
          {
            id: 'app-1',
            name: 'web',
            cluster: 'c-1',
            namespace: 'default',
            rancherSite: { id: 'site-1', name: 'Rancher' },
          },
        ],
      },
    ] satisfies AppInstanceTreeItem[]);

    render(<StoragePage />);

    expect(await screen.findByText('Production')).toBeInTheDocument();
  });
});
