import { useEffect, useRef } from 'react';
import { useSocket } from './useSocket';
import { useToast } from '@/contexts/ToastContext';
import { AuthUser, Project, Card, User } from '@/types';

interface UseGlobalWebSocketEventsProps {
  user: AuthUser;
  currentProject?: Project;
  isProjectOwner?: boolean;
  enabled?: boolean;
  onBoardUpdate?: (updateFn: (prevBoard: any) => any) => void;
}

export const useGlobalWebSocketEvents = ({
  user,
  currentProject,
  isProjectOwner = false,
  enabled = true,
  onBoardUpdate
}: UseGlobalWebSocketEventsProps) => {
  const { socket, joinUser } = useSocket();
  const { addToast } = useToast();
  const processedEventsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!socket || !enabled) {
      console.log('🚫 [GlobalWebSocket] Not setting up listeners - socket:', !!socket, 'enabled:', enabled);
      return;
    }

    console.log('🔌 [GlobalWebSocket] Setting up event listeners');
    console.log('📊 [GlobalWebSocket] User:', user.id);
    console.log('📊 [GlobalWebSocket] Current project:', currentProject?.projectId);
    console.log('📊 [GlobalWebSocket] Is project owner:', isProjectOwner);

    // 사용자별 룸에 join (토스트 알림 수신용)
    joinUser(user.id);

    // 카드 생성 이벤트
    const handleCardCreated = (data: { card: Card; user: User; projectId?: string; timestamp?: number }) => {
      const eventId = `card-created-${data.card.id}-${data.user.id}-${data.timestamp || Date.now()}`;
      
      if (processedEventsRef.current.has(eventId)) {
        console.log('🔄 [GlobalWebSocket] Duplicate card created event ignored:', eventId);
        return;
      }
      processedEventsRef.current.add(eventId);

      console.log('📨 [GlobalWebSocket] Received card-created:', data);
      
      // 다른 사용자가 카드를 생성했고, 동일 프로젝트일 때만 토스트 표시
      const isRelevantProject = !data.projectId || !currentProject?.projectId || data.projectId === currentProject.projectId;
      if (data.user.id !== user.id && isRelevantProject) {
        console.log('🎯 [GlobalWebSocket] Showing card created toast');
        addToast({
          type: 'info',
          title: '새 카드 생성',
          message: `${data.user.name}님이 "${data.card.title}" 카드를 생성했습니다.`,
          duration: 3000
        });
      }
    };

    // 카드 수정 이벤트
    const handleCardUpdated = (data: { card: Card; user: User; projectId?: string; timestamp?: number }) => {
      const eventId = `card-updated-${data.card.id}-${data.user.id}-${data.timestamp || Date.now()}`;
      
      if (processedEventsRef.current.has(eventId)) {
        console.log('🔄 [GlobalWebSocket] Duplicate card updated event ignored:', eventId);
        return;
      }
      processedEventsRef.current.add(eventId);

      console.log('📨 [GlobalWebSocket] Received card-updated:', data);
      
      // 다른 사용자가 카드를 수정했고, 동일 프로젝트일 때만 토스트 표시
      const isRelevantProject = !data.projectId || !currentProject?.projectId || data.projectId === currentProject.projectId;
      if (data.user.id !== user.id && isRelevantProject) {
        console.log('🎯 [GlobalWebSocket] Showing card updated toast');
        addToast({
          type: 'info',
          title: '카드 수정',
          message: `${data.user.name}님이 "${data.card.title}" 카드를 수정했습니다.`,
          duration: 3000
        });
      }
    };

    // 프로젝트 참여 신청 이벤트
    const handleProjectJoinRequest = (data: any) => {
      const eventId = `join-request-${data.request.id}`;
      
      if (processedEventsRef.current.has(eventId)) {
        console.log('🔄 [GlobalWebSocket] Duplicate join request event ignored:', eventId);
        return;
      }
      processedEventsRef.current.add(eventId);

      console.log('📨 [GlobalWebSocket] Received project-join-request:', data);
      
      // 신청자 본인에게는 토스트 표시 안함
      if (data.user.id === user.id) {
        console.log('🚫 [GlobalWebSocket] Skipping toast for own request');
        return;
      }
      
      // 해당 프로젝트의 소유자에게만 알림 표시 (어느 화면에 있든 상관없이)
      // 프로젝트 소유자 확인은 data.project.ownerId로 직접 확인
      const isOwnerOfRequestedProject = data.project.ownerId === user.id;
      
      if (isOwnerOfRequestedProject) {
        console.log('🎯 [GlobalWebSocket] Showing join request toast');
        addToast({
          type: 'info',
          title: '새로운 가입 신청',
          message: `${data.user.name}님이 "${data.project.name}" 프로젝트 참여를 신청했습니다.`,
          duration: 5000
        });
      } else {
        console.log('🚫 [GlobalWebSocket] Not project owner, skipping toast');
        console.log('🔍 [GlobalWebSocket] Project ownerId:', data.project.ownerId, 'User id:', user.id);
      }
    };

    // 프로젝트 참여 승인/거부 이벤트
    const handleProjectJoinResponse = (data: any) => {
      const eventId = `join-response-${data.requestId}-${data.applicantId || data.user?.id}`;
      
      if (processedEventsRef.current.has(eventId)) {
        console.log('🔄 [GlobalWebSocket] Duplicate join response event ignored:', eventId);
        return;
      }
      processedEventsRef.current.add(eventId);

      console.log('📨 [GlobalWebSocket] Received project-join-response:', data);
      
      // 현재 사용자가 해당 신청자인지 확인
      const applicantId = data.applicantId || data.user?.id;
      if (applicantId === user.id) {
        console.log('🎯 [GlobalWebSocket] Showing join response toast');
        addToast({
          type: data.action === 'approve' ? 'success' : 'error',
          title: data.action === 'approve' ? '참여 승인' : '참여 거부',
          message: data.message,
          duration: 5000
        });
      }
    };

    // 카드 이동 이벤트
    const handleCardMoved = (data: any) => {
      const eventId = `card-moved-${data.card.id}-${data.user.id}-${data.fromColumn}-${data.toColumn}-${data.timestamp || Date.now()}`;
      
      if (processedEventsRef.current.has(eventId)) {
        console.log('🔄 [GlobalWebSocket] Duplicate card moved event ignored:', eventId);
        return;
      }
      processedEventsRef.current.add(eventId);

      console.log('📨 [GlobalWebSocket] Received card-moved:', data);
      
      // 다른 사용자가 카드를 이동했고, 동일 프로젝트일 때만 처리
      const isRelevantProject = !data.projectId || !currentProject?.projectId || data.projectId === currentProject.projectId;
      if (data.user.id !== user.id && isRelevantProject) {
        console.log('🎯 [GlobalWebSocket] Processing card moved event');
        
        // 보드 상태 업데이트 (카드 동기화)
        if (onBoardUpdate) {
          console.log('🔄 [GlobalWebSocket] Updating board state for card move');
          onBoardUpdate((prevBoard: any) => {
            if (!prevBoard || !prevBoard.columns) {
              console.warn('🚫 [GlobalWebSocket] Invalid board state, skipping update');
              return prevBoard;
            }

            const updatedBoard = { ...prevBoard };
            
            // 모든 컬럼에서 이동된 카드 제거
            updatedBoard.columns = updatedBoard.columns.map((column: any) => ({
              ...column,
              cards: column.cards.filter((card: any) => card.id !== data.card.id)
            }));

            // 대상 컬럼에 카드 추가
            updatedBoard.columns = updatedBoard.columns.map((column: any) => {
              if (column.id === data.toColumn) {
                const newCards = [...column.cards];
                newCards.splice(data.destinationIndex, 0, data.card);
                return {
                  ...column,
                  cards: newCards
                };
              }
              return column;
            });

            console.log('✅ [GlobalWebSocket] Board state updated for card move');
            return updatedBoard;
          });
        }
        
        // 토스트 알림 표시
        const columnNames: { [key: string]: string } = {
          'backlog': 'Backlog',
          'todo': 'To Do',
          'inprogress': 'In Progress',
          'review': 'Review',
          'done': 'Done'
        };
        const toColumnName = columnNames[data.toColumn] || data.toColumn;
        
        addToast({
          type: 'info',
          title: '카드 이동',
          message: `${data.user.name}님이 "${data.card.title}" 카드를 ${toColumnName}으로 이동했습니다.`,
          duration: 3000
        });
      }
    };

    // 이벤트 리스너 등록
    socket.on('card-created', handleCardCreated);
    socket.on('card-updated', handleCardUpdated);
    socket.on('project-join-request', handleProjectJoinRequest);
    socket.on('project-join-response', handleProjectJoinResponse);
    socket.on('card-moved', handleCardMoved);

    // 정리 함수
    return () => {
      console.log('🧹 [GlobalWebSocket] Cleaning up event listeners');
      socket.off('card-created', handleCardCreated);
      socket.off('card-updated', handleCardUpdated);
      socket.off('project-join-request', handleProjectJoinRequest);
      socket.off('project-join-response', handleProjectJoinResponse);
      socket.off('card-moved', handleCardMoved);
      
      // 이벤트 ID 캐시 정리 (30초 후)
      setTimeout(() => {
        processedEventsRef.current.clear();
      }, 30 * 1000);
    };
  }, [socket, user.id, currentProject?.projectId, isProjectOwner, enabled, addToast, onBoardUpdate]);
};
