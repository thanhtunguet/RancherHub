import React, { useState } from 'react';
import { HarborProjectsList } from './HarborProjectsList';
import { HarborRepositoriesList } from './HarborRepositoriesList';
import { HarborArtifactsList } from './HarborArtifactsList';
import { HarborSite, HarborProject, HarborRepository } from '../../types';

type ViewState = 
  | { type: 'projects' }
  | { type: 'repositories'; harborSite: HarborSite; project: HarborProject }
  | { type: 'artifacts'; harborSite: HarborSite; project: HarborProject; repository: HarborRepository };

export const HarborBrowser: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>({ type: 'projects' });

  const handleSelectProject = (project: HarborProject, harborSite: HarborSite) => {
    setCurrentView({
      type: 'repositories',
      harborSite,
      project,
    });
  };

  const handleSelectRepository = (
    repository: HarborRepository, 
    project: HarborProject, 
    harborSite: HarborSite
  ) => {
    setCurrentView({
      type: 'artifacts',
      harborSite,
      project,
      repository,
    });
  };

  const handleBackToProjects = () => {
    setCurrentView({ type: 'projects' });
  };

  const handleBackToRepositories = () => {
    if (currentView.type === 'artifacts') {
      setCurrentView({
        type: 'repositories',
        harborSite: currentView.harborSite,
        project: currentView.project,
      });
    }
  };

  switch (currentView.type) {
    case 'projects':
      return (
        <HarborProjectsList 
          onSelectProject={handleSelectProject}
        />
      );

    case 'repositories':
      return (
        <HarborRepositoriesList
          harborSite={currentView.harborSite}
          project={currentView.project}
          onSelectRepository={handleSelectRepository}
          onBack={handleBackToProjects}
        />
      );

    case 'artifacts':
      return (
        <HarborArtifactsList
          harborSite={currentView.harborSite}
          project={currentView.project}
          repository={currentView.repository}
          onBack={handleBackToRepositories}
        />
      );

    default:
      return null;
  }
};