import { getDatabase } from '../database';
import { UserRepository } from './user.repository';
import { ProjectRepository } from './project.repository';
import { BoardRepository } from './board.repository';
import { CardRepository } from './card.repository';
import { CommentRepository } from './comment.repository';
import { AttachmentRepository } from './attachment.repository';
import { NotificationSettingsRepository } from './notification-settings.repository';

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
    comments: new CommentRepository(db),
    attachments: new AttachmentRepository(db),
    notificationSettings: new NotificationSettingsRepository(db),
  };
}

export { UserRepository, ProjectRepository, BoardRepository, CardRepository, CommentRepository, AttachmentRepository, NotificationSettingsRepository };
