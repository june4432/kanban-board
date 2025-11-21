import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ProgressChartProps {
  totalCards: number;
  completedCards: number;
  percentage: number;
}

export default function ProgressChart({ totalCards, completedCards, percentage }: ProgressChartProps) {
  const data = [
    { name: 'Completed', value: completedCards, color: '#22c55e' }, // green-500
    { name: 'In Progress', value: totalCards - completedCards, color: '#94a3b8' } // slate-400
  ];

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      <h3 className="text-lg font-semibold text-card-foreground mb-4">
        Project Progress
      </h3>

      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-4xl font-bold text-card-foreground">{percentage}%</p>
          <p className="text-sm text-muted-foreground mt-1">
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
              <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              borderColor: 'hsl(var(--border))',
              borderRadius: '0.5rem',
              color: 'hsl(var(--popover-foreground))'
            }}
            itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
