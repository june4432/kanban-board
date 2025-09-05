import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Board, Card, Project } from '@/types';

// WebSocket server extension type
type NextApiResponseWithSocket = NextApiResponse & {
  socket?: {
    server?: any;
  };
};

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'kanban-boards.json');
const PROJECTS_FILE_PATH = path.join(process.cwd(), 'data', 'projects.json');

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
      // 새 프로젝트용 빈 보드 생성
      board = {
        boardId: `board-${projectId}`,
        projectId,
        columns: [
          { id: 'backlog', title: 'Backlog', cards: [], wipLimit: 10, position: 0 },
          { id: 'todo', title: 'To Do', cards: [], wipLimit: 5, position: 1 },
          { id: 'inprogress', title: 'In Progress', cards: [], wipLimit: 3, position: 2 },
          { id: 'review', title: 'Review', cards: [], wipLimit: 3, position: 3 },
          { id: 'done', title: 'Done', cards: [], wipLimit: 20, position: 4 }
        ],
        labels: [],
        milestones: []
      };
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

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  try {
    const { columnId, cardData, userId, userName } = req.body;
    
    if (!columnId || !cardData) {
      return res.status(400).json({ error: 'Column ID and card data are required' });
    }
    
    // projectId를 cardData에서 가져오거나 query에서 가져옴
    const projectId = cardData.projectId || req.query.projectId as string;
    
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    
    const data = readData(projectId);

    switch (req.method) {
      case 'POST':
        // 새 카드 생성

        const column = data.board.columns.find(col => col.id === columnId);
        if (!column) {
          return res.status(404).json({ error: 'Column not found' });
        }

        // WIP 제한 체크
        if (column.cards.length >= column.wipLimit) {
          return res.status(400).json({ 
            error: `WIP 제한 초과: ${column.title} 컬럼의 최대 카드 수는 ${column.wipLimit}개입니다.` 
          });
        }

        const newCard: Card = {
          id: uuidv4(),
          title: cardData.title || '',
          description: cardData.description || '',
          assignees: cardData.assignees || [],
          milestone: cardData.milestone,
          priority: cardData.priority || 'medium',
          labels: cardData.labels || [],
          columnId,
          createdAt: new Date(),
          updatedAt: new Date(),
          dueDate: cardData.dueDate ? new Date(cardData.dueDate) : undefined,
          position: column.cards.length
        };

        // 컬럼에 카드 추가
        data.board.columns = data.board.columns.map(col =>
          col.id === columnId
            ? { ...col, cards: [...col.cards, newCard] }
            : col
        );

        writeData(data);

        // 웹소켓 이벤트 전송 (프로젝트 멤버들에게만)
        if (res.socket.server.io && projectId) {
          const project = getProject(projectId);
          if (project) {
            const eventData = {
              card: newCard,
              user: { id: userId || 'unknown', name: userName || '알 수 없는 사용자' },
              projectId: projectId,
              timestamp: Date.now()
            };
            
            // 프로젝트 멤버들의 사용자 ID 목록 수집
            const memberUserIds = [
              project.ownerId, // 프로젝트 소유자
              ...(project.members as any[]).map((member: any) => member.userId) // 멤버들
            ];
            
            // 프로젝트 멤버들에게만 이벤트 전송
            memberUserIds.forEach(memberId => {
              res.socket!.server!.io.to(`user-${memberId}`).emit('card-created', eventData);
            });
            
            console.log('Card created event sent to project members:', memberUserIds);
          }
        }

        res.status(201).json({ card: newCard });
        break;

      default:
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}