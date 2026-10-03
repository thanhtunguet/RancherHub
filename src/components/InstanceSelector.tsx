import { useState, useEffect, useMemo } from 'react';
import { EnvironmentsRepository } from '@/repositories/environments.repository';
import { AppInstancesRepository } from '@/repositories/app-instances.repository';
import type { Environment, AppInstance } from '@/api/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight } from 'lucide-react';

interface InstanceSelectorProps {
  onSelectionChange: (source: AppInstance | null, target: AppInstance | null) => void;
}

export function InstanceSelector({ onSelectionChange }: InstanceSelectorProps) {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [instances, setInstances] = useState<AppInstance[]>([]);
  const [selectedEnv, setSelectedEnv] = useState('all');
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');

  useEffect(() => {
    Promise.all([EnvironmentsRepository.findAll(), AppInstancesRepository.findAll()])
      .then(([envs, insts]) => { setEnvironments(envs); setInstances(insts); })
      .catch(() => {});
  }, []);

  const filteredInstances = useMemo(
    () => selectedEnv && selectedEnv !== 'all' ? instances.filter(i => i.environmentId === selectedEnv) : instances,
    [selectedEnv, instances]
  );

  const sourceInstance = useMemo(() => instances.find(i => i.id === sourceId) ?? null, [sourceId, instances]);
  const targetInstance = useMemo(() => instances.find(i => i.id === targetId) ?? null, [targetId, instances]);

  useEffect(() => {
    onSelectionChange(sourceInstance, targetInstance);
  }, [sourceInstance, targetInstance]);

  const handleEnvChange = (v: string) => {
    setSelectedEnv(v);
    setSourceId('');
    setTargetId('');
  };

  const handleSourceChange = (v: string) => {
    setSourceId(v);
    if (v === targetId) setTargetId('');
  };

  return (
    <div className="surface-elevated rounded-lg p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedEnv} onValueChange={handleEnvChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All environments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All environments</SelectItem>
            {environments.map(e => (
              <SelectItem key={e.id} value={e.id}>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                  {e.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sourceId} onValueChange={handleSourceChange}>
          <SelectTrigger className="w-60">
            <SelectValue placeholder="Select instance" />
          </SelectTrigger>
          <SelectContent emptyMessage={filteredInstances.length === 0 ? 'No app instances available' : undefined}>
            {filteredInstances.map(i => (
              <SelectItem key={i.id} value={i.id}>{i.name} ({i.namespace})</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />

        <Select value={targetId} onValueChange={setTargetId}>
          <SelectTrigger className="w-60">
            <SelectValue placeholder="Compare with... (optional)" />
          </SelectTrigger>
          <SelectContent emptyMessage={filteredInstances.filter(i => i.id !== sourceId).length === 0 ? 'No other instances available' : undefined}>
            {filteredInstances.filter(i => i.id !== sourceId).map(i => (
              <SelectItem key={i.id} value={i.id}>{i.name} ({i.namespace})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
