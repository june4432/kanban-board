import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useProject, ProjectProvider } from '@/contexts/ProjectContext';
import GlobalWebSocketManager from '@/components/GlobalWebSocketManager';
import ProjectSelector from '@/components/ProjectSelector';
import AuthModal from '@/components/AuthModal';
import CompanySetup from '@/components/CompanySetup';
import { Project } from '@/types';

interface Company {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  plan: string;
}

// Disable static generation for this page
export async function getServerSideProps() {
  return {
    props: {}
  };
}

function HomeContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentProject, selectProject, createProject, projects, loading: projectLoading } = useProject();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyLoading, setCompanyLoading] = useState(true);

  // 회사 정보 가져오기
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch('/api/v1/companies', {
          credentials: 'include'
        });
        const responseData = await response.json();
        const companies = responseData.data?.companies || responseData.companies || [];
        setCompanies(companies);
      } catch (error) {
        console.error('Failed to fetch companies:', error);
      } finally {
        setCompanyLoading(false);
      }
    };

    if (user) {
      fetchCompanies();
    } else {
      setCompanyLoading(false);
    }
  }, [user]);

  // 프로젝트가 있으면 첫 번째 프로젝트로 리다이렉트
  useEffect(() => {
    if (!projectLoading && !companyLoading) {
      if (companies.length > 0 && projects.length > 0) {
        // 저장된 프로젝트 ID가 있으면 해당 프로젝트로
        const savedProjectId = localStorage.getItem('selectedProjectId');
        const targetProject = savedProjectId
          ? projects.find(p => p.projectId === savedProjectId) || projects[0]
          : projects[0];

        if (targetProject) {
          router.replace(`/${targetProject.projectId}`);
        }
      }
    }
  }, [projects, companies, projectLoading, companyLoading, router]);

  // 로딩 중
  if (companyLoading || projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 회사가 없으면 회사 생성 화면 먼저 표시
  if (companies.length === 0) {
    return (
      <>
        <Head>
          <title>회사 등록 - 프로젝트 관리 보드</title>
        </Head>
        <CompanySetup
          onComplete={async (_companyId) => {
            const response = await fetch('/api/v1/companies', {
              credentials: 'include'
            });
            const responseData = await response.json();
            const companies = responseData.data?.companies || responseData.companies || [];
            setCompanies(companies);
          }}
        />
      </>
    );
  }

  // 프로젝트가 없거나 선택되지 않은 경우 프로젝트 선택기 표시
  const handleProjectSelect = (project: Project) => {
    selectProject(project);
    router.push(`/${project.projectId}`);
  };

  return (
    <>
      <Head>
        <title>프로젝트 선택 - 프로젝트 관리 보드</title>
      </Head>
      <ProjectSelector
        user={user!}
        selectedProject={currentProject || undefined}
        onProjectSelect={handleProjectSelect}
        onProjectCreate={createProject}
      />
    </>
  );
}

export default function Home() {
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (loading) {
    return (
      <>
        <Head>
          <title>프로젝트 관리 보드</title>
        </Head>
        <div className="h-screen flex items-center justify-center">
          <div className="text-lg">로딩 중...</div>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Head>
          <title>프로젝트 관리 보드</title>
        </Head>
        <div className="h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">프로젝트 관리 보드</h1>
            <p className="text-gray-600 mb-6">로그인이 필요합니다.</p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              로그인 / 회원가입
            </button>
            <AuthModal
              isOpen={showAuthModal}
              onClose={() => setShowAuthModal(false)}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <ProjectProvider user={user}>
      <GlobalWebSocketManager />
      <HomeContent />
    </ProjectProvider>
  );
}
