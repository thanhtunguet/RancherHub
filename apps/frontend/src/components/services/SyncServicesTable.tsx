import Typography from "antd/es/typography";
import Table from "antd/es/table";
import type { Service } from "../../types";

const { Text } = Typography;

interface SyncServicesTableProps {
  selectedServices: Service[];
  targetInstanceCount: number;
  getClusterDisplayName: (cluster?: string) => string;
  getImageVersion: (imageTag?: string) => string;
}

export function SyncServicesTable({
  selectedServices,
  targetInstanceCount,
  getClusterDisplayName,
  getImageVersion,
}: SyncServicesTableProps) {
  return (
    <div>
      <Text strong className="block mb-3">
        Services to be Synchronized
      </Text>
      <div className="border rounded overflow-hidden">
        <Table
          dataSource={selectedServices}
          pagination={false}
          size="small"
          rowKey="id"
          scroll={{ x: "max-content" }}
          columns={[
            {
              title: "Service Name",
              dataIndex: "name",
              key: "name",
              width: 200,
              render: (name: string, service: Service) => (
                <div>
                  <div className="font-medium truncate" title={name}>
                    {name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {service.workloadType}
                  </div>
                </div>
              ),
            },
            {
              title: "Current Version",
              dataIndex: "imageTag",
              key: "imageTag",
              width: 120,
              render: (tag: string) => (
                <code
                  className="text-xs bg-gray-100 px-2 py-1 rounded"
                  title={tag}
                >
                  {getImageVersion(tag)}
                </code>
              ),
            },
            {
              title: "Source Instance",
              key: "sourceInstance",
              width: 180,
              render: (_: any, service: Service) => {
                const sourceAppInstance = service.appInstance;
                return (
                  <div>
                    <div
                      className="font-medium text-sm truncate"
                      title={sourceAppInstance?.name}
                    >
                      {sourceAppInstance?.name || "Unknown"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {getClusterDisplayName(sourceAppInstance?.cluster)}/{sourceAppInstance?.namespace}
                    </div>
                  </div>
                );
              },
            },
            {
              title: "Will Deploy To",
              key: "targetInstances",
              width: 150,
              render: () => (
                <div className="text-sm">
                  <div className="text-green-600 font-medium">
                    All {targetInstanceCount} selected
                  </div>
                  <div className="text-xs text-gray-500">
                    {targetInstanceCount} ops/service
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
