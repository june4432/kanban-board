interface TeamMember {
  userId: string;
  userName: string;
  cardsAssigned: number;
  cardsCompleted: number;
  commentsCount: number;
}

interface TeamActivityTableProps {
  teamActivity: TeamMember[];
}

export default function TeamActivityTable({ teamActivity }: TeamActivityTableProps) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-border">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-lg font-semibold text-card-foreground">Team Activity</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Member
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Assigned
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Completed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Comments
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Completion Rate
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {teamActivity.map((member) => {
              const completionRate = member.cardsAssigned > 0
                ? Math.round((member.cardsCompleted / member.cardsAssigned) * 100)
                : 0;

              return (
                <tr key={member.userId} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-sm">
                        {member.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-card-foreground">
                          {member.userName}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground">
                    {member.cardsAssigned}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-medium">
                    {member.cardsCompleted}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground">
                    {member.commentsCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-secondary rounded-full h-2 mr-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                      <span className="text-sm text-card-foreground font-medium">
                        {completionRate}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {teamActivity.length === 0 && (
        <div className="px-6 py-8 text-center text-muted-foreground">
          No team activity data available
        </div>
      )}
    </div>
  );
}
