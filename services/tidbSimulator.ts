
import { MetricPoint, BusinessData, HTAPStatus, QueryResult } from "../types";

export const generateRealtimePerformance = (): MetricPoint[] => {
  const data: MetricPoint[] = [];
  const now = new Date();
  for (let i = 10; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 1000);
    data.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      oltp: 800 + Math.random() * 400,
      olap: 10 + Math.random() * 5,
    });
  }
  return data;
};

export const generateBusinessData = (): BusinessData[] => [
  { category: 'Electronics', value: 45000, growth: 12 },
  { category: 'Clothing', value: 28000, growth: -5 },
  { category: 'Home & Kitchen', value: 32000, growth: 8 },
  { category: 'Automotive', value: 15000, growth: 22 },
  { category: 'Beauty', value: 19000, growth: 15 },
];

export const getHTAPStatus = (): HTAPStatus => ({
  tikvRegionCount: 1450,
  tiflashReplicaCount: 2,
  syncLagMs: 12 + Math.random() * 50,
  qpsOltp: 1250,
  qpsOlap: 15,
});

export const runQuery = async (sql: string): Promise<QueryResult> => {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
  
  const upperSql = sql.toUpperCase();
  const isAnalytical = upperSql.includes('GROUP BY') || upperSql.includes('SUM(') || upperSql.includes('JOIN') || upperSql.includes('COUNT(');
  
  const columns = isAnalytical 
    ? ['category', 'total_sales', 'avg_price', 'order_count']
    : ['id', 'user_id', 'amount', 'status', 'created_at'];

  const rows = Array.from({ length: isAnalytical ? 5 : 10 }).map((_, i) => {
    if (isAnalytical) {
      return {
        category: ['Electronics', 'Home', 'Apparel', 'Books', 'Toys'][i],
        total_sales: Math.floor(Math.random() * 100000),
        avg_price: (Math.random() * 200).toFixed(2),
        order_count: Math.floor(Math.random() * 500)
      };
    }
    return {
      id: 1000 + i,
      user_id: 500 + i,
      amount: (Math.random() * 1000).toFixed(2),
      status: 'completed',
      created_at: new Date().toISOString()
    };
  });

  return {
    columns,
    rows,
    executionTimeMs: isAnalytical ? 45 + Math.random() * 20 : 2 + Math.random() * 5,
    engine: isAnalytical ? 'TiFlash' : 'TiKV',
    isMPP: isAnalytical,
    sql
  };
};
