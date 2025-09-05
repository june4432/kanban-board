import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { Board, Project, User } from '@/types';

// WebSocket server extension type
type NextApiResponseWithSocket = NextApiResponse & {
  socket?: {
    server?: any;
  };
};

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'kanban-boards.json');
const PROJECTS_FILE_PATH = path.join(process.cwd(), 'data', 'projects.json');
const USERS_FILE_PATH = path.join(process.cwd(), 'data', 'users.json');

// 전체 보드 데이터 읽기
const readAllBoards = (): { boards: Board[] } => {
  try {
    if (!fs.existsSync(DATA_FILE_PATH)) {
      return { boards: [] };
    }
    
    const fileContents = fs.readFileSync(DATA_FILE_PATH, 'utf8');
    return JSON.parse(fileContents);
  } catch (error) {
    console.error('Error reading boards file:', error);
    return { boards: [] };
  }
};

// 특정 프로젝트 보드 읽기
const readData = (projectId: string): { board: Board } => {
  try {
    const allData = readAllBoards();
    let board = allData.boards.find(b => b.projectId === projectId);
    
    if (!board) {
      throw new Error('Project board not found');
    }
    
    // Date 객체로 변환
    board.columns.forEach((column: any) => {
      column.cards.forEach((card: any) => {
        card.createdAt = new Date(card.createdAt);
        card.updatedAt = new Date(card.updatedAt);
        if (card.dueDate) card.dueDate = new Date(card.dueDate);
        if (card.milestone?.dueDate) {
          card.milestone.dueDate = new Date(card.milestone.dueDate);
        }
      });
    });
    
    if (board.milestones) {
      board.milestones.forEach((milestone: any) => {
        milestone.dueDate = new Date(milestone.dueDate);
      });
    }
    
    return { board };
  } catch (error) {
    console.error('Error reading data file:', error);
    throw new Error('Failed to read data file');
  }
};

// 보드 데이터 저장
const writeData = (data: { board: Board }): void => {
  try {
    const projectId = data.board.projectId;
    if (!projectId) {
      throw new Error('Project ID is required for saving data');
    }
    
    const allData = readAllBoards();
    const boardIndex = allData.boards.findIndex(b => b.projectId === projectId);
    
    if (boardIndex >= 0) {
      // 기존 보드 업데이트
      allData.boards[boardIndex] = data.board;
    } else {
      // 새 보드 추가
      allData.boards.push(data.board);
    }
    
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(allData, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing data file:', error);
    throw new Error('Failed to write data file');
  }
};

// 프로젝트 정보 읽기
const getProject = (projectId: string): Project | null => {
  try {
    const data = fs.readFileSync(PROJECTS_FILE_PATH, 'utf8');
    const projects = JSON.parse(data).projects || [];
    return projects.find((p: Project) => p.projectId === projectId) || null;
  } catch (error) {
    console.error('Error reading projects:', error);
    return null;
  }
};

// 사용자 정보 읽기
const getUsers = (): User[] => {
  try {
    const data = fs.readFileSync(USERS_FILE_PATH, 'utf8');
    return JSON.parse(data).users || [];
  } catch (error) {
    console.error('Error reading users:', error);
    return [];
  }
};

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  console.log('🚀 [API] Card move API called');
  console.log('🚀 [API] Method:', req.method);
  console.log('🚀 [API] Request body:', req.body);
  
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { cardId, sourceColumnId, destinationColumnId, destinationIndex, projectId, userId, userName } = req.body;

    if (!cardId || !sourceColumnId || !destinationColumnId || destinationIndex === undefined) {
      return res.status(400).json({ 
        error: 'Card ID, source column ID, destination column ID, and destination index are required' 
      });
    }
    
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const data = readData(projectId);

    // 소스 컬럼에서 카드 제거
    const sourceColumn = data.board.columns.find(col => col.id === sourceColumnId);
    const destinationColumn = data.board.columns.find(col => col.id === destinationColumnId);
    const cardToMove = sourceColumn?.cards.find(card => card.id === cardId);

    if (!sourceColumn || !destinationColumn || !cardToMove) {
      return res.status(404).json({ error: 'Column or card not found' });
    }

    // WIP 제한 체크 (같은 컬럼 내 이동이 아닌 경우)
    if (sourceColumnId !== destinationColumnId && 
        destinationColumn.cards.length >= destinationColumn.wipLimit) {
      return res.status(400).json({ 
        error: `WIP 제한 초과: ${destinationColumn.title} 컬럼의 최대 카드 수는 ${destinationColumn.wipLimit}개입니다.` 
      });
    }

    // 모든 컬럼에서 해당 카드 제거
    data.board.columns = data.board.columns.map(column => ({
      ...column,
      cards: column.cards.filter(card => card.id !== cardId)
    }));

    // 카드 업데이트
    const updatedCard = {
      ...cardToMove,
      columnId: destinationColumnId,
      updatedAt: new Date()
    };

    // 대상 컬럼에 카드 추가
    data.board.columns = data.board.columns.map(column => {
      if (column.id === destinationColumnId) {
        const newCards = [...column.cards];
        newCards.splice(destinationIndex, 0, updatedCard);
        return {
          ...column,
          cards: newCards
        };
      }
      return column;
    });

    writeData(data);

    // 웹소켓 이벤트 전송 (프로젝트 멤버들에게만)
    console.log('📤 [API] Attempting to send WebSocket event');
    console.log('📤 [API] Socket server exists:', !!res.socket?.server?.io);
    console.log('📤 [API] Project ID:', projectId);
    console.log('📤 [API] User ID:', userId);
    console.log('📤 [API] User Name:', userName);
    
    if (res.socket?.server?.io) {
      // 프로젝트 정보 가져오기
      const project = getProject(projectId);
      if (project) {
        const eventData = {
          card: updatedCard,
          user: { id: userId || 'unknown', name: userName || '알 수 없는 사용자' },
          fromColumn: sourceColumnId,
          toColumn: destinationColumnId,
          destinationIndex: destinationIndex,
          projectId: projectId,
          timestamp: Date.now()
        };
        
        console.log('📤 [API] Event data:', eventData);
        
        // 프로젝트 멤버들의 사용자 ID 목록 수집
        const memberUserIds = [
          project.ownerId, // 프로젝트 소유자
          ...(project.members as any[]).map((member: any) => member.userId) // 멤버들
        ].filter((id, index, arr) => arr.indexOf(id) === index); // 중복 제거
        
        console.log('📤 [API] Sending to project members:', memberUserIds);
        
        // 프로젝트 멤버들에게만 이벤트 전송
        memberUserIds.forEach(memberId => {
          console.log(`📤 [API] Sending card-moved event to user-${memberId}`);
          res.socket!.server!.io.to(`user-${memberId}`).emit('card-moved', eventData);
        });
        
        console.log('📤 [API] Card moved event sent to project members only:', memberUserIds);
      } else {
        console.log('⚠️ [API] Project not found, skipping WebSocket event');
      }
    } else {
      console.log('❌ [API] No WebSocket server available');
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}