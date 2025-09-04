import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
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
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid card ID' });
  }

  try {
    const data = readData();

    switch (req.method) {
      case 'PUT':
        // 카드 업데이트
        const updates = req.body;
        let cardFound = false;

        data.board.columns = data.board.columns.map(column => ({
          ...column,
          cards: column.cards.map(card => {
            if (card.id === id) {
              cardFound = true;
              return {
                ...card,
                ...updates,
                id: card.id, // ID는 변경하지 않음
                updatedAt: new Date()
              };
            }
            return card;
          })
        }));

        if (!cardFound) {
          return res.status(404).json({ error: 'Card not found' });
        }

        writeData(data);
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