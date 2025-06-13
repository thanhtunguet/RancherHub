import { useState, useMemo } from 'react';
import { 
  Button, 
  Row, 
  Col, 
  Input, 
  Select, 
  Space, 
  Typography, 
  Alert, 
  Spin, 
  Empty,
  Modal,
  Card
} from 'antd';
import { SearchOutlined, SyncOutlined, HistoryOutlined } from '@ant-design/icons';
import { RefreshCwIcon, GitBranchIcon } from 'lucide-react';
import { ServiceCard } from './ServiceCard';
import { SyncModal } from './SyncModal';
import { useServices, useSyncHistory } from '../../hooks/useServices';
import { useEnvironments } from '../../hooks/useEnvironments';
import { useAppStore } from '../../stores/useAppStore';
import type { Service } from '../../types';

const { Title, Text } = Typography;
const { Option } = Select;

export function ServiceManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { selectedEnvironment } = useAppStore();
  const { data: environments } = useEnvironments();
  const { data: services, isLoading, error, refetch } = useServices(selectedEnvironment?.id);
  const { data: syncHistory, isLoading: historyLoading } = useSyncHistory(selectedEnvironment?.id);

  // Filter services based on search and status
  const filteredServices = useMemo(() => {
    if (!services) return [];

    return services.filter(service => {
      const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           service.imageTag?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
                           service.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [services, searchTerm, statusFilter]);

  // Get unique statuses for filter
  const availableStatuses = useMemo(() => {
    if (!services) return [];
    
    const statuses = [...new Set(services.map(s => s.status))];
    return statuses.sort();
  }, [services]);

  const handleServiceSelect = (service: Service) => {
    setSelectedServices(prev => {
      const isSelected = prev.some(s => s.id === service.id);
      if (isSelected) {
        return prev.filter(s => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedServices.length === filteredServices.length) {
      setSelectedServices([]);
    } else {
      setSelectedServices([...filteredServices]);
    }
  };

  const handleSync = () => {
    if (selectedServices.length === 0) {
      return;
    }
    setShowSyncModal(true);
  };

  const handleRefresh = () => {
    refetch();
  };

  if (!selectedEnvironment) {
    return (
      <div className="p-6">
        <Alert
          message="No Environment Selected"
          description="Please select an environment from the Environments page to view services."
          type="info"
          showIcon
          action={
            <Button type="primary" href="/environments">
              Go to Environments
            </Button>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert
          message="Error Loading Services"
          description="There was an error loading services. Please try again."
          type="error"
          showIcon
          action={
            <Button onClick={handleRefresh}>
              <RefreshCwIcon size={16} />
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Title level={2} className="mb-1">Services</Title>
            <Text className="text-gray-600">
              Environment: <span className="font-medium">{selectedEnvironment.name}</span>
            </Text>
          </div>
          
          <Space>
            <Button 
              icon={<HistoryOutlined />}
              onClick={() => setShowHistory(true)}
            >
              Sync History
            </Button>
            <Button 
              icon={<RefreshCwIcon size={16} />}
              onClick={handleRefresh}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<SyncOutlined />}
              disabled={selectedServices.length === 0}
              onClick={handleSync}
            >
              Sync Selected ({selectedServices.length})
            </Button>
          </Space>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-4">
          <Input
            placeholder="Search services..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          
          <Select
            placeholder="Filter by status"
            value={statusFilter}
            onChange={setStatusFilter}
            className="w-48"
          >
            <Option value="all">All Statuses</Option>
            {availableStatuses.map(status => (
              <Option key={status} value={status}>
                {status}
              </Option>
            ))}
          </Select>

          <Button 
            onClick={handleSelectAll}
            disabled={filteredServices.length === 0}
          >
            {selectedServices.length === filteredServices.length ? 'Deselect All' : 'Select All'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card size="small">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{services?.length || 0}</div>
              <div className="text-sm text-gray-600">Total Services</div>
            </div>
          </Card>
          
          <Card size="small">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {services?.filter(s => s.status.toLowerCase() === 'running').length || 0}
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
        </div>
      </div>

      {/* Services Grid */}
      {filteredServices.length > 0 ? (
        <Row gutter={[16, 16]}>
          {filteredServices.map((service) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={service.id}>
              <ServiceCard
                service={service}
                selected={selectedServices.some(s => s.id === service.id)}
                onSelect={handleServiceSelect}
              />
            </Col>
          ))}
        </Row>
      ) : (
        <Empty
          image={<GitBranchIcon size={64} className="mx-auto text-gray-400" />}
          description={
            <div className="text-center">
              <p className="text-gray-500 mb-2">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No services match your filters' 
                  : 'No services found in this environment'
                }
              </p>
              <p className="text-gray-400 text-sm">
                {!searchTerm && statusFilter === 'all' 
                  ? 'Make sure you have app instances configured for this environment'
                  : 'Try adjusting your search or filter criteria'
                }
              </p>
            </div>
          }
        />
      )}

      {/* Sync Modal */}
      <SyncModal
        open={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        selectedServices={selectedServices}
        sourceEnvironment={selectedEnvironment}
        environments={environments || []}
        onSuccess={() => {
          setSelectedServices([]);
          setShowSyncModal(false);
        }}
      />

      {/* Sync History Modal */}
      <Modal
        title="Synchronization History"
        open={showHistory}
        onCancel={() => setShowHistory(false)}
        footer={null}
        width={800}
      >
        {historyLoading ? (
          <div className="flex justify-center p-8">
            <Spin size="large" />
          </div>
        ) : (
          <div className="space-y-4">
            {syncHistory && syncHistory.length > 0 ? (
              syncHistory.map((operation) => (
                <Card key={operation.id} size="small">
                  <div className="flex items-center justify-between">
                    <div>
                      <Text strong>Operation {operation.id.slice(0, 8)}</Text>
                      <div className="text-sm text-gray-600">
                        {operation.serviceIds.length} services • {operation.status}
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      {new Date(operation.startTime).toLocaleString()}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Empty description="No sync history found" />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}