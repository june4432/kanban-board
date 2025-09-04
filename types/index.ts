export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  password?: string; // 클라이언트에서는 보통 제외
  role?: 'admin' | 'user';
  createdAt?: Date;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'user';
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Milestone {
  id: string;
  name: string;
  dueDate: Date;
  description?: string;
}

export interface Card {
  id: string;
  title: string;
  description: string;
  assignee?: User;
  milestone?: Milestone;
  priority: Priority;
  labels: Label[];
  columnId: string;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  position: number;
}

export interface Column {
  id: string;
  title: string;
  cards: Card[];
  wipLimit: number;
  position: number;
}

export interface Board {
  id: string;
  title: string;
  columns: Column[];
  users: User[];
  labels: Label[];
  milestones: Milestone[];
  ownerId?: string; // 보드 소유자 ID
  createdAt?: Date;
}

export interface FilterState {
  searchText: string;
  selectedLabels: string[];
  selectedAssignees: string[];
  dateRange: {
    start?: Date;
    end?: Date;
  };
  priorities: Priority[];
}

export type ViewMode = 'kanban' | 'calendar' | 'gantt' | 'manual';

export interface KanbanState {
  board: Board;
  filter: FilterState;
  viewMode: ViewMode;
}