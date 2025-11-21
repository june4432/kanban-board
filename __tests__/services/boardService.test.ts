import { BoardService } from '@/services/boardService';
import { Board, Card } from '@/types';

// Mock fs module
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

describe('BoardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBoard', () => {
    it('should return a board by projectId', () => {
      const mockBoards: Board[] = [
        {
          boardId: 'board_1',
          projectId: 'project_1',
          columns: [],
          labels: [],
          milestones: []
        }
      ];

      const fs = require('fs');
      fs.readFileSync.mockReturnValue(JSON.stringify(mockBoards));

      const board = BoardService.getBoard('project_1');
      expect(board).toEqual(mockBoards[0]);
    });

    it('should return null if board not found', () => {
      const fs = require('fs');
      fs.readFileSync.mockReturnValue(JSON.stringify([]));

      const board = BoardService.getBoard('non_existent');
      expect(board).toBeNull();
    });
  });

  describe('createBoard', () => {
    it('should create a new board with default columns', () => {
      const fs = require('fs');
      fs.readFileSync.mockReturnValue(JSON.stringify([]));

      const board = BoardService.createBoard('project_1');

      expect(board.projectId).toBe('project_1');
      expect(board.columns).toHaveLength(5);
      expect(board.columns[0]?.title).toBe('Backlog');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('createCard', () => {
    it('should create a new card in specified column', () => {
      const mockBoard: Board = {
        boardId: 'board_1',
        projectId: 'project_1',
        columns: [
          { id: 'todo', title: 'To Do', cards: [], wipLimit: 5, position: 0 }
        ],
        labels: [],
        milestones: []
      };

      const fs = require('fs');
      fs.readFileSync.mockReturnValue(JSON.stringify([mockBoard]));

      const cardData: Partial<Card> = {
        title: 'Test Card',
        description: 'Test Description',
        priority: 'high'
      };

      const card = BoardService.createCard('project_1', 'todo', cardData);

      expect(card).not.toBeNull();
      expect(card?.title).toBe('Test Card');
      expect(card?.columnId).toBe('todo');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });
});