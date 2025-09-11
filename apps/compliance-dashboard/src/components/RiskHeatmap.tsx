import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface RiskHeatmapProps {
  data?: Array<{
    level: string;
    count: number;
    color: string;
  }>;
}

const defaultData = [
  { level: 'Low', count: 120, color: '#10b981' },
  { level: 'Medium', count: 45, color: '#f59e0b' },
  { level: 'High', count: 20, color: '#ef4444' },
  { level: 'Critical', count: 5, color: '#991b1b' },
];

export default function RiskHeatmap({ data = defaultData }: RiskHeatmapProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ level, percent }) => `${level} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="count"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}