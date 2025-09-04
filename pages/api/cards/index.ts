import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Board, Card } from '@/types';

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
  try {
    const data = readData();

    switch (req.method) {
      case 'POST':
        // 새 카드 생성
        const { columnId, cardData } = req.body;

        if (!columnId || !cardData) {
          return res.status(400).json({ error: 'Column ID and card data are required' });
        }

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
          assignee: cardData.assignee,
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