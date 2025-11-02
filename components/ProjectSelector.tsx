import React, { useState, useEffect } from 'react';
import { Project, AuthUser } from '@/types';
import { Plus, FolderOpen, Settings, Search, Globe, Lock, UserPlus, Clock, Users, LogOut, User, X, GripVertical, Trash2 } from 'lucide-react';
import ProjectSettingsModal from './ProjectSettingsModal';
import { useAuth } from '@/contexts/AuthContext';

interface ProjectSelectorProps {
  user: AuthUser;
  selectedProject?: Project;
  onProjectSelect: (project: Project) => void;
  onProjectCreate: (projectData: { name: string; description?: string; color?: string }) => void;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  user,
  selectedProject: _selectedProject,
  onProjectSelect,
  onProjectCreate: _onProjectCreate
}) => {
  const { logout } = useAuth();
  
  // 전역 WebSocket 이벤트 처리는 GlobalWebSocketManager에서 담당
  
  
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [publicProjects, setPublicProjects] = useState<Project[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'my' | 'public'>('my');
  const [settingsProject, setSettingsProject] = useState<Project | null>(null);
  const [projectSettingsTab, setProjectSettingsTab] = useState<'general' | 'members' | 'requests' | 'columns' | 'invites' | 'integrations'>('general');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    isPublic: false,
    columnTemplate: 'default' as 'default' | 'simple' | 'scrum' | 'custom',
    customColumns: [
      { title: 'Backlog', wipLimit: 10 },
      { title: 'To Do', wipLimit: 5 },
      { title: 'In Progress', wipLimit: 3 },
      { title: 'Done', wipLimit: 0 }
    ]
  });

  useEffect(() => {
    fetchProjects();
  }, [user.id]);

  // 프로젝트 참여 신청은 전체 브로드캐스트이므로 별도 룸 참여 불필요

  const fetchProjects = async () => {
    try {
      const [myResponse, publicResponse] = await Promise.all([
        fetch(`/api/projects/my?userId=${user.id}`),
        fetch('/api/projects/public')
      ]);
      
      const [myData, publicData] = await Promise.all([
        myResponse.json(),
        publicResponse.json()
      ]);
      
      setMyProjects(myData.projects || []);
      setPublicProjects(publicData.projects || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const columnTemplates = {
    default: [
      { title: 'Backlog', wipLimit: 10 },
      { title: 'To Do', wipLimit: 5 },
      { title: 'In Progress', wipLimit: 3 },
      { title: 'Done', wipLimit: 0 }
    ],
    simple: [
      { title: 'To Do', wipLimit: 10 },
      { title: 'Doing', wipLimit: 5 },
      { title: 'Done', wipLimit: 0 }
    ],
    scrum: [
      { title: 'Product Backlog', wipLimit: 20 },
      { title: 'Sprint Backlog', wipLimit: 10 },
      { title: 'In Progress', wipLimit: 5 },
      { title: 'Review', wipLimit: 5 },
      { title: 'Done', wipLimit: 0 }
    ],
    custom: formData.customColumns
  };

  const handleTemplateChange = (template: 'default' | 'simple' | 'scrum' | 'custom') => {
    setFormData(prev => ({
      ...prev,
      columnTemplate: template,
      customColumns: template === 'custom' ? prev.customColumns : columnTemplates[template]
    }));
  };

  const addCustomColumn = () => {
    setFormData(prev => ({
      ...prev,
      customColumns: [...prev.customColumns, { title: '', wipLimit: 5 }]
    }));
  };

  const removeCustomColumn = (index: number) => {
    setFormData(prev => ({
      ...prev,
      customColumns: prev.customColumns.filter((_, i) => i !== index)
    }));
  };

  const updateCustomColumn = (index: number, field: 'title' | 'wipLimit', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      customColumns: prev.customColumns.map((col, i) =>
        i === index ? { ...col, [field]: value } : col
      )
    }));
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const columns = formData.columnTemplate === 'custom'
        ? formData.customColumns
        : columnTemplates[formData.columnTemplate];

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          color: formData.color,
          isPublic: formData.isPublic,
          ownerId: user.id,
          columns
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newProject = data.project;
        setMyProjects(prev => [...prev, newProject]);
        onProjectSelect(newProject);
        setFormData({
          name: '',
          description: '',
          color: '#3b82f6',
          isPublic: false,
          columnTemplate: 'default',
          customColumns: [
            { title: 'Backlog', wipLimit: 10 },
            { title: 'To Do', wipLimit: 5 },
            { title: 'In Progress', wipLimit: 3 },
            { title: 'Done', wipLimit: 0 }
          ]
        });
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleJoinRequest = async (projectId: string) => {
    const message = prompt('참여 신청 메시지를 입력하세요 (선택사항):');
    
    try {
      const response = await fetch(`/api/projects/${projectId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          message: message || ''
        }),
      });

      if (response.ok) {
        alert('참여 신청이 완료되었습니다. 프로젝트 관리자의 승인을 기다려주세요.');
        fetchProjects(); // 상태 업데이트
      }
    } catch (error) {
      console.error('Failed to send join request:', error);
    }
  };

  const isUserInProject = (project: Project) => {
    // 프로젝트 소유자이거나 멤버인지 확인
    return project.ownerId === user.id || project.members.some(member => member.id === user.id);
  };

  const hasUserRequested = (project: Project) => {
    return project.pendingRequests?.some(
      request => request.userId === user.id && request.status === 'pending'
    ) || false;
  };

  const filteredMyProjects = myProjects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPublicProjects = publicProjects.filter(project => {
    // 검색어 필터링
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    // 이미 가입된 프로젝트는 제외
    const notJoined = !isUserInProject(project);
    
    return matchesSearch && notJoined;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Top Navigation Bar */}
      <nav className="bg-card/80 border-b border-border sticky top-0 z-40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-purple-600 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-card-foreground">프로젝트 관리</h1>
                <p className="text-sm text-muted-foreground">팀과 함께 협업하세요</p>
              </div>
            </div>
            
            {/* User Menu */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-3 px-4 py-2 bg-muted rounded-full hover:bg-accent transition-colors">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full ring-2 ring-card shadow-sm"
                />
                <div className="text-sm hidden sm:block">
                  <div className="font-medium text-card-foreground">{user.name}</div>
                  <div className="text-muted-foreground text-xs">{user.email}</div>
                </div>
              </div>
              
              <button
                onClick={logout}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
                title="로그아웃"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {filteredMyProjects.length === 0 && activeTab === 'my' 
                ? '프로젝트를 시작해보세요' 
                : '프로젝트 선택'
              }
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {filteredMyProjects.length === 0 && activeTab === 'my' 
                ? '새로운 프로젝트를 생성하거나 팀원들과 함께 공개 프로젝트에 참여할 수 있습니다.'
                : '참여 중인 프로젝트를 선택하거나 새로운 프로젝트를 만들어보세요.'
              }
            </p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="relative mb-8">
          {/* Background with subtle gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-accent/30 to-accent/10 rounded-2xl"></div>
          
          <div className="relative bg-card/80 backdrop-blur-sm rounded-2xl shadow-lg border border-border/20 p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0 lg:space-x-8">
              
              {/* Search Section */}
              <div className="flex-1 max-w-lg">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="프로젝트를 검색해보세요..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-12 pr-4 py-4 text-foreground placeholder:text-muted-foreground bg-input/60 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring focus:bg-input transition-all duration-200 shadow-sm hover:shadow-md"
                  />
                  {searchQuery && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Create Button */}
              <div className="flex-shrink-0">
          <button
            onClick={() => setShowCreateForm(true)}
                  className="group relative inline-flex items-center justify-center space-x-3 px-8 py-4 bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 transform hover:-translate-y-1 hover:scale-105"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-purple-600 to-purple-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  <Plus className="relative w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
                  <span className="relative">새 프로젝트 만들기</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 p-1 bg-muted rounded-xl">
            <button
              onClick={() => setActiveTab('my')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'my'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="w-4 h-4" />
              <span>내 프로젝트</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                activeTab === 'my' ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/20 text-muted-foreground'
              }`}>
                {filteredMyProjects.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('public')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'public'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>공개 프로젝트</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                activeTab === 'public' ? 'bg-success/10 text-success-foreground' : 'bg-muted-foreground/20 text-muted-foreground'
              }`}>
                {filteredPublicProjects.length}
              </span>
          </button>
          </div>
        </div>

        {/* Create Project Form */}
        {showCreateForm && (
          <div className="mb-8 bg-background rounded-2xl shadow-lg border border-border overflow-hidden">
            <div className="bg-gradient-to-r from-primary/5 to-accent px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">새 프로젝트 생성</h3>
              <p className="text-sm text-muted-foreground mt-1">팀과 함께할 새로운 프로젝트를 만들어보세요</p>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreateProject} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-foreground mb-2">
                  프로젝트 이름 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-all text-foreground placeholder:text-muted-foreground"
                      placeholder="멋진 프로젝트 이름을 지어주세요"
                  required
                />
              </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      프로젝트 설명
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                      className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
                      placeholder="프로젝트에 대해 간단히 설명해주세요"
                />
              </div>
                  
              <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      테마 색상
                </label>
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                          className="w-12 h-12 rounded-xl border-2 border-border cursor-pointer"
                  />
                      </div>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                        className="flex-1 px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      공개 설정
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center p-3 bg-muted rounded-xl cursor-pointer hover:bg-accent transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.isPublic}
                          onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                          className="w-5 h-5 text-primary focus:ring-primary border-border rounded"
                        />
                        <div className="ml-3 flex items-center space-x-2">
                          {formData.isPublic ? (
                            <Globe className="w-5 h-5 text-success-foreground" />
                          ) : (
                            <Lock className="w-5 h-5 text-muted-foreground" />
                          )}
                          <div>
                            <span className="text-sm font-medium text-foreground">
                              {formData.isPublic ? '공개 프로젝트' : '비공개 프로젝트'}
                            </span>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formData.isPublic
                                ? '다른 사용자가 검색하고 참여 신청할 수 있습니다'
                                : '초대받은 사용자만 참여할 수 있습니다'
                              }
                            </p>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 컬럼 템플릿 선택 */}
                <div className="border-t border-border pt-6">
                  <label className="block text-sm font-semibold text-foreground mb-3">
                    보드 컬럼 템플릿
                  </label>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      type="button"
                      onClick={() => handleTemplateChange('default')}
                      className={`p-4 border-2 rounded-xl text-left transition-all ${
                        formData.columnTemplate === 'default'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium text-foreground mb-1">기본 (4컬럼)</div>
                      <div className="text-xs text-muted-foreground">Backlog → To Do → In Progress → Done</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTemplateChange('simple')}
                      className={`p-4 border-2 rounded-xl text-left transition-all ${
                        formData.columnTemplate === 'simple'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium text-foreground mb-1">간단 (3컬럼)</div>
                      <div className="text-xs text-muted-foreground">To Do → Doing → Done</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTemplateChange('scrum')}
                      className={`p-4 border-2 rounded-xl text-left transition-all ${
                        formData.columnTemplate === 'scrum'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium text-foreground mb-1">스크럼 (5컬럼)</div>
                      <div className="text-xs text-muted-foreground">Product Backlog → Sprint...</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTemplateChange('custom')}
                      className={`p-4 border-2 rounded-xl text-left transition-all ${
                        formData.columnTemplate === 'custom'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium text-foreground mb-1">커스텀</div>
                      <div className="text-xs text-muted-foreground">직접 설정</div>
                    </button>
                  </div>

                  {/* 커스텀 컬럼 설정 */}
                  {formData.columnTemplate === 'custom' && (
                    <div className="space-y-3 p-4 bg-muted rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">컬럼 설정</span>
                        <button
                          type="button"
                          onClick={addCustomColumn}
                          className="flex items-center space-x-1 px-3 py-1 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                        >
                          <Plus className="w-4 h-4" />
                          <span>컬럼 추가</span>
                        </button>
                      </div>

                      {formData.customColumns.map((column, index) => (
                        <div key={index} className="flex items-center space-x-2 bg-background p-3 rounded-lg">
                          <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <input
                            type="text"
                            value={column.title}
                            onChange={(e) => updateCustomColumn(index, 'title', e.target.value)}
                            placeholder="컬럼 이름"
                            className="flex-1 px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                            required
                          />
                          <div className="flex items-center space-x-2">
                            <label className="text-xs text-muted-foreground whitespace-nowrap">WIP:</label>
                            <input
                              type="number"
                              value={column.wipLimit}
                              onChange={(e) => updateCustomColumn(index, 'wipLimit', parseInt(e.target.value) || 0)}
                              min="0"
                              className="w-16 px-2 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-center"
                            />
                          </div>
                          {formData.customColumns.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeCustomColumn(index)}
                              className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 템플릿 미리보기 */}
                  {formData.columnTemplate !== 'custom' && (
                    <div className="p-4 bg-muted rounded-xl">
                      <div className="text-xs font-medium text-muted-foreground mb-2">컬럼 미리보기:</div>
                      <div className="flex space-x-2 overflow-x-auto pb-2">
                        {columnTemplates[formData.columnTemplate].map((col, idx) => (
                          <div key={idx} className="flex-shrink-0 px-3 py-2 bg-background rounded-lg border border-border">
                            <div className="text-xs font-medium text-foreground">{col.title}</div>
                            <div className="text-xs text-muted-foreground">WIP: {col.wipLimit}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="submit"
                    className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg hover:shadow-xl"
                >
                    프로젝트 생성
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                    className="flex-1 sm:flex-none px-6 py-3 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors font-medium"
                >
                  취소
                </button>
              </div>
            </form>
            </div>
          </div>
        )}

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(activeTab === 'my' ? filteredMyProjects : filteredPublicProjects).map((project) => {
            const userInProject = isUserInProject(project);
            const userRequested = hasUserRequested(project);
            const isOwner = project.ownerId === user.id;
            
            return (
            <div
              key={project.projectId}
                className="bg-background rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-border overflow-hidden group"
              >
                {/* Header with color stripe */}
                <div 
                  className="h-2"
                  style={{ backgroundColor: project.color }}
                />
                
                {/* Card Content */}
                <div className="p-6">
                  {/* Top section: Icon, Title, Actions */}
              <div className="flex items-start justify-between mb-4">
                    <div 
                      className={`flex items-start space-x-4 flex-1 ${userInProject ? 'cursor-pointer' : ''}`}
                      onClick={() => userInProject && onProjectSelect(project)}
                    >
                  <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: `${project.color}15` }}
                  >
                    <FolderOpen 
                          className="w-6 h-6"
                      style={{ color: project.color }}
                    />
                  </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-xl font-bold text-foreground truncate">{project.name}</h3>
                          {project.isPublic ? (
                            <div className="flex items-center space-x-1 px-2 py-1 bg-success/10 text-success-foreground rounded-full text-xs">
                              <Globe className="w-3 h-3" />
                              <span>공개</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1 px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs">
                              <Lock className="w-3 h-3" />
                              <span>비공개</span>
                            </div>
                          )}
                        </div>
                    {project.description && (
                          <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">{project.description}</p>
                    )}
                  </div>
                </div>
                  
                    <div className="flex items-center space-x-2">
                      {activeTab === 'my' && isOwner && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                            setSettingsProject(project);
                  }}
                          className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="프로젝트 설정"
                >
                  <Settings className="w-4 h-4" />
                </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Project Stats */}
                  <div className="flex items-center justify-between py-3 border-t border-border">
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{project.members.length} 멤버</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>{new Date(project.createdAt).toLocaleDateString('ko-KR')}</span>
                      </div>
                    </div>
                    
                    {isOwner && (
                      <div className="flex items-center space-x-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                        <span>관리자</span>
                      </div>
                    )}
              </div>
              
                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {activeTab === 'public' && !userInProject && (
                      userRequested ? (
                        <div className="flex items-center justify-center space-x-2 w-full py-3 bg-warning/10 text-warning-foreground rounded-lg text-sm font-medium">
                          <Clock className="w-4 h-4" />
                          <span>가입 신청 대기 중</span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoinRequest(project.projectId);
                          }}
                          className="flex items-center justify-center space-x-2 w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>프로젝트 참여 신청</span>
                        </button>
                      )
                    )}

                    {userInProject && (
                      <button
                        onClick={() => onProjectSelect(project)}
                        className="flex items-center justify-center space-x-2 w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium group-hover:shadow-md"
                      >
                        <FolderOpen className="w-4 h-4" />
                        <span>{activeTab === 'my' ? '프로젝트로 이동' : '프로젝트 열기'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {(activeTab === 'my' ? filteredMyProjects : filteredPublicProjects).length === 0 && (
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            {activeTab === 'my' ? (
              <>
                <h3 className="text-lg font-medium text-foreground mb-2">내 프로젝트가 없습니다</h3>
                <p className="text-muted-foreground mb-6">첫 번째 프로젝트를 생성하거나 다른 프로젝트에 참여해보세요</p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={() => setShowCreateForm(true)}
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>새 프로젝트 생성</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('public')}
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                  >
                    <Search className="w-4 h-4" />
                    <span>공개 프로젝트 찾기</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {searchQuery ? '검색 결과가 없습니다' : '공개 프로젝트가 없습니다'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery 
                    ? '다른 검색어를 시도해보세요' 
                    : '아직 공개된 프로젝트가 없습니다. 새 프로젝트를 생성해보세요!'
                  }
                </p>
                
                {!searchQuery && (
                  <button
                    onClick={() => {
                      setActiveTab('my');
                      setShowCreateForm(true);
                    }}
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
                    <span>첫 번째 프로젝트 생성하기</span>
            </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Project Settings Modal */}
        {settingsProject && (
          <ProjectSettingsModal
            project={settingsProject}
            currentUser={user}
            isOpen={!!settingsProject}
            onClose={() => {
              setSettingsProject(null);
              setProjectSettingsTab('general'); // 모달 닫을 때 탭 리셋
            }}
            onProjectUpdate={(updatedProject) => {
              setMyProjects(prev =>
                prev.map(p => p.projectId === updatedProject.projectId ? updatedProject : p)
              );
              setSettingsProject(null);
            }}
            onBoardUpdate={fetchProjects}
            activeTab={projectSettingsTab}
            onTabChange={setProjectSettingsTab}
          />
        )}
        
        {/* Toast Container */}
      </div>
    </div>
  );
};

export default ProjectSelector;