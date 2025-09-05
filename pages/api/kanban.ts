import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { Board, Card } from '@/types';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'kanban-boards.json');

// 전체 보드 데이터 읽기
const readAllBoards = (): { boards: Board[] } => {
  try {
    if (!fs.existsSync(DATA_FILE_PATH)) {
      // 기존 레거시 데이터가 있으면 마이그레이션
      const legacyPath = path.join(process.cwd(), 'data', 'kanban-data.json');
      if (fs.existsSync(legacyPath)) {
        const legacyData = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
        // 기존 단일 보드를 새 구조로 변환
        const migratedBoard = {
          boardId: legacyData.board.id || 'board-test-project-1',
          projectId: legacyData.board.projectId || 'test-project-1',
          columns: legacyData.board.columns || [],
          labels: legacyData.board.labels || [],
          milestones: legacyData.board.milestones || []
        };
        const migratedData = { boards: [migratedBoard] };
        fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(migratedData, null, 2));
        return migratedData;
      }
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
    console.log(`🔍 readData called with projectId: ${projectId}`);
    const allData = readAllBoards();
    console.log(`📚 All boards loaded:`, allData);
    
    let board = allData.boards.find(b => b.projectId === projectId);
    console.log(`🎯 Found board for projectId ${projectId}:`, board);
    
    if (!board) {
      console.log(`⚠️ No board found for projectId ${projectId}, creating new empty board`);
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
      console.log(`✨ Created new board:`, board);
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
    console.log(`💾 writeData called for projectId: ${projectId}`);
    
    if (!projectId) {
      console.log('❌ No projectId in board data');
      throw new Error('Project ID is required for saving data');
    }
    
    const allData = readAllBoards();
    console.log('📚 Current boards before save:', allData.boards.map(b => b.projectId));
    
    const boardIndex = allData.boards.findIndex(b => b.projectId === projectId);
    console.log(`🔍 Board index for projectId ${projectId}: ${boardIndex}`);
    
    if (boardIndex >= 0) {
      // 기존 보드 업데이트
      console.log('🔄 Updating existing board');
      allData.boards[boardIndex] = data.board;
    } else {
      // 새 보드 추가
      console.log('➕ Adding new board');
      allData.boards.push(data.board);
    }
    
    console.log(`💾 Writing to file: ${DATA_FILE_PATH}`);
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(allData, null, 2), 'utf8');
    console.log('✅ Data written successfully');
  } catch (error) {
    console.error('❌ Error writing data file:', error);
    throw new Error('Failed to write data file');
  }
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        // 프로젝트별 보드 데이터 조회
        const { projectId } = req.query;
        
        console.log('🔍 API Request - projectId:', projectId);
        
        if (!projectId) {
          console.log('❌ No projectId provided in query');
          return res.status(400).json({ error: 'Project ID is required' });
        }
        
        console.log(`📚 Reading data for projectId: ${projectId}`);
        const data = readData(projectId as string);
        console.log('📤 Sending board data:', data);
        
        res.status(200).json(data);
        break;

      case 'PUT':
        // 전체 보드 데이터 업데이트
        const { board } = req.body;
        console.log('📝 PUT request - received board data:', board);
        
        if (!board) {
          console.log('❌ No board data provided');
          return res.status(400).json({ error: 'Board data is required' });
        }
        
        if (!board.projectId) {
          console.log('❌ No projectId in board data');
          return res.status(400).json({ error: 'Board projectId is required' });
        }
        
        console.log(`💾 Saving board for projectId: ${board.projectId}`);
        writeData({ board });
        console.log('✅ Board saved successfully');
        res.status(200).json({ success: true });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}