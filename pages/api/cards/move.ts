import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { Board } from '@/types';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'kanban-data.json');

// 데이터 읽기
const readData = (): { board: Board } => {
  try {
    const fileContents = fs.readFileSync(DATA_FILE_PATH, 'utf8');
    const data = JSON.parse(fileContents);
    
    // Date 객체로 변환
    data.board.columns.forEach((column: any) => {
      column.cards.forEach((card: any) => {
        card.createdAt = new Date(card.createdAt);
        card.updatedAt = new Date(card.updatedAt);
        if (card.dueDate) card.dueDate = new Date(card.dueDate);
        if (card.milestone?.dueDate) {
          card.milestone.dueDate = new Date(card.milestone.dueDate);
        }
      });
    });
    
    data.board.milestones.forEach((milestone: any) => {
      milestone.dueDate = new Date(milestone.dueDate);
    });
    
    return data;
  } catch (error) {
    console.error('Error reading data file:', error);
    throw new Error('Failed to read data file');
  }
};

// 데이터 쓰기
const writeData = (data: { board: Board }): void => {
  try {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing data file:', error);
    throw new Error('Failed to write data file');
  }
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { cardId, sourceColumnId, destinationColumnId, destinationIndex } = req.body;

    if (!cardId || !sourceColumnId || !destinationColumnId || destinationIndex === undefined) {
      return res.status(400).json({ 
        error: 'Card ID, source column ID, destination column ID, and destination index are required' 
      });
    }

    const data = readData();

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
    res.status(200).json({ success: true });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}