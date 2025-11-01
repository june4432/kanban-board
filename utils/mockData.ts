import { Board, User, Label, Milestone, Card, Priority } from '@/types';

export const mockUsers: User[] = [
  {
    id: '1',
    name: '김철수',
    email: 'kim@example.com',
    avatar: 'https://ui-avatars.com/api/?name=김철수&background=3b82f6&color=fff'
  },
  {
    id: '2',
    name: '박영희',
    email: 'park@example.com',
    avatar: 'https://ui-avatars.com/api/?name=박영희&background=10b981&color=fff'
  },
  {
    id: '3',
    name: '이민수',
    email: 'lee@example.com',
    avatar: 'https://ui-avatars.com/api/?name=이민수&background=f59e0b&color=fff'
  },
  {
    id: '4',
    name: '정수진',
    email: 'jung@example.com',
    avatar: 'https://ui-avatars.com/api/?name=정수진&background=ef4444&color=fff'
  }
];

export const mockLabels: Label[] = [
  { id: '1', name: 'Bug', color: '#ef4444' },
  { id: '2', name: 'Feature', color: '#3b82f6' },
  { id: '3', name: 'Enhancement', color: '#10b981' },
  { id: '4', name: 'Documentation', color: '#f59e0b' },
  { id: '5', name: 'Backend', color: '#8b5cf6' },
  { id: '6', name: 'Frontend', color: '#06b6d4' },
  { id: '7', name: 'Design', color: '#ec4899' },
  { id: '8', name: 'Testing', color: '#84cc16' }
];

export const mockMilestones: Milestone[] = [
  {
    id: '1',
    name: 'MVP Release',
    dueDate: new Date('2024-03-15'),
    description: '최소 기능 제품 출시'
  },
  {
    id: '2',
    name: 'Beta Release',
    dueDate: new Date('2024-02-28'),
    description: '베타 버전 출시'
  },
  {
    id: '3',
    name: 'Alpha Release',
    dueDate: new Date('2024-02-15'),
    description: '알파 버전 출시'
  }
];

export const mockCards: Card[] = [
  {
    id: '1',
    title: '사용자 인증 시스템 구현',
    description: 'JWT 기반 로그인/회원가입 기능 개발',
    assignees: [mockUsers[0]!.id],
    milestone: mockMilestones[2]!,
    priority: 'high' as Priority,
    labels: [mockLabels[1]!, mockLabels[4]!],
    columnId: 'backlog',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
    dueDate: new Date('2024-02-10'),
    position: 0
  },
  {
    id: '2',
    title: '메인 대시보드 UI 디자인',
    description: '사용자 대시보드 인터페이스 디자인 및 프로토타입 제작',
    assignees: [mockUsers[3]!.id],
    milestone: mockMilestones[2]!,
    priority: 'medium' as Priority,
    labels: [mockLabels[6]!, mockLabels[5]!],
    columnId: 'todo',
    createdAt: new Date('2024-01-11'),
    updatedAt: new Date('2024-01-11'),
    dueDate: new Date('2024-02-05'),
    position: 0
  },
  {
    id: '3',
    title: 'API 엔드포인트 설계',
    description: 'RESTful API 설계 및 문서화',
    assignees: [mockUsers[1]!.id],
    milestone: mockMilestones[1]!,
    priority: 'high' as Priority,
    labels: [mockLabels[4]!, mockLabels[3]!],
    columnId: 'inprogress',
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-15'),
    dueDate: new Date('2024-02-20'),
    position: 0
  },
  {
    id: '4',
    title: '데이터베이스 스키마 최적화',
    description: '성능 향상을 위한 DB 인덱스 추가 및 쿼리 최적화',
    assignees: [mockUsers[2]!.id],
    milestone: mockMilestones[1]!,
    priority: 'medium' as Priority,
    labels: [mockLabels[2]!, mockLabels[4]!],
    columnId: 'review',
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-01-14'),
    dueDate: new Date('2024-01-25'),
    position: 0
  },
  {
    id: '5',
    title: '단위 테스트 작성',
    description: '핵심 기능에 대한 단위 테스트 코드 작성',
    assignees: [mockUsers[0]!.id],
    milestone: mockMilestones[0]!,
    priority: 'low' as Priority,
    labels: [mockLabels[7]!],
    columnId: 'done',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-13'),
    dueDate: new Date('2024-01-20'),
    position: 0
  },
  {
    id: '6',
    title: '모바일 반응형 UI 구현',
    description: '모바일 디바이스에서의 사용자 경험 최적화',
    assignees: [mockUsers[3]!.id],
    priority: 'medium' as Priority,
    labels: [mockLabels[5]!, mockLabels[6]!],
    columnId: 'backlog',
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16'),
    dueDate: new Date('2024-03-01'),
    position: 1
  }
];

export const mockBoard: Board = {
  boardId: '1',
  projectId: '1',
  columns: [
    {
      id: 'backlog',
      title: 'Backlog',
      cards: mockCards.filter(card => card.columnId === 'backlog'),
      wipLimit: 10,
      position: 0
    },
    {
      id: 'todo',
      title: 'To Do',
      cards: mockCards.filter(card => card.columnId === 'todo'),
      wipLimit: 5,
      position: 1
    },
    {
      id: 'inprogress',
      title: 'In Progress',
      cards: mockCards.filter(card => card.columnId === 'inprogress'),
      wipLimit: 3,
      position: 2
    },
    {
      id: 'review',
      title: 'Review',
      cards: mockCards.filter(card => card.columnId === 'review'),
      wipLimit: 3,
      position: 3
    },
    {
      id: 'done',
      title: 'Done',
      cards: mockCards.filter(card => card.columnId === 'done'),
      wipLimit: 20,
      position: 4
    }
  ],
  labels: mockLabels,
  milestones: mockMilestones
};