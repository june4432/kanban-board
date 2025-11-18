import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import StatsCard from '@/components/dashboard/StatsCard';
import ProgressChart from '@/components/dashboard/ProgressChart';
import TeamActivityTable from '@/components/dashboard/TeamActivityTable';
import RecentActivity from '@/components/dashboard/RecentActivity';
import TrendsChart from '@/components/dashboard/TrendsChart';
import type { DashboardStats } from '@/lib/services/dashboard.service';

export default function ProjectDashboard() {
  const router = useRouter();
  const { projectId } = router.query;
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/projects/${projectId}/dashboard`);

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const data = await response.json();
        setDashboard(data.dashboard);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [projectId]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (error || !dashboard) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error || 'Failed to load dashboard'}</p>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Go Back
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const { cardStats, progress, teamActivity, recentActivity, trends } = dashboard;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Project Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Overview of your project's performance and team activity
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Cards"
            value={cardStats.total}
            icon="📋"
            color="bg-blue-500"
            subtitle={`${cardStats.completed} completed`}
          />
          <StatsCard
            title="Progress"
            value={`${progress.percentage}%`}
            icon="📊"
            color="bg-green-500"
            subtitle={`${progress.completedCards}/${progress.totalCards} cards`}
          />
          <StatsCard
            title="Overdue"
            value={cardStats.overdue}
            icon="⏰"
            color="bg-red-500"
            subtitle="Cards past due date"
          />
          <StatsCard
            title="Due Soon"
            value={cardStats.dueSoon}
            icon="⚡"
            color="bg-amber-500"
            subtitle="Next 7 days"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ProgressChart
            totalCards={progress.totalCards}
            completedCards={progress.completedCards}
            percentage={progress.percentage}
          />

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Cards by Status
            </h3>
            <div className="space-y-3">
              {Object.entries(cardStats.byColumn).map(([column, count]) => (
                <div key={column}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                By Priority
              </h4>
              <div className="space-y-2">
                {Object.entries(cardStats.byPriority).map(([priority, count]) => {
                  const colors: Record<string, string> = {
                    urgent: 'bg-red-500',
                    high: 'bg-orange-500',
                    medium: 'bg-yellow-500',
                    low: 'bg-green-500',
                  };
                  return (
                    <div key={priority} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full ${colors[priority]} mr-2`} />
                        <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                          {priority}
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
    </Layout>
  );
}
