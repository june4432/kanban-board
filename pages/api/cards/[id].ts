import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
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

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid card ID' });
  }

  try {
    // projectId를 query 또는 body에서 가져옴
    const projectId = req.query.projectId as string || req.body.projectId;
    const { userId, userName } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    
    const data = readData(projectId);

    switch (req.method) {
      case 'PUT':
        // 카드 업데이트
        const updates = req.body;
        let cardFound = false;

        let updatedCard: Card | null = null;

        data.board.columns = data.board.columns.map(column => ({
          ...column,
          cards: column.cards.map(card => {
            if (card.id === id) {
              cardFound = true;
              const updated: Card = {
                ...card,
                ...updates,
                id: card.id, // ID는 변경하지 않음
                updatedAt: new Date()
              };
              updatedCard = updated;
              return updated;
            }
            return card;
          })
        }));

        if (!cardFound) {
          return res.status(404).json({ error: 'Card not found' });
        }

        writeData(data);

        // 웹소켓 이벤트 전송 (전체 브로드캐스트만 사용)
        if (res.socket.server.io && updatedCard) {
          const eventData = {
            card: updatedCard,
            user: { id: userId || 'unknown', name: userName || '알 수 없는 사용자' },
            projectId: projectId,
            timestamp: Date.now()
          };
          res.socket.server.io.emit('card-updated', eventData);
          console.log('Card updated event broadcasted to all users:', projectId);
        }

        res.status(200).json({ success: true });
        break;

      case 'DELETE':
        // 카드 삭제
        let cardDeleted = false;

        data.board.columns = data.board.columns.map(column => ({
          ...column,
          cards: column.cards.filter(card => {
            if (card.id === id) {
              cardDeleted = true;
              return false;
            }
            return true;
          })
        }));

        if (!cardDeleted) {
          return res.status(404).json({ error: 'Card not found' });
        }

        writeData(data);
        res.status(200).json({ success: true });
        break;

      default:
        res.setHeader('Allow', ['PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}