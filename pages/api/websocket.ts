import { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { Server as NetServer } from 'http';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { getRepositories } from '@/lib/repositories';
import type { AuthSession } from '@/lib/auth-helpers';

// WebSocket server extension type
type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
};

const SocketHandler = async (_req: NextApiRequest, res: NextApiResponseWithSocket) => {
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
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    res.socket.server.io = io;

    // 인증 미들웨어
    io.use(async (socket, next) => {
      try {
        const req = socket.request as any;
        const session = await getServerSession(req, {} as any, authOptions) as AuthSession | null;

        if (!session?.user?.id) {
          console.log('🚫 [WebSocket] Connection rejected: No session');
          return next(new Error('Unauthorized'));
        }

        // socket에 사용자 정보 저장
        socket.data.userId = session.user.id;
        socket.data.userEmail = session.user.email;
        socket.data.userName = session.user.name;

        console.log(`✅ [WebSocket] Authenticated: ${session.user.email}`);
        next();
      } catch (error) {
        console.error('🚫 [WebSocket] Auth error:', error);
        next(new Error('Authentication failed'));
      }
    });

    io.on('connection', (socket) => {
      const userId = socket.data.userId;
      const userEmail = socket.data.userEmail;

      console.log(`📡 [WebSocket] Client connected: ${socket.id} (${userEmail})`);

      // 사용자 룸 자동 참여 (클라이언트 입력 무시)
      socket.join(`user-${userId}`);
      console.log(`👤 [WebSocket] Auto-joined user room: user-${userId}`);

      // 프로젝트 룸에 참여 - 멤버십 확인
      socket.on('join-project', async (projectId: string) => {
        try {
          const { projects } = getRepositories();
          const project = projects.findById(projectId);

          if (!project) {
            socket.emit('error', { message: 'Project not found' });
            return;
          }

          const isMember = projects.isMember(projectId, userId);

          if (isMember) {
            socket.join(`project-${projectId}`);
            console.log(`✅ [WebSocket] ${userEmail} joined project-${projectId}`);
            socket.emit('project-joined', { projectId });
          } else {
            console.log(`🚫 [WebSocket] ${userEmail} denied access to project-${projectId}`);
            socket.emit('error', { message: 'Access denied to project' });
          }
        } catch (error) {
          console.error('[WebSocket] Error joining project:', error);
          socket.emit('error', { message: 'Failed to join project' });
        }
      });

      // 프로젝트 룸에서 나가기
      socket.on('leave-project', (projectId: string) => {
        socket.leave(`project-${projectId}`);
        console.log(`👋 [WebSocket] ${userEmail} left project-${projectId}`);
      });

      // WebSocket 서버에서는 따로 브로드캐스트하지 않음
      // API에서 직접 브로드캐스트하므로 중복 방지
      // 클라이언트 간 리레이는 API에서 처리

      // 프로젝트 관련 이벤트는 클라이언트에서 직접 브로드캐스트
      socket.on('project-join-request', (data) => {
        socket.broadcast.emit('project-join-request', data);
        console.log('[WebSocket] Project join request event broadcasted');
      });

      socket.on('project-join-response', (data) => {
        socket.broadcast.emit('project-join-response', data);
        console.log('[WebSocket] Project join response event broadcasted');
      });

      // 연결 해제
      socket.on('disconnect', () => {
        console.log(`📡 [WebSocket] Client disconnected: ${socket.id} (${userEmail})`);
      });
    });
  }
  res.end();
};

export default SocketHandler;
