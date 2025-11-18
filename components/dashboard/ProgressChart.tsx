import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ProgressChartProps {
  totalCards: number;
  completedCards: number;
  percentage: number;
}

export default function ProgressChart({ totalCards, completedCards, percentage }: ProgressChartProps) {
  const data = [
    { name: 'Completed', value: completedCards, color: '#22c55e' },
    { name: 'In Progress', value: totalCards - completedCards, color: '#94a3b8' }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Project Progress
      </h3>

      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-4xl font-bold text-gray-900 dark:text-white">{percentage}%</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {completedCards} of {totalCards} cards completed
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
