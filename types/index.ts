export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
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