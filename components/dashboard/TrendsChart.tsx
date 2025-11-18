import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface Trend {
  date: string;
  cardsCreated: number;
  cardsCompleted: number;
  cardsActive: number;
}

interface TrendsChartProps {
  trends: Trend[];
}

export default function TrendsChart({ trends }: TrendsChartProps) {
  const formattedData = trends.map(trend => ({
    ...trend,
    date: format(new Date(trend.date), 'MM/dd'),
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        30-Day Trends
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="date"
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#fff'
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="cardsCreated"
            stroke="#22c55e"
            strokeWidth={2}
            name="Created"
            dot={{ fill: '#22c55e', r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="cardsCompleted"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Completed"
            dot={{ fill: '#3b82f6', r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="cardsActive"
            stroke="#f59e0b"
            strokeWidth={2}
            name="Active"
            dot={{ fill: '#f59e0b', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
