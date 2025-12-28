import { useState, useEffect } from 'react';
import StatsCard from '@/components/dashboard/StatsCard';
import ProgressChart from '@/components/dashboard/ProgressChart';
import TeamActivityTable from '@/components/dashboard/TeamActivityTable';
import RecentActivity from '@/components/dashboard/RecentActivity';
import TrendsChart from '@/components/dashboard/TrendsChart';
import type { DashboardStats } from '@/lib/services/dashboard.service';

interface DashboardViewProps {
  projectId: string;
}

export default function DashboardView({ projectId }: DashboardViewProps) {
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/v1/projects/${projectId}/dashboard`);

        if (!response.ok) {
          throw new Error('대시보드 데이터를 불러오는데 실패했습니다');
        }

        const responseData = await response.json();
        const dashboard = responseData.data?.dashboard || responseData.dashboard;
        setDashboard(dashboard);
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || '대시보드를 불러올 수 없습니다'}</p>
        </div>
      </div>
    );
  }

  const { cardStats, progress, teamActivity, recentActivity, trends } = dashboard;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">프로젝트 대시보드</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            프로젝트 진행 상황과 팀 활동 현황을 한눈에 확인하세요
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="전체 카드"
            value={cardStats.total}
            icon="📋"
            color="bg-blue-500"
            subtitle={`${cardStats.completed}개 완료됨`}
          />
          <StatsCard
            title="진행률"
            value={`${progress.percentage}%`}
            icon="📊"
            color="bg-green-500"
            subtitle={`${progress.completedCards}/${progress.totalCards} 카드 완료`}
          />
          <StatsCard
            title="기한 초과"
            value={cardStats.overdue}
            icon="⏰"
            color="bg-red-500"
            subtitle="마감일 지난 카드"
          />
          <StatsCard
            title="마감 임박"
            value={cardStats.dueSoon}
            icon="⚡"
            color="bg-amber-500"
            subtitle="7일 이내 마감"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ProgressChart
            totalCards={progress.totalCards}
            completedCards={progress.completedCards}
            percentage={progress.percentage}
          />

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              상태별 카드 현황
            </h3>
            <div className="space-y-3">
              {Object.entries(cardStats.byColumn).map(([column, count]) => (
                <div key={column}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {column}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {count}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(count / cardStats.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                우선순위별 현황
              </h4>
              <div className="space-y-2">
                {Object.entries(cardStats.byPriority).map(([priority, count]) => {
                  const colors: Record<string, string> = {
                    urgent: 'bg-red-500',
                    high: 'bg-orange-500',
                    medium: 'bg-yellow-500',
                    low: 'bg-green-500',
                  };
                  const priorityLabels: Record<string, string> = {
                    urgent: '긴급',
                    high: '높음',
                    medium: '중간',
                    low: '낮음',
                  };
                  return (
                    <div key={priority} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full ${colors[priority]} mr-2`} />
                        <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                          {priorityLabels[priority] || priority}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Trends Chart */}
        <div className="mb-8">
          <TrendsChart trends={trends} />
        </div>

        {/* Team Activity Table */}
        <div className="mb-8">
          <TeamActivityTable teamActivity={teamActivity} />
        </div>

        {/* Recent Activity */}
        <div>
          <RecentActivity activities={recentActivity} />
        </div>
      </div>
    </div>
  );
}
