export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  password?: string; // 클라이언트에서는 보통 제외
  role?: 'admin' | 'user';
  companyId?: string;
  companyRole?: 'owner' | 'admin' | 'member';
  status?: 'active' | 'invited' | 'disabled';
  createdAt?: Date;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'user';
  companyId?: string;
  companyRole?: 'owner' | 'admin' | 'member';
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
  assignees: string[]; // 여러 담당자 지원 (userId 배열)
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

export interface ProjectMember {
  userId: string;
  role: 'owner' | 'member';
  joinedAt: Date;
}

export interface Project {
  projectId: string;  // id → projectId 통일
  name: string;
  description?: string;
  ownerId: string;
  companyId?: string;  // Company ID (tenant)
  organizationId?: string;  // Organization ID (team/department)
  members: User[];  // UI용으로 User[] 사용 (API에서 변환해서 보냄)
  createdAt: Date;
  updatedAt: Date;
  color?: string;
  isPublic: boolean;  // 프로젝트 공개 여부
  pendingRequests: ProjectJoinRequest[];  // 대기 중인 가입 신청
  slackWebhookUrl?: string;  // Slack Incoming Webhook URL
  slackEnabled?: boolean;  // Slack 알림 활성화 여부
}

export interface ProjectJoinRequest {
  id: string;
  userId: string;
  user: User;
  projectId: string;
  message?: string;  // 신청 메시지
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

export interface Board {
  boardId: string;     // id → boardId 통일
  projectId: string;   // 프로젝트 연결
  columns: Column[];
  labels: Label[];
  milestones: Milestone[];
  // title, users, ownerId, createdAt 제거 (projects에 있음)
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

export type ViewMode = 'kanban' | 'calendar' | 'gantt' | 'table' | 'manual' | 'dashboard';

export interface KanbanState {
  board: Board;
  filter: FilterState;
  viewMode: ViewMode;
}