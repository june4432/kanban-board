import { getDatabase } from '../database';
import { UserRepository } from './user.repository';
import { ProjectRepository } from './project.repository';
import { BoardRepository } from './board.repository';
import { CardRepository } from './card.repository';

/**
 * Get repository instances (singleton pattern via shared database connection)
 */
export function getRepositories() {
  const db = getDatabase();

  return {
    users: new UserRepository(db),
    projects: new ProjectRepository(db),
    boards: new BoardRepository(db),
    cards: new CardRepository(db),
  };
}

export { UserRepository, ProjectRepository, BoardRepository, CardRepository };
