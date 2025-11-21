import { UserRepository } from './user.repository';
import { ProjectRepository } from './project.repository';
import { BoardRepository } from './board.repository';
import { CardRepository } from './card.repository';
import { CommentRepository } from './comment.repository';
import { AttachmentRepository } from './attachment.repository';
import { NotificationSettingsRepository } from './notification-settings.repository';
import { OrganizationRepository } from './organization.repository';
import { AuditLogRepository } from './audit-log.repository';

/**
 * Get repository instances
 * All repositories now use PostgreSQL via lib/postgres.ts
 */
export function getRepositories() {
  return {
    users: new UserRepository(),
    organizations: new OrganizationRepository(),
    projects: new ProjectRepository(),
    boards: new BoardRepository(),
    cards: new CardRepository(),
    comments: new CommentRepository(),
    attachments: new AttachmentRepository(),
    notificationSettings: new NotificationSettingsRepository(),
    auditLogs: new AuditLogRepository(),
  };
}

export {
  UserRepository,
  OrganizationRepository,
  ProjectRepository,
  BoardRepository,
  CardRepository,
  CommentRepository,
  AttachmentRepository,
  NotificationSettingsRepository,
  AuditLogRepository,
};
