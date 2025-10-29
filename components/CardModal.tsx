import React, { useState, useEffect } from 'react';
import { Card, User, Label, Milestone, Priority } from '@/types';
import { X, Calendar, User as UserIcon, Flag, Target, Tag, Plus, Check } from 'lucide-react';

interface CardModalProps {
  card?: Card;
  isOpen: boolean;
  users: User[];
  labels: Label[];
  milestones: Milestone[];
  onSave: (cardData: Partial<Card>) => void;
  onClose: () => void;
  onCreateLabel: (name: string, color: string) => Promise<Label>;
  onCreateMilestone: (name: string, dueDate: Date, description?: string) => Promise<Milestone>;
}

const CardModal: React.FC<CardModalProps> = ({
  card,
  isOpen,
  users,
  labels,
  milestones,
  onSave,
  onClose,
  onCreateLabel,
  onCreateMilestone
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigneeIds: [] as string[], // 여러 담당자 지원
    milestoneId: '',
    priority: 'medium' as Priority,
    labelIds: [] as string[],
    dueDate: ''
  });

  const [showNewLabel, setShowNewLabel] = useState(false);
  const [showNewMilestone, setShowNewMilestone] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3b82f6');
  const [newMilestoneName, setNewMilestoneName] = useState('');
  const [newMilestoneDueDate, setNewMilestoneDueDate] = useState('');
  const [newMilestoneDescription, setNewMilestoneDescription] = useState('');
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);

  useEffect(() => {
    if (card) {
      setFormData({
        title: card.title,
        description: card.description,
        assigneeIds: card.assignees || [], // 여러 담당자 지원
        milestoneId: card.milestone?.id || '',
        priority: card.priority,
        labelIds: card.labels.map(label => label.id),
        dueDate: card.dueDate ? (new Date(card.dueDate).toISOString().split('T')[0] || '') : ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        assigneeIds: [],
        milestoneId: '',
        priority: 'medium',
        labelIds: [],
        dueDate: ''
      });
    }
  }, [card, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cardData: Partial<Card> = {
      title: formData.title,
      description: formData.description,
      assignees: formData.assigneeIds, // 여러 담당자 지원
      milestone: formData.milestoneId ? milestones.find(m => m.id === formData.milestoneId) : undefined,
      priority: formData.priority,
      labels: labels.filter(label => formData.labelIds.includes(label.id)),
      dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined
    };

    onSave(cardData);
    onClose();
  };

  const handleCreateLabel = async () => {
    if (newLabelName.trim()) {
      const label = await onCreateLabel(newLabelName.trim(), newLabelColor);
      setFormData(prev => ({
        ...prev,
        labelIds: [...prev.labelIds, label.id]
      }));
      setNewLabelName('');
      setNewLabelColor('#3b82f6');
      setShowNewLabel(false);
    }
  };

  const handleCreateMilestone = async () => {
    if (newMilestoneName.trim() && newMilestoneDueDate) {
      const milestone = await onCreateMilestone(
        newMilestoneName.trim(),
        new Date(newMilestoneDueDate),
        newMilestoneDescription.trim() || undefined
      );
      setFormData(prev => ({
        ...prev,
        milestoneId: milestone.id
      }));
      setNewMilestoneName('');
      setNewMilestoneDueDate('');
      setNewMilestoneDescription('');
      setShowNewMilestone(false);
    }
  };

  const toggleLabel = (labelId: string) => {
    setFormData(prev => ({
      ...prev,
      labelIds: prev.labelIds.includes(labelId)
        ? prev.labelIds.filter(id => id !== labelId)
        : [...prev.labelIds, labelId]
    }));
  };

  // 검색된 사용자 목록 필터링
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(assigneeSearch.toLowerCase())
  );

  // 선택된 사용자들
  const selectedUsers = users.filter(user => formData.assigneeIds.includes(user.id));

  // 드롭다운 외부 클릭 시 닫기
  const handleClickOutside = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowAssigneeDropdown(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-black bg-opacity-50" onClick={onClose} />

        <div 
          className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-background border border-border/50 shadow-xl rounded-lg sm:max-w-lg"
          onClick={() => setShowAssigneeDropdown(false)}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-foreground">
              {card ? '카드 편집' : '새 카드 생성'}
            </h3>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                제목 *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-foreground"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-foreground"
              />
            </div>

            {/* Assignees */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                <UserIcon className="w-4 h-4 inline mr-1" />
                담당자 (여러 명 선택 가능)
              </label>
              
              {/* 선택된 담당자들 표시 */}
              {selectedUsers.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {selectedUsers.map(user => (
                    <span
                      key={user.id}
                      className="inline-flex items-center px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                    >
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-4 h-4 rounded-full mr-1"
                      />
                      {user.name}
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          assigneeIds: prev.assigneeIds.filter(id => id !== user.id)
                        }))}
                        className="ml-1 text-primary hover:text-primary/80"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* 검색 입력 */}
              <div 
                className="relative"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  placeholder="담당자 검색..."
                  value={assigneeSearch}
                  onChange={(e) => {
                    setAssigneeSearch(e.target.value);
                    setShowAssigneeDropdown(true);
                  }}
                  onFocus={() => setShowAssigneeDropdown(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowAssigneeDropdown(false);
                    }
                    // Enter 키는 드롭다운을 유지
                  }}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-foreground"
                />
                
                {/* 드롭다운 */}
                {showAssigneeDropdown && (
                  <div 
                    className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
                  >
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map(user => (
                        <div
                          key={user.id}
                          onClick={() => {
                            if (formData.assigneeIds.includes(user.id)) {
                              setFormData(prev => ({
                                ...prev,
                                assigneeIds: prev.assigneeIds.filter(id => id !== user.id)
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                assigneeIds: [...prev.assigneeIds, user.id]
                              }));
                            }
                            // 드롭다운을 유지하고 검색 입력도 유지
                          }}
                          className={`flex items-center space-x-3 px-3 py-2 hover:bg-accent cursor-pointer ${
                            formData.assigneeIds.includes(user.id) ? 'bg-accent' : ''
                          }`}
                        >
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-6 h-6 rounded-full"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-foreground">{user.name}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </div>
                          {formData.assigneeIds.includes(user.id) && (
                            <div className="text-primary">
                              <Check className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground">검색 결과가 없습니다</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                <Flag className="w-4 h-4 inline mr-1" />
                우선순위
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Priority }))}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-foreground"
              >
                <option value="low">낮음</option>
                <option value="medium">보통</option>
                <option value="high">높음</option>
                <option value="urgent">긴급</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                마감일
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-foreground"
              />
            </div>

            {/* Milestone */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-foreground">
                  <Target className="w-4 h-4 inline mr-1" />
                  마일스톤
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewMilestone(true)}
                  className="text-sm text-primary hover:text-primary/80"
                >
                  <Plus className="w-3 h-3 inline mr-1" />
                  새 마일스톤
                </button>
              </div>
              
              {showNewMilestone ? (
                <div className="space-y-2 p-3 border border-border rounded-md bg-muted/50">
                  <input
                    type="text"
                    value={newMilestoneName}
                    onChange={(e) => setNewMilestoneName(e.target.value)}
                    placeholder="마일스톤 이름"
                    className="w-full px-2 py-1 text-sm border border-border rounded bg-input text-foreground"
                  />
                  <input
                    type="date"
                    value={newMilestoneDueDate}
                    onChange={(e) => setNewMilestoneDueDate(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-border rounded bg-input text-foreground"
                  />
                  <textarea
                    value={newMilestoneDescription}
                    onChange={(e) => setNewMilestoneDescription(e.target.value)}
                    placeholder="설명 (선택사항)"
                    rows={2}
                    className="w-full px-2 py-1 text-sm border border-border rounded bg-input text-foreground"
                  />
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handleCreateMilestone}
                      className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                    >
                      생성
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewMilestone(false)}
                      className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <select
                  value={formData.milestoneId}
                  onChange={(e) => setFormData(prev => ({ ...prev, milestoneId: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-foreground"
                >
                  <option value="">마일스톤 선택</option>
                  {milestones.map(milestone => (
                    <option key={milestone.id} value={milestone.id}>{milestone.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Labels */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-foreground">
                  <Tag className="w-4 h-4 inline mr-1" />
                  라벨
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewLabel(true)}
                  className="text-sm text-primary hover:text-primary/80"
                >
                  <Plus className="w-3 h-3 inline mr-1" />
                  새 라벨
                </button>
              </div>

              {showNewLabel ? (
                <div className="space-y-2 p-3 border border-border rounded-md bg-muted/50">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      placeholder="라벨 이름"
                      className="flex-1 px-2 py-1 text-sm border border-border rounded bg-input text-foreground"
                    />
                    <input
                      type="color"
                      value={newLabelColor}
                      onChange={(e) => setNewLabelColor(e.target.value)}
                      className="w-12 h-8 border border-border rounded"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handleCreateLabel}
                      className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                    >
                      생성
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewLabel(false)}
                      className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {labels.map(label => (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => toggleLabel(label.id)}
                      className={`px-3 py-1 text-sm rounded-full transition-opacity ${
                        formData.labelIds.includes(label.id) ? 'opacity-100' : 'opacity-50'
                      }`}
                      style={{
                        backgroundColor: label.color,
                        color: 'white'
                      }}
                    >
                      {label.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-secondary-foreground bg-secondary rounded-md hover:bg-secondary/80 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                {card ? '수정' : '생성'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CardModal;