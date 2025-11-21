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
  create: 'bg-green-500/10 text-green-600 dark:text-green-400',
  update: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  delete: 'bg-red-500/10 text-red-600 dark:text-red-400',
  move: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
};

export default function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-border">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-lg font-semibold text-card-foreground">Recent Activity</h3>
      </div>

      <div className="px-6 py-4">
        <div className="flow-root">
          <ul className="-mb-8">
            {activities.map((activity, activityIdx) => (
              <li key={`${activity.resourceId}-${activityIdx}`}>
                <div className="relative pb-8">
                  {activityIdx !== activities.length - 1 && (
                    <span
                      className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-border"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative flex space-x-3">
                    <div>
                      <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-card ${actionColors[activity.action] || 'bg-muted text-muted-foreground'}`}>
                        {actionIcons[activity.action] || '📝'}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                      <div>
                        <p className="text-sm text-card-foreground">
                          <span className="font-medium">{activity.userName}</span>
                          {' '}
                          <span className="text-muted-foreground">
                            {activity.action}d a {activity.resourceType}
                          </span>
                        </p>
                      </div>
                      <div className="whitespace-nowrap text-right text-sm text-muted-foreground">
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
          <div className="text-center py-8 text-muted-foreground">
            No recent activity
          </div>
        )}
      </div>
    </div>
  );
}
