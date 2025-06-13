import { Card } from "antd";
import type { Service, AppInstance } from "../../types";

interface ServiceStatsProps {
  services: Service[];
  filteredServices: Service[];
  selectedServices: Service[];
  appInstances: AppInstance[];
}

export function ServiceStats({
  services,
  filteredServices,
  selectedServices,
  appInstances,
}: ServiceStatsProps) {
  const runningServicesCount =
    services?.filter((s) => s.status.toLowerCase() === "running").length || 0;

  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      <Card size="small">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {services?.length || 0}
          </div>
          <div className="text-sm text-gray-600">Total Services</div>
        </div>
      </Card>

      <Card size="small">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {runningServicesCount}
          </div>
          <div className="text-sm text-gray-600">Running</div>
        </div>
      </Card>

      <Card size="small">
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {filteredServices.length}
          </div>
          <div className="text-sm text-gray-600">Filtered</div>
        </div>
      </Card>

      <Card size="small">
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {selectedServices.length}
          </div>
          <div className="text-sm text-gray-600">Selected</div>
        </div>
      </Card>

      <Card size="small">
        <div className="text-center">
          <div className="text-2xl font-bold text-indigo-600">
            {appInstances?.length || 0}
          </div>
          <div className="text-sm text-gray-600">App Instances</div>
        </div>
      </Card>
    </div>
  );
}
