import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Project, AuthUser } from '@/types';
import { api } from '@/lib/api/v1-client';

interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  loading: boolean;
  selectProject: (project: Project) => void;
  createProject: (projectData: { name: string; description?: string; color?: string }) => Promise<void>;
  fetchProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

interface ProjectProviderProps {
  children: ReactNode;
  user: AuthUser;
}

export function ProjectProvider({ children, user }: ProjectProviderProps) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, [user.id]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      console.log('Fetching projects for user:', user);
      console.log('User ID:', user.id);

      // V1 API 사용
      const response = await api.projects.list({ pageSize: 100 });
      const projectList = response.data || [];

      console.log('API Response:', projectList);

      setProjects(projectList as unknown as Project[]);

      // 사용자의 프로젝트가 있으면 첫 번째 프로젝트를 자동 선택
      if (projectList.length > 0) {
        setCurrentProject(projectList[0] as unknown as Project);
      } else {
        // 프로젝트가 없으면 null로 설정 (ProjectSelector 표시)
        setCurrentProject(null);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectProject = (project: Project) => {
    setCurrentProject(project);
    localStorage.setItem('selectedProjectId', project.projectId);
  };

  const createProject = async (_projectData: { name: string; description?: string; color?: string }) => {
    // ProjectSelector에서 이미 처리하므로 여기서는 아무것도 하지 않음
    return;
  };

  const value = {
    currentProject,
    projects,
    loading,
    selectProject,
    createProject,
    fetchProjects
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}