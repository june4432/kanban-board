import fs from 'fs';
import path from 'path';
import { Board, Card, Column } from '@/types';

const boardsFilePath = path.join(process.cwd(), 'data', 'kanban-boards.json');

export class BoardService {
  private static readBoards(): Board[] {
    try {
      const fileContent = fs.readFileSync(boardsFilePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      console.error('Error reading boards file:', error);
      return [];
    }
  }

  private static writeBoards(boards: Board[]): boolean {
    try {
      fs.writeFileSync(boardsFilePath, JSON.stringify(boards, null, 2));
      return true;
    } catch (error) {
      console.error('Error writing boards file:', error);
      return false;
    }
  }

  static getBoard(projectId: string): Board | null {
    const boards = this.readBoards();
    return boards.find(board => board.projectId === projectId) || null;
  }

  static createBoard(projectId: string): Board {
    const boards = this.readBoards();

    const newBoard: Board = {
      boardId: `board_${Date.now()}`,
      projectId,
      columns: [
        { id: 'backlog', title: 'Backlog', cards: [], wipLimit: 0, position: 0 },
        { id: 'todo', title: 'To Do', cards: [], wipLimit: 5, position: 1 },
        { id: 'in-progress', title: 'In Progress', cards: [], wipLimit: 3, position: 2 },
        { id: 'review', title: 'Review', cards: [], wipLimit: 3, position: 3 },
        { id: 'done', title: 'Done', cards: [], wipLimit: 0, position: 4 }
      ],
      labels: [],
      milestones: []
    };

    boards.push(newBoard);
    this.writeBoards(boards);

    return newBoard;
  }

  static updateBoard(boardId: string, updates: Partial<Board>): Board | null {
    const boards = this.readBoards();
    const boardIndex = boards.findIndex(b => b.boardId === boardId);

    if (boardIndex === -1) {
      return null;
    }

    boards[boardIndex] = { ...boards[boardIndex], ...updates };
    this.writeBoards(boards);

    return boards[boardIndex];
  }

  static createCard(projectId: string, columnId: string, cardData: Partial<Card>): Card | null {
    const boards = this.readBoards();
    const board = boards.find(b => b.projectId === projectId);

    if (!board) {
      return null;
    }

    const column = board.columns.find(col => col.id === columnId);
    if (!column) {
      return null;
    }

    const newCard: Card = {
      id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: cardData.title || 'Untitled',
      description: cardData.description || '',
      assignees: cardData.assignees || [],
      milestone: cardData.milestone,
      priority: cardData.priority || 'medium',
      labels: cardData.labels || [],
      columnId,
      createdAt: new Date(),
      updatedAt: new Date(),
      dueDate: cardData.dueDate,
      position: column.cards.length
    };

    column.cards.push(newCard);
    this.writeBoards(boards);

    return newCard;
  }

  static updateCard(projectId: string, cardId: string, updates: Partial<Card>): Card | null {
    const boards = this.readBoards();
    const board = boards.find(b => b.projectId === projectId);

    if (!board) {
      return null;
    }

    for (const column of board.columns) {
      const cardIndex = column.cards.findIndex(card => card.id === cardId);
      if (cardIndex !== -1) {
        column.cards[cardIndex] = {
          ...column.cards[cardIndex],
          ...updates,
          updatedAt: new Date()
        };
        this.writeBoards(boards);
        return column.cards[cardIndex];
      }
    }

    return null;
  }

  static deleteCard(projectId: string, cardId: string): boolean {
    const boards = this.readBoards();
    const board = boards.find(b => b.projectId === projectId);

    if (!board) {
      return false;
    }

    for (const column of board.columns) {
      const cardIndex = column.cards.findIndex(card => card.id === cardId);
      if (cardIndex !== -1) {
        column.cards.splice(cardIndex, 1);
        this.writeBoards(boards);
        return true;
      }
    }

    return false;
  }

  static moveCard(
    projectId: string,
    cardId: string,
    sourceColumnId: string,
    destinationColumnId: string,
    destinationIndex: number
  ): boolean {
    const boards = this.readBoards();
    const board = boards.find(b => b.projectId === projectId);

    if (!board) {
      return false;
    }

    const sourceColumn = board.columns.find(col => col.id === sourceColumnId);
    const destinationColumn = board.columns.find(col => col.id === destinationColumnId);

    if (!sourceColumn || !destinationColumn) {
      return false;
    }

    const cardIndex = sourceColumn.cards.findIndex(card => card.id === cardId);
    if (cardIndex === -1) {
      return false;
    }

    const [card] = sourceColumn.cards.splice(cardIndex, 1);
    card.columnId = destinationColumnId;
    card.updatedAt = new Date();

    destinationColumn.cards.splice(destinationIndex, 0, card);

    // Update positions
    destinationColumn.cards.forEach((card, index) => {
      card.position = index;
    });

    this.writeBoards(boards);
    return true;
  }
}