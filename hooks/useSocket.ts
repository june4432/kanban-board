import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  joinUser: (userId: string) => void;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  emitCardEvent: (event: string, data: any) => void;
  emitProjectEvent: (event: string, data: any) => void;
}

export const useSocket = (): UseSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io({
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketInstance.on('connect', () => {
      console.log('🔌 [useSocket] Connected to server');
      console.log('🔌 [useSocket] Socket ID:', socketInstance.id);
      console.log('🔌 [useSocket] Socket instance:', socketInstance);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('🔌 [useSocket] Disconnected from server:', reason);
      setIsConnected(false);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('Reconnected to server after', attemptNumber, 'attempts');
      setIsConnected(true);
    });

    socketInstance.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.close();
    };
  }, []);

  const joinUser = (userId: string) => {
    console.log('🔌 [useSocket] joinUser called with userId:', userId);
    console.log('🔌 [useSocket] Socket exists:', !!socket);
    console.log('🔌 [useSocket] Socket connected:', socket?.connected);
    
    if (socket && socket.connected) {
      console.log('🔌 [useSocket] Joining user room:', userId);
      socket.emit('join-user', userId);
    } else {
      console.log('🔌 [useSocket] Socket not connected, waiting...');
      // 소켓이 연결되면 자동으로 join하도록 대기열에 추가
      socket?.once('connect', () => {
        console.log('🔌 [useSocket] Socket connected, now joining user room:', userId);
        socket.emit('join-user', userId);
      });
    }
  };

  const joinProject = (projectId: string) => {
    if (socket) {
      socket.emit('join-project', projectId);
    }
  };

  const leaveProject = (projectId: string) => {
    if (socket) {
      socket.emit('leave-project', projectId);
    }
  };

  const emitCardEvent = (event: string, data: any) => {
    if (socket) {
      socket.emit(event, data);
    }
  };

  const emitProjectEvent = (event: string, data: any) => {
    if (socket) {
      socket.emit(event, data);
    }
  };

  return {
    socket,
    isConnected,
    joinUser,
    joinProject,
    leaveProject,
    emitCardEvent,
    emitProjectEvent
  };
};
