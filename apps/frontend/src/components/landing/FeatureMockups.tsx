import React from 'react';
import { ServerIcon, CheckCircleIcon, DatabaseIcon, RefreshCwIcon } from 'lucide-react';

export const RancherClustersMockup: React.FC = () => {
  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Rancher Sites</h3>
        <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium">
          + Add Rancher Site
        </button>
      </div>

      {/* Sites List */}
      <div className="space-y-3">
        {[
          { name: 'Production Cluster', url: 'https://rancher.prod.example.com', status: 'Connected' },
          { name: 'Staging Cluster', url: 'https://rancher.staging.example.com', status: 'Connected' },
          { name: 'Development Cluster', url: 'https://rancher.dev.example.com', status: 'Connected' },
        ].map((site, index) => (
          <div key={index} className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ServerIcon className="w-5 h-5 text-blue-600" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{site.name}</h4>
                  <p className="text-sm text-gray-500 font-mono">{site.url}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" aria-hidden="true" />
                    <span className="text-xs text-green-600 font-medium">{site.status}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="text-blue-600 text-sm font-medium">Edit</button>
                <button className="text-gray-400 text-sm">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const EnvironmentComparisonMockup: React.FC = () => {
  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Compare Environments</h3>
        <div className="flex gap-4">
          <select className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm bg-white">
            <option>Staging - API Gateway</option>
          </select>
          <div className="flex items-center">
            <RefreshCwIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
          </div>
          <select className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm bg-white">
            <option>Production - API Gateway</option>
          </select>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Service</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Staging</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Production</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-4 py-3 font-medium text-gray-900">api-gateway</td>
              <td className="px-4 py-3 font-mono text-xs text-gray-600">v2.1.4</td>
              <td className="px-4 py-3 font-mono text-xs text-gray-600">v2.1.3</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                  Different
                </span>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium text-gray-900">auth-service</td>
              <td className="px-4 py-3 font-mono text-xs text-gray-600">v1.8.2</td>
              <td className="px-4 py-3 font-mono text-xs text-gray-600">v1.8.2</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                  Synced
                </span>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium text-gray-900">database</td>
              <td className="px-4 py-3 font-mono text-xs text-gray-600">v3.2.1</td>
              <td className="px-4 py-3 font-mono text-xs text-gray-600">v3.2.0</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                  Different
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium">
          Sync Selected Services
        </button>
      </div>
    </div>
  );
};

export const HarborRegistryMockup: React.FC = () => {
  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Harbor Registry Browser</h3>
        <div className="text-sm text-gray-600">
          <span className="font-medium">Registry:</span> harbor.prod.example.com
        </div>
      </div>

      {/* Repository List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="font-medium text-gray-700">backend/api-gateway</div>
            <div className="text-sm text-gray-500">12 tags</div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {[
            { tag: 'v2.1.4', size: '245 MB', date: '2 days ago', latest: true },
            { tag: 'v2.1.3', size: '243 MB', date: '1 week ago', latest: false },
            { tag: 'v2.1.2', size: '242 MB', date: '2 weeks ago', latest: false },
          ].map((image, index) => (
            <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <DatabaseIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-gray-900">{image.tag}</span>
                      {image.latest && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          latest
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span>{image.size}</span>
                      <span>{image.date}</span>
                    </div>
                  </div>
                </div>
                <button className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700">
                  Deploy
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ConfigMapSyncMockup: React.FC = () => {
  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">ConfigMap Comparison</h3>
        <div className="flex gap-4 text-sm">
          <div className="flex-1">
            <div className="font-medium text-gray-700 mb-1">Source</div>
            <div className="text-gray-600">Staging - api-config</div>
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-700 mb-1">Target</div>
            <div className="text-gray-600">Production - api-config</div>
          </div>
        </div>
      </div>

      {/* ConfigMap Diff */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-8 px-4 py-3">
                <input type="checkbox" className="rounded border-gray-300" />
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Key</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Staging</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Production</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr className="bg-yellow-50">
              <td className="px-4 py-3">
                <input type="checkbox" className="rounded border-gray-300" defaultChecked />
              </td>
              <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">API_TIMEOUT</td>
              <td className="px-4 py-3 font-mono text-xs text-gray-600">30000</td>
              <td className="px-4 py-3 font-mono text-xs text-gray-600">20000</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                  Different
                </span>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3">
                <input type="checkbox" className="rounded border-gray-300" />
              </td>
              <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">LOG_LEVEL</td>
              <td className="px-4 py-3 font-mono text-xs text-gray-600">debug</td>
              <td className="px-4 py-3 font-mono text-xs text-gray-600">info</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                  Different
                </span>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3">
                <input type="checkbox" className="rounded border-gray-300" />
              </td>
              <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">MAX_CONNECTIONS</td>
              <td className="px-4 py-3 font-mono text-xs text-gray-600">100</td>
              <td className="px-4 py-3 font-mono text-xs text-gray-600">100</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                  Synced
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex gap-3">
        <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium">
          Sync Selected Keys
        </button>
        <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium">
          Sync All
        </button>
      </div>
    </div>
  );
};
