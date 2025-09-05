import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { useGlobalWebSocketEvents } from '@/hooks/useGlobalWebSocketEvents';

const GlobalWebSocketManager: React.FC = () => {
  const { user } = useAuth();
  
  let currentProject;
  let isProjectOwner = false;
  
  // useProject는 ProjectProvider 내부에서만 사용 가능하므로 try-catch로 처리
  try {
    const projectContext = useProject();
    currentProject = projectContext.currentProject;
    isProjectOwner = currentProject?.ownerId === user?.id;
  } catch {
    // ProjectProvider 외부에서는 프로젝트 정보 없이 실행
    currentProject = undefined;
    isProjectOwner = false;
  }

  // 전역에서 한 번만 WebSocket 이벤트 처리
  useGlobalWebSocketEvents({
    user: user!,
    currentProject: currentProject || undefined,
    isProjectOwner,
    enabled: !!user // 로그인된 사용자만 활성화
  });

  return null; // 렌더링할 UI 없음
};

export default GlobalWebSocketManager;