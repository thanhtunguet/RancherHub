import React, { useState } from 'react';
import { Modal, Typography, Tag, Button, message, Tooltip } from 'antd';
import { RefreshCwIcon, MaximizeIcon, MinimizeIcon } from 'lucide-react';
import MonacoDiffViewer from '../common/MonacoDiffViewer';
import type { ConfigMapKeyComparison } from '../../types';

const { Title, Text } = Typography;

interface ConfigMapKeyDiffModalProps {
  open: boolean;
  onClose: () => void;
  keyComparison: ConfigMapKeyComparison | null;
  configMapName: string;
  sourceInstanceName: string;
  targetInstanceName: string;
  onSync?: (key: string, value: string) => Promise<void>;
  syncLoading?: boolean;
}

const ConfigMapKeyDiffModal: React.FC<ConfigMapKeyDiffModalProps> = ({
  open,
  onClose,
  keyComparison,
  configMapName,
  sourceInstanceName,
  targetInstanceName,
  onSync,
  syncLoading = false,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!keyComparison) return null;

  const getStatusTag = () => {
    if (keyComparison.identical) {
      return <Tag color="green">Identical</Tag>;
    }
    if (keyComparison.missingInSource) {
      return <Tag color="red">Missing in Source</Tag>;
    }
    if (keyComparison.missingInTarget) {
      return <Tag color="orange">Missing in Target</Tag>;
    }
    if (keyComparison.isDifferent) {
      return <Tag color="blue">Different</Tag>;
    }
    return <Tag>Unknown</Tag>;
  };

  const handleCopyOriginal = () => {
    message.success('Original value copied to clipboard');
  };

  const handleCopyModified = () => {
    message.success('Modified value copied to clipboard');
  };

  const handleSync = async () => {
    if (!onSync || !keyComparison.sourceValue) return;

    Modal.confirm({
      title: 'Confirm Sync Operation',
      content: (
        <div>
          <p><strong>Are you sure you want to sync this key?</strong></p>
          <p><strong>Key:</strong> <code>{keyComparison.key}</code></p>
          <p><strong>ConfigMap:</strong> {configMapName}</p>
          <p><strong>Direction:</strong> {sourceInstanceName} → {targetInstanceName}</p>
          <div style={{ 
            marginTop: '12px', 
            padding: '8px', 
            backgroundColor: '#fff7e6', 
            border: '1px solid #ffd591', 
            borderRadius: '4px' 
          }}>
            <Text type="warning">
              <strong>Warning:</strong> This will overwrite the target value and cannot be undone.
            </Text>
          </div>
        </div>
      ),
      okText: 'Yes, Sync Now',
      cancelText: 'Cancel',
      okType: 'primary',
      width: 500,
      onOk: async () => {
        try {
          await onSync(keyComparison.key, keyComparison.sourceValue!);
          onClose();
        } catch (error) {
          // Error handling is done in parent component
        }
      },
    });
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <Modal
      title={
        <div className="p-4">
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Key Diff: {keyComparison.key}
            </Title>
            <div className="mt-1">
              {getStatusTag()}
            </div>
          </div>
          <div className="mt-2">
            <Text type="secondary">
              ConfigMap: {configMapName}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {sourceInstanceName} → {targetInstanceName}
            </Text>
          </div>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={isFullscreen ? '100vw' : 1200}
      centered={!isFullscreen}
      style={
        isFullscreen 
          ? { 
              top: 0, 
              padding: 0, 
              maxWidth: '100vw', 
              height: '100vh',
              margin: 0,
            } 
          : {}
      }
      styles={{
        body: isFullscreen ? { padding: '24px', height: 'calc(100vh - 110px)' } : {},
        content: isFullscreen ? { height: '100vh', padding: 0 } : {},
      }}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Tooltip key="fullscreen" title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
          <Button 
            icon={isFullscreen ? <MinimizeIcon size={14} /> : <MaximizeIcon size={14} />} 
            onClick={handleToggleFullscreen}
            type="default"
          >
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </Button>
        </Tooltip>,
        keyComparison.sourceValue && !keyComparison.identical && (
          <Button
            key="sync"
            type="primary"
            icon={<RefreshCwIcon size={16} />}
            onClick={handleSync}
            loading={syncLoading}
          >
            Sync from Source to Target
          </Button>
        ),
      ].filter(Boolean)}
      destroyOnClose
      maskClosable={!isFullscreen}
      zIndex={isFullscreen ? 1050 : 1000}
    >
      <div>
        {!keyComparison.sourceValue && !keyComparison.targetValue ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Text type="secondary">No values to compare</Text>
          </div>
        ) : (
          <MonacoDiffViewer
            original={keyComparison.sourceValue || ''}
            modified={keyComparison.targetValue || ''}
            title={`Comparing "${keyComparison.key}"`}
            height={isFullscreen ? 'calc(100vh - 280px)' : 500}
            onCopyOriginal={handleCopyOriginal}
            onCopyModified={handleCopyModified}
            showFullscreen={false} // Disable independent fullscreen since modal handles it
            onToggleFullscreen={handleToggleFullscreen}
            isFullscreen={false} // Let modal handle fullscreen
          />
        )}
        
        {keyComparison.missingInSource && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fff2f0', border: '1px solid #ffccc7', borderRadius: '6px' }}>
            <Text type="danger">
              <strong>Missing in Source:</strong> This key exists in the target but not in the source instance.
            </Text>
          </div>
        )}
        
        {keyComparison.missingInTarget && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fff7e6', border: '1px solid #ffd591', borderRadius: '6px' }}>
            <Text style={{ color: '#d46b08' }}>
              <strong>Missing in Target:</strong> This key exists in the source but not in the target instance.
            </Text>
          </div>
        )}
        
        {keyComparison.identical && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '6px' }}>
            <Text type="success">
              <strong>Identical:</strong> The values are identical in both instances.
            </Text>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ConfigMapKeyDiffModal;