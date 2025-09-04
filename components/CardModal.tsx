import React, { useState, useEffect } from 'react';
import { Card, User, Label, Milestone, Priority } from '@/types';
import { X, Calendar, User as UserIcon, Flag, Target, Tag, Plus } from 'lucide-react';

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
    assigneeId: '',
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

  useEffect(() => {
    if (card) {
      setFormData({
        title: card.title,
        description: card.description,
        assigneeId: card.assignee?.id || '',
        milestoneId: card.milestone?.id || '',
        priority: card.priority,
        labelIds: card.labels.map(label => label.id),
        dueDate: card.dueDate ? card.dueDate.toISOString().split('T')[0] : ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        assigneeId: '',
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
      assignee: formData.assigneeId ? users.find(u => u.id === formData.assigneeId) : undefined,
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg sm:max-w-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {card ? '카드 편집' : '새 카드 생성'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                제목 *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <UserIcon className="w-4 h-4 inline mr-1" />
                담당자
              </label>
              <select
                value={formData.assigneeId}
                onChange={(e) => setFormData(prev => ({ ...prev, assigneeId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">담당자 선택</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Flag className="w-4 h-4 inline mr-1" />
                우선순위
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Priority }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="low">낮음</option>
                <option value="medium">보통</option>
                <option value="high">높음</option>
                <option value="urgent">긴급</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                마감일
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Milestone */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  <Target className="w-4 h-4 inline mr-1" />
                  마일스톤
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewMilestone(true)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  <Plus className="w-3 h-3 inline mr-1" />
                  새 마일스톤
                </button>
              </div>
              
              {showNewMilestone ? (
                <div className="space-y-2 p-3 border border-gray-200 rounded-md">
                  <input
                    type="text"
                    value={newMilestoneName}
                    onChange={(e) => setNewMilestoneName(e.target.value)}
                    placeholder="마일스톤 이름"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                  <input
                    type="date"
                    value={newMilestoneDueDate}
                    onChange={(e) => setNewMilestoneDueDate(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                  <textarea
                    value={newMilestoneDescription}
                    onChange={(e) => setNewMilestoneDescription(e.target.value)}
                    placeholder="설명 (선택사항)"
                    rows={2}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handleCreateMilestone}
                      className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                    >
                      생성
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewMilestone(false)}
                      className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <select
                  value={formData.milestoneId}
                  onChange={(e) => setFormData(prev => ({ ...prev, milestoneId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-gray-700">
                  <Tag className="w-4 h-4 inline mr-1" />
                  라벨
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewLabel(true)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  <Plus className="w-3 h-3 inline mr-1" />
                  새 라벨
                </button>
              </div>

              {showNewLabel ? (
                <div className="space-y-2 p-3 border border-gray-200 rounded-md">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      placeholder="라벨 이름"
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                    <input
                      type="color"
                      value={newLabelColor}
                      onChange={(e) => setNewLabelColor(e.target.value)}
                      className="w-12 h-8 border border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handleCreateLabel}
                      className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                    >
                      생성
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewLabel(false)}
                      className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
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
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
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