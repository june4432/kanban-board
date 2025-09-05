import React, { useState, useEffect, useCallback } from 'react';
import { Project, AuthUser } from '@/types';
import { Plus, FolderOpen, Settings, Search, Globe, Lock, UserPlus, Clock, Users, LogOut, User, X } from 'lucide-react';
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
  selectedProject,
  onProjectSelect,
  onProjectCreate
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
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    isPublic: false
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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          ownerId: user.id
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newProject = data.project;
        setMyProjects(prev => [...prev, newProject]);
        onProjectSelect(newProject);
        setFormData({ name: '', description: '', color: '#3b82f6', isPublic: false });
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 backdrop-blur-sm bg-white/95">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">프로젝트 관리</h1>
                <p className="text-sm text-gray-500">팀과 함께 협업하세요</p>
              </div>
            </div>
            
            {/* User Menu */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-3 px-4 py-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full ring-2 ring-white shadow-sm"
                />
                <div className="text-sm hidden sm:block">
                  <div className="font-medium text-gray-900">{user.name}</div>
                  <div className="text-gray-500 text-xs">{user.email}</div>
                </div>
              </div>
              
              <button
                onClick={logout}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {filteredMyProjects.length === 0 && activeTab === 'my' 
                ? '프로젝트를 시작해보세요' 
                : '프로젝트 선택'
              }
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
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
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-purple-50/50 rounded-2xl"></div>
          
          <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0 lg:space-x-8">
              
              {/* Search Section */}
              <div className="flex-1 max-w-lg">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="프로젝트를 검색해보세요..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-12 pr-4 py-4 text-gray-900 placeholder-gray-500 bg-white/60 border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-white transition-all duration-200 shadow-sm hover:shadow-md"
                  />
                  {searchQuery && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
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
          <div className="flex space-x-1 p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setActiveTab('my')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'my'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <User className="w-4 h-4" />
              <span>내 프로젝트</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                activeTab === 'my' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'
              }`}>
                {filteredMyProjects.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('public')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'public'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>공개 프로젝트</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                activeTab === 'public' ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-600'
              }`}>
                {filteredPublicProjects.length}
              </span>
          </button>
          </div>
        </div>

        {/* Create Project Form */}
        {showCreateForm && (
          <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">새 프로젝트 생성</h3>
              <p className="text-sm text-gray-600 mt-1">팀과 함께할 새로운 프로젝트를 만들어보세요</p>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreateProject} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                  프로젝트 이름 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                      placeholder="멋진 프로젝트 이름을 지어주세요"
                  required
                />
              </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      테마 색상
                </label>
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                          className="w-12 h-12 rounded-xl border-2 border-gray-200 cursor-pointer"
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      공개 설정
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.isPublic}
                          onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                          className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-3 flex items-center space-x-2">
                          {formData.isPublic ? (
                            <Globe className="w-5 h-5 text-green-600" />
                          ) : (
                            <Lock className="w-5 h-5 text-gray-600" />
                          )}
                          <div>
                            <span className="text-sm font-medium text-gray-900">
                              {formData.isPublic ? '공개 프로젝트' : '비공개 프로젝트'}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
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
                    className="flex-1 sm:flex-none px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
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
                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden group"
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
                          <h3 className="text-xl font-bold text-gray-900 truncate">{project.name}</h3>
                          {project.isPublic ? (
                            <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                              <Globe className="w-3 h-3" />
                              <span>공개</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                              <Lock className="w-3 h-3" />
                              <span>비공개</span>
                            </div>
                          )}
                        </div>
                    {project.description && (
                          <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">{project.description}</p>
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
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="프로젝트 설정"
                >
                  <Settings className="w-4 h-4" />
                </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Project Stats */}
                  <div className="flex items-center justify-between py-3 border-t border-gray-50">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{project.members.length} 멤버</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>{new Date(project.createdAt).toLocaleDateString('ko-KR')}</span>
                      </div>
                    </div>
                    
                    {isOwner && (
                      <div className="flex items-center space-x-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                        <span>관리자</span>
                      </div>
                    )}
              </div>
              
                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {activeTab === 'public' && !userInProject && (
                      userRequested ? (
                        <div className="flex items-center justify-center space-x-2 w-full py-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm font-medium">
                          <Clock className="w-4 h-4" />
                          <span>가입 신청 대기 중</span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoinRequest(project.projectId);
                          }}
                          className="flex items-center justify-center space-x-2 w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>프로젝트 참여 신청</span>
                        </button>
                      )
                    )}

                    {userInProject && (
                      <button
                        onClick={() => onProjectSelect(project)}
                        className="flex items-center justify-center space-x-2 w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium group-hover:shadow-md"
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
            <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            {activeTab === 'my' ? (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">내 프로젝트가 없습니다</h3>
                <p className="text-gray-500 mb-6">첫 번째 프로젝트를 생성하거나 다른 프로젝트에 참여해보세요</p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={() => setShowCreateForm(true)}
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>새 프로젝트 생성</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('public')}
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Search className="w-4 h-4" />
                    <span>공개 프로젝트 찾기</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? '검색 결과가 없습니다' : '공개 프로젝트가 없습니다'}
                </h3>
                <p className="text-gray-500 mb-4">
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
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
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
            onClose={() => setSettingsProject(null)}
            onProjectUpdate={(updatedProject) => {
              setMyProjects(prev => 
                prev.map(p => p.projectId === updatedProject.projectId ? updatedProject : p)
              );
              setSettingsProject(null);
            }}
          />
        )}
        
        {/* Toast Container */}
      </div>
    </div>
  );
};

export default ProjectSelector;