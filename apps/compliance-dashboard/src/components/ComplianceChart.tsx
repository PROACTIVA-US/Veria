import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ComplianceChartProps {
  data?: Array<{
    date: string;
    verified: number;
    pending: number;
    rejected: number;
  }>;
}

export default function ComplianceChart({ data = [] }: ComplianceChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="verified" 
          stroke="#10b981" 
          strokeWidth={2}
          name="Verified"
        />
        <Line 
          type="monotone" 
          dataKey="pending" 
          stroke="#f59e0b" 
          strokeWidth={2}
          name="Pending"
        />
        <Line 
          type="monotone" 
          dataKey="rejected" 
          stroke="#ef4444" 
          strokeWidth={2}
          name="Rejected"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}