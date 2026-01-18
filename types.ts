
export interface MetricPoint {
  time: string;
  oltp: number;
  olap: number;
  [key: string]: any;
}

export interface BusinessData {
  category: string;
  value: number;
  growth: number;
  [key: string]: any;
}

export interface HTAPStatus {
  tikvRegionCount: number;
  tiflashReplicaCount: number;
  syncLagMs: number;
  qpsOltp: number;
  qpsOlap: number;
}

export enum DashboardView {
  PERFORMANCE = 'performance',
  ANALYTICS = 'analytics',
  SQL_LAB = 'sql_lab',
  SUPERSET = 'superset',
  SETTINGS = 'settings'
}

export interface AIInsight {
  title: string;
  content: string;
  recommendation: string;
  severity: 'low' | 'medium' | 'high';
}

export interface QueryResult {
  columns: string[];
  rows: any[];
  executionTimeMs: number;
  engine: 'TiKV' | 'TiFlash';
  isMPP: boolean;
  sql: string;
  error?: string;
}

export interface TiDBConfig {
  endpoint: string;
  publicKey: string;
  privateKey: string;
  isLive: boolean;
  host?: string;
  port?: number;
  user?: string;
}
