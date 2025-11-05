import React, { useRef } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { Card, Typography, Space, Button, Tooltip } from 'antd';
import { CopyIcon, MaximizeIcon, MinimizeIcon } from 'lucide-react';
import type { editor } from 'monaco-editor';

const { Text } = Typography;

interface MonacoDiffViewerProps {
  original: string;
  modified: string;
  title?: string;
  language?: string;
  height?: number | string;
  onCopyOriginal?: () => void;
  onCopyModified?: () => void;
  showFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

const MonacoDiffViewer: React.FC<MonacoDiffViewerProps> = ({
  original,
  modified,
  title,
  language = 'text',
  height = 400,
  onCopyOriginal,
  onCopyModified,
  showFullscreen = false,
  onToggleFullscreen,
  isFullscreen = false,
}) => {
  const editorRef = useRef<editor.IStandaloneDiffEditor | null>(null);

  const handleEditorDidMount = (editor: editor.IStandaloneDiffEditor) => {
    editorRef.current = editor;
  };

  // Auto-detect language based on content structure
  const detectLanguage = (content: string): string => {
    if (language !== 'text') return language;
    
    try {
      JSON.parse(content);
      return 'json';
    } catch {
      // Check for YAML-like content
      if (content.includes(':') && (content.includes('\n') || content.includes('  '))) {
        return 'yaml';
      }
      // Check for XML-like content
      if (content.trim().startsWith('<') && content.trim().endsWith('>')) {
        return 'xml';
      }
      // Check for properties file
      if (content.includes('=') && content.includes('\n')) {
        return 'properties';
      }
      return 'text';
    }
  };

  const detectedLanguage = detectLanguage(original || modified || '');

  const diffOptions: editor.IStandaloneDiffEditorConstructionOptions = {
    originalEditable: false,
    readOnly: true,
    enableSplitViewResizing: true,
    renderSideBySide: true,
    diffWordWrap: 'on',
    scrollBeyondLastLine: false,
    minimap: { enabled: false },
    fontSize: 12,
    lineNumbers: 'on',
    folding: true,
    wordWrap: 'on',
    automaticLayout: true,
    ignoreTrimWhitespace: false,
    renderOverviewRuler: true,
    theme: 'vs',
    scrollbar: {
      vertical: 'auto',
      horizontal: 'auto',
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
    },
  };

  const handleCopyOriginal = () => {
    if (original) {
      navigator.clipboard.writeText(original);
      onCopyOriginal?.();
    }
  };

  const handleCopyModified = () => {
    if (modified) {
      navigator.clipboard.writeText(modified);
      onCopyModified?.();
    }
  };

  return (
    <Card
      size="small"
      title={
        title && (
          <div className="flex items-center justify-between">
            <Text strong>{title}</Text>
            <Space>
              {original && (
                <Tooltip title="Copy original value">
                  <Button 
                    size="small" 
                    icon={<CopyIcon size={14} />} 
                    onClick={handleCopyOriginal}
                  >
                    Copy Original
                  </Button>
                </Tooltip>
              )}
              {modified && (
                <Tooltip title="Copy modified value">
                  <Button 
                    size="small" 
                    icon={<CopyIcon size={14} />} 
                    onClick={handleCopyModified}
                  >
                    Copy Modified
                  </Button>
                </Tooltip>
              )}
              {showFullscreen && (
                <Tooltip title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
                  <Button 
                    size="small" 
                    icon={isFullscreen ? <MinimizeIcon size={14} /> : <MaximizeIcon size={14} />} 
                    onClick={onToggleFullscreen}
                    style={{ marginRight: isFullscreen ? '40px' : '0' }} // Add margin when fullscreen to avoid overlap
                  />
                </Tooltip>
              )}
            </Space>
          </div>
        )
      }
      style={{ 
        height: isFullscreen ? '100vh' : 'auto',
        ...(isFullscreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1001, // Lower than modal's z-index when in modal
          margin: 0,
        })
      }}
    >
      <div style={{ height: isFullscreen ? 'calc(100vh - 60px)' : height }}>
        <DiffEditor
          original={original || ''}
          modified={modified || ''}
          language={detectedLanguage}
          options={diffOptions}
          onMount={handleEditorDidMount}
        />
      </div>
    </Card>
  );
};

export default MonacoDiffViewer;