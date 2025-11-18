import { formatDistanceToNow } from 'date-fns';

interface Activity {
  action: string;
  userName: string;
  resourceType: string;
  resourceId: string;
  timestamp: Date;
}

interface RecentActivityProps {
  activities: Activity[];
}

const actionIcons: Record<string, string> = {
  create: '➕',
  update: '✏️',
  delete: '🗑️',
  move: '🔄',
};

const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  move: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export default function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
      </div>

      <div className="px-6 py-4">
        <div className="flow-root">
          <ul className="-mb-8">
            {activities.map((activity, activityIdx) => (
              <li key={`${activity.resourceId}-${activityIdx}`}>
                <div className="relative pb-8">
                  {activityIdx !== activities.length - 1 && (
                    <span
                      className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative flex space-x-3">
                    <div>
                      <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-gray-800 ${actionColors[activity.action] || 'bg-gray-100 text-gray-800'}`}>
                        {actionIcons[activity.action] || '📝'}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">
                          <span className="font-medium">{activity.userName}</span>
                          {' '}
                          <span className="text-gray-600 dark:text-gray-400">
                            {activity.action}d a {activity.resourceType}
                          </span>
                        </p>
                      </div>
                      <div className="whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {activities.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No recent activity
          </div>
        )}
      </div>
    </div>
  );
}
