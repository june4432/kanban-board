import { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { Server as NetServer } from 'http';

// WebSocket server extension type
type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
};

const SocketHandler = (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  console.log('🔧 [WebSocket] SocketHandler called');
  console.log('🔧 [WebSocket] Socket server exists:', !!res.socket?.server);
  console.log('🔧 [WebSocket] IO already exists:', !!res.socket?.server?.io);
  
  if (res.socket.server.io) {
    console.log('🔧 [WebSocket] Socket is already running');
  } else {
    console.log('🔧 [WebSocket] Socket is initializing');
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socketio',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? ['https://your-domain.com'] 
          : ['http://localhost:3000'],
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('New client connected:', socket.id);

      // 사용자별 룸에 참여 (로그인 시 사용)
      socket.on('join-user', (userId: string) => {
        socket.join(`user-${userId}`);
        console.log(`Client ${socket.id} joined user room: user-${userId}`);
      });

      // 프로젝트 룸에 참여
      socket.on('join-project', (projectId: string) => {
        socket.join(`project-${projectId}`);
        console.log(`Client ${socket.id} joined project ${projectId}`);
      });

      // 프로젝트 룸에서 나가기
      socket.on('leave-project', (projectId: string) => {
        socket.leave(`project-${projectId}`);
        console.log(`Client ${socket.id} left project ${projectId}`);
      });

      // WebSocket 서버에서는 따로 브로드캐스트하지 않음
      // API에서 직접 브로드캐스트하므로 중복 방지
      // 클라이언트 간 리레이는 API에서 처리

      // 프로젝트 관련 이벤트는 클라이언트에서 직접 브로드캐스트
      socket.on('project-join-request', (data) => {
        socket.broadcast.emit('project-join-request', data);
        console.log('Project join request event broadcasted to all users');
      });

      socket.on('project-join-response', (data) => {
        socket.broadcast.emit('project-join-response', data);
        console.log('Project join response event broadcasted to all users');
      });

      // 연결 해제
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }
  res.end();
};

export default SocketHandler;
