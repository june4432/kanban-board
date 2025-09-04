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
  try {
    switch (req.method) {
      case 'GET':
        // 전체 보드 데이터 조회
        const data = readData();
        res.status(200).json(data);
        break;

      case 'PUT':
        // 전체 보드 데이터 업데이트
        const { board } = req.body;
        if (!board) {
          return res.status(400).json({ error: 'Board data is required' });
        }
        
        writeData({ board });
        res.status(200).json({ success: true });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}