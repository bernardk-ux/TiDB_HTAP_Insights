
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { 
  Activity, 
  BarChart3, 
  Database, 
  Cpu, 
  Zap, 
  Terminal, 
  Sparkles,
  RefreshCcw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Play,
  Table as TableIcon,
  Search,
  Code2,
  Clock,
  Layers,
  Settings,
  Link as LinkIcon,
  Copy,
  CheckCircle2,
  AlertCircle,
  Wifi,
  WifiOff,
  Info,
  Key,
  Globe,
  Eye,
  Server,
  Lock
} from 'lucide-react';
import { DashboardView, MetricPoint, BusinessData, HTAPStatus, AIInsight, QueryResult, TiDBConfig } from './types';
import { generateRealtimePerformance, generateBusinessData, getHTAPStatus, runQuery as runMockQuery } from './services/tidbSimulator';
import { getAIInsights } from './services/geminiService';
import { executeLiveQuery, testConnection } from './services/tidbApiService';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f97316', '#22c55e'];

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<DashboardView>(DashboardView.PERFORMANCE);
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [businessData, setBusinessData] = useState<BusinessData[]>([]);
  const [status, setStatus] = useState<HTAPStatus>(getHTAPStatus());
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  
  // Connection Configuration
  const [config, setConfig] = useState<TiDBConfig>({
    endpoint: '',
    publicKey: '',
    privateKey: '',
    isLive: false,
    host: '127.0.0.1',
    port: 4000,
    user: 'root'
  });

  const [testStatus, setTestStatus] = useState<{ loading: boolean; success?: boolean; message?: string; timestamp?: string }>({ loading: false });
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // SQL Lab State
  const [sql, setSql] = useState<string>("SELECT category, SUM(amount) as total_sales \nFROM orders \nGROUP BY category \nORDER BY total_sales DESC;");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [executing, setExecuting] = useState(false);
  const [copied, setCopied] = useState(false);

  const addLog = (msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '🔹';
    setLogs(prev => [...prev.slice(-24), `${prefix} [${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const refreshData = useCallback(() => {
    setMetrics(generateRealtimePerformance());
    setBusinessData(generateBusinessData());
    setStatus(getHTAPStatus());
  }, []);

  const handleRunQuery = async () => {
    setExecuting(true);
    addLog(`Running query...`);
    try {
      if (config.isLive) {
        const result = await executeLiveQuery(config, sql);
        setQueryResult(result);
        if (result.error) addLog(`Live Error: ${result.error}`, 'error');
        else addLog(`Success: Returned ${result.rows.length} rows (${result.engine})`, 'success');
      } else {
        const result = await runMockQuery(sql);
        setQueryResult(result);
        addLog(`Mock Results: ${result.rows.length} rows simulate.`, 'success');
      }
    } catch (e: any) {
      setQueryResult({
        columns: [], rows: [], executionTimeMs: 0, engine: 'TiKV', isMPP: false, sql, error: e.message
      });
      addLog(`Execution Failed: ${e.message}`, 'error');
    }
    setExecuting(false);
  };

  const handleTestConnection = async () => {
    setTestStatus({ loading: true });
    addLog("Testing endpoint connectivity...");
    
    try {
      const result = await testConnection(config);
      const now = new Date().toLocaleTimeString();
      setTestStatus({ 
        loading: false, 
        success: result.success, 
        message: result.message,
        timestamp: now
      });
      
      if (result.success) {
        addLog("Verified! Data Service responded with 200 OK.", 'success');
        setConfig(prev => ({ ...prev, isLive: true }));
      } else {
        addLog(`Failed: ${result.message}`, 'error');
        if (result.message.includes('Failed to fetch')) {
          addLog("Possible CORS issue. Ensure your Data App allows requests from this domain.", 'info');
        }
      }
    } catch (err: any) {
      setTestStatus({ loading: false, success: false, message: err.message });
      addLog(`Fatal Test Error: ${err.message}`, 'error');
    }
  };

  // Fixed: Added missing fetchAIInsights function to retrieve cluster analysis from Gemini API
  const fetchAIInsights = useCallback(async () => {
    setLoadingInsight(true);
    try {
      const result = await getAIInsights(status);
      setInsight(result);
    } catch (error) {
      console.error("AI Insight Error:", error);
    } finally {
      setLoadingInsight(false);
    }
  }, [status]);

  const loadSampleCredentials = () => {
    setConfig({
      ...config,
      endpoint: 'https://gateway.tidbcloud.com/api/v1beta1/projects/sample/clusters/sample/data-service/query',
      publicKey: 'SAMPLE_PUBLIC_KEY',
      privateKey: 'SAMPLE_PRIVATE_KEY',
    });
    addLog("Sample credentials loaded. Note: These are placeholders.", 'info');
  };

  const exploreSchema = () => {
    setSql("SHOW TABLES;");
    setActiveView(DashboardView.SQL_LAB);
    setTimeout(() => handleRunQuery(), 100);
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(() => {
      setMetrics(prev => {
        const next = generateRealtimePerformance().slice(-1)[0];
        return [...prev.slice(1), next];
      });
      setStatus(getHTAPStatus());
    }, 2000);
    return () => clearInterval(interval);
  }, [refreshData]);

  useEffect(() => {
    fetchAIInsights();
  }, [fetchAIInsights]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const renderPerformanceView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="lg:col-span-2 glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Zap className="text-yellow-400" /> HTAP Workload Monitor
            </h3>
            <p className="text-slate-400 text-sm">Real-time throughput across TiKV (OLTP) and TiFlash (OLAP)</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]"></span>
              <span className="text-xs text-slate-300">OLTP</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.6)]"></span>
              <span className="text-xs text-slate-300">OLAP</span>
            </div>
          </div>
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" stroke="#6366f1" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="#a855f7" fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
              />
              <Line yAxisId="left" type="monotone" dataKey="oltp" stroke="#6366f1" strokeWidth={3} dot={false} animationDuration={300} />
              <Line yAxisId="right" type="monotone" dataKey="olap" stroke="#a855f7" strokeWidth={3} dot={false} animationDuration={300} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-6">
        <div className="glass-panel rounded-2xl p-6 border border-slate-700/50">
          <h3 className="text-sm font-bold text-slate-400 mb-6 uppercase tracking-widest flex items-center gap-2">
            <Server className="w-4 h-4" /> Node Health
          </h3>
          <div className="space-y-5">
            <StatusItem label="TiKV Availability" value={status.tikvRegionCount} sub="Regions Replicated" />
            <StatusItem label="TiFlash Active" value={status.tiflashReplicaCount} sub="Columnar Engine" />
            <StatusItem 
              label="Replication Lag" 
              value={`${status.syncLagMs.toFixed(1)}ms`} 
              sub="Raft-based Consistency" 
              warning={status.syncLagMs > 50}
            />
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 border-l-4 border-indigo-500 bg-indigo-500/5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="text-indigo-400" /> AI Insights
            </h3>
            <button 
              onClick={fetchAIInsights} 
              disabled={loadingInsight}
              className="p-1.5 hover:bg-indigo-500/20 rounded-lg transition-colors"
              title="Refresh AI Analysis"
            >
              <RefreshCcw className={`w-4 h-4 text-indigo-400 ${loadingInsight ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {insight ? (
            <div className="space-y-3">
              <div className={`text-[10px] font-bold px-2 py-0.5 rounded w-fit uppercase tracking-tighter ${
                insight.severity === 'high' ? 'bg-rose-500 text-white' : 
                insight.severity === 'medium' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
              }`}>
                {insight.severity} Priority
              </div>
              <h4 className="font-bold text-slate-100 text-sm">{insight.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{insight.content}</p>
              <div className="pt-2 border-t border-slate-700/50">
                <p className="text-[10px] uppercase font-bold text-indigo-400 mb-1">Architectural Advice</p>
                <p className="text-xs text-slate-200 italic">"{insight.recommendation}"</p>
              </div>
            </div>
          ) : (
            <div className="h-32 flex flex-col items-center justify-center text-slate-500 text-xs gap-3">
              <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              Gemini is analyzing cluster telemetry...
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderSqlLab = () => (
    <div className="flex flex-col h-full gap-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-[600px]">
        {/* Sidebar Browser */}
        <div className="lg:col-span-1 glass-panel rounded-2xl p-5 overflow-y-auto flex flex-col border border-slate-700/50">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Database Schema</h4>
            <button onClick={exploreSchema} className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all" title="Refresh Schema">
              <RefreshCcw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-6 flex-1">
            <SchemaTable name="orders" columns={['id', 'user_id', 'amount', 'status', 'created_at']} />
            <SchemaTable name="users" columns={['id', 'email', 'name', 'country']} />
            <SchemaTable name="products" columns={['id', 'name', 'price', 'category_id']} />
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800">
             <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
               <Terminal className="w-3.5 h-3.5" /> Direct Access
             </h4>
             <div className="bg-slate-950/80 rounded-xl p-4 font-mono text-[10px] text-indigo-300 border border-slate-800 relative group overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                <p className="break-all opacity-80 mb-2">mysql -h {config.host} -P {config.port} -u {config.user} -p</p>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`mysql -h ${config.host} -P ${config.port} -u ${config.user} -p`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy command'}</span>
                </button>
             </div>
          </div>
        </div>

        {/* Editor and Results */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="glass-panel rounded-2xl overflow-hidden flex flex-col border border-slate-700/50 shadow-xl shadow-black/20">
            <div className="bg-slate-800/80 px-5 py-3 flex items-center justify-between border-b border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Query Editor</span>
                {config.isLive && (
                   <div className="flex items-center gap-1.5 ml-4 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">Live Connection</span>
                   </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleRunQuery}
                  disabled={executing}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold py-2 px-5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                  {executing ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  Execute SQL
                </button>
              </div>
            </div>
            <textarea 
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              spellCheck={false}
              className="w-full h-56 bg-slate-900/40 p-6 font-mono text-sm text-indigo-100 focus:outline-none resize-none placeholder-slate-600"
              placeholder="-- Enter your SQL query here
SELECT * FROM orders LIMIT 10;"
            />
          </div>

          <div className="glass-panel rounded-2xl flex-1 flex flex-col overflow-hidden border border-slate-700/50">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/20 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-emerald-400" /> Result Dataset
              </h3>
              {queryResult && !queryResult.error && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                    <Clock className="w-3 h-3" />
                    {queryResult.executionTimeMs.toFixed(2)}ms
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                    queryResult.engine === 'TiFlash' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  }`}>
                    {queryResult.engine} {queryResult.isMPP ? '• MPP' : ''}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
              {queryResult?.error ? (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-rose-500/5">
                  <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle className="w-8 h-8 text-rose-500" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-100 mb-2">Query Failed</h4>
                  <p className="text-xs text-slate-400 max-w-md font-mono mb-6 bg-slate-900/50 p-4 rounded-xl border border-rose-500/20 text-rose-300">
                    {queryResult.error}
                  </p>
                  <button 
                    onClick={() => setActiveView(DashboardView.SETTINGS)}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-2 bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20 transition-all"
                  >
                    Review Connection Setup <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              ) : !queryResult && !executing ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 p-12 text-center">
                  <Search className="w-16 h-16 mb-6 opacity-10" />
                  <p className="text-sm font-medium">Ready to query the cluster.</p>
                  <p className="text-xs opacity-60 mt-1">Results will appear here instantly using HTAP isolation.</p>
                </div>
              ) : executing ? (
                <div className="h-full flex flex-col items-center justify-center p-12">
                   <div className="w-12 h-12 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin mb-4" />
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Routing query to {config.isLive ? 'Live Cluster' : 'Simulator'}...</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/40 sticky top-0 backdrop-blur-md">
                    <tr>
                      {queryResult?.columns.map(col => (
                        <th key={col} className="px-6 py-4 font-bold text-slate-300 border-b border-slate-700/50 uppercase tracking-wider">
                          {col.replace('_', ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {(queryResult?.rows || []).map((row, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors group">
                        {queryResult?.columns.map(col => (
                          <td key={col} className="px-6 py-4 text-slate-400 font-mono group-hover:text-slate-200">
                            {row[col]?.toString() || <span className="text-slate-700 italic">NULL</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalyticsView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel rounded-2xl p-8 border border-slate-700/50">
          <h3 className="text-lg font-bold mb-8 flex items-center gap-3">
            <BarChart3 className="text-purple-400" /> Revenue Segment Analysis
          </h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={businessData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="category" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]}>
                  {businessData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-8 border border-slate-700/50">
          <h3 className="text-lg font-bold mb-8 flex items-center gap-3">
            <Layers className="text-pink-400" /> Inventory Allocation
          </h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={businessData}
                  cx="50%"
                  cy="50%"
                  innerRadius={100}
                  outerRadius={140}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {businessData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-8 overflow-x-auto border border-slate-700/50">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
          <Activity className="text-emerald-400" /> Multi-Engine Growth Metrics
        </h3>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800/40">
            <tr>
              <th className="px-8 py-5 text-slate-400 font-bold uppercase tracking-widest text-[10px] border-b border-slate-700">Category Segment</th>
              <th className="px-8 py-5 text-slate-400 font-bold uppercase tracking-widest text-[10px] border-b border-slate-700">Gross Value</th>
              <th className="px-8 py-5 text-slate-400 font-bold uppercase tracking-widest text-[10px] border-b border-slate-700">Engine Source</th>
              <th className="px-8 py-5 text-slate-400 font-bold uppercase tracking-widest text-[10px] border-b border-slate-700">Growth Index</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {businessData.map((item, idx) => (
              <tr key={idx} className="hover:bg-white/5 transition-colors group">
                <td className="px-8 py-5 font-bold text-slate-100 group-hover:text-indigo-400 transition-colors">{item.category}</td>
                <td className="px-8 py-5 text-slate-400 font-mono">${item.value.toLocaleString()}</td>
                <td className="px-8 py-5">
                   <span className="px-2 py-1 rounded-md bg-purple-500/10 text-purple-400 text-[10px] font-bold border border-purple-500/20">TIFLASH (OLAP)</span>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                     <span className={`font-bold ${item.growth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {item.growth >= 0 ? '+' : ''}{item.growth}%
                     </span>
                     <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${item.growth >= 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} 
                          style={{ width: `${Math.min(100, Math.max(5, 50 + item.growth))}%` }}
                        />
                     </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSettingsView = () => (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Connection Configuration */}
        <div className="glass-panel rounded-3xl p-10 flex flex-col border border-slate-700/50 shadow-2xl">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <LinkIcon className="text-indigo-400" /> Connection Profile
              </h2>
              <p className="text-slate-500 text-sm mt-1">Configure Data Service credentials for live access.</p>
            </div>
            {config.isLive && (
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-[10px] uppercase">
                <Wifi className="w-3 h-3 animate-pulse" /> Active Session
              </div>
            )}
          </div>

          <div className="space-y-8 flex-1">
            <div className="space-y-6">
               <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 ml-1">
                   <Globe className="w-3.5 h-3.5" /> HTTPS Endpoint
                 </label>
                 <input 
                   type="text" 
                   placeholder="https://gateway.tidbcloud.com/..." 
                   className="w-full bg-slate-950 border border-slate-800 rounded-xl px-5 py-3 text-sm text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                   value={config.endpoint}
                   onChange={(e) => setConfig({...config, endpoint: e.target.value})}
                 />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 ml-1">
                     <Lock className="w-3.5 h-3.5" /> Public Key
                   </label>
                   <input 
                     type="text" 
                     placeholder="APP_PUBLIC_KEY"
                     className="w-full bg-slate-950 border border-slate-800 rounded-xl px-5 py-3 text-sm text-slate-100 focus:border-indigo-500 outline-none transition-all"
                     value={config.publicKey}
                     onChange={(e) => setConfig({...config, publicKey: e.target.value})}
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 ml-1">
                     <Lock className="w-3.5 h-3.5" /> Private Key
                   </label>
                   <input 
                     type="password" 
                     placeholder="APP_PRIVATE_KEY"
                     className="w-full bg-slate-950 border border-slate-800 rounded-xl px-5 py-3 text-sm text-slate-100 focus:border-indigo-500 outline-none transition-all"
                     value={config.privateKey}
                     onChange={(e) => setConfig({...config, privateKey: e.target.value})}
                   />
                 </div>
               </div>
            </div>

            <div className="pt-4 flex gap-4">
              <button 
                onClick={handleTestConnection}
                disabled={testStatus.loading || !config.endpoint}
                className={`flex-1 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg ${
                  testStatus.loading ? 'bg-slate-800 text-slate-500' : 
                  testStatus.success ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20' : 
                  'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                }`}
              >
                {testStatus.loading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                {testStatus.success ? 'System Online' : 'Test Connection'}
              </button>
              <button 
                onClick={loadSampleCredentials}
                className="px-4 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-400 transition-colors"
                title="Load placeholder data"
              >
                <RefreshCcw className="w-5 h-5" />
              </button>
            </div>

            <div className="pt-8 border-t border-slate-800/50">
               <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-900/50 border border-slate-800 transition-all hover:bg-slate-900">
                  <div className="flex items-center gap-4">
                     <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${config.isLive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                        <Wifi className="w-6 h-6" />
                     </div>
                     <div>
                        <span className="text-sm font-bold text-slate-100 block">Traffic Routing</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{config.isLive ? 'Live Cluster' : 'Internal Simulator'}</span>
                     </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={config.isLive}
                      disabled={!testStatus.success && !config.isLive}
                      onChange={(e) => setConfig({...config, isLive: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
               </div>
            </div>
          </div>
        </div>

        {/* Diagnostic Logs & Info */}
        <div className="flex flex-col gap-6">
          <div className="glass-panel rounded-3xl p-8 bg-slate-950/80 border border-slate-800 flex flex-col h-80 shadow-2xl relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
               <Terminal className="w-32 h-32" />
            </div>
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5" /> Diagnostics Console
              </h3>
              <button onClick={() => setLogs([])} className="text-[10px] font-bold text-slate-600 hover:text-indigo-400 uppercase tracking-wider">Reset Log</button>
            </div>
            <div className="flex-1 overflow-y-auto font-mono text-[11px] text-indigo-200/60 space-y-2 custom-scrollbar relative z-10">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                  <Terminal className="w-8 h-8 mb-2" />
                  <p>Awaiting connectivity events...</p>
                </div>
              ) : (
                logs.map((log, i) => <div key={i} className="py-1 border-b border-white/5 animate-in fade-in duration-300">{log}</div>)
              )}
              <div ref={logEndRef} />
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-8 bg-indigo-600/5 border border-indigo-500/20 shadow-xl">
            <h3 className="text-sm font-bold mb-6 flex items-center gap-3 text-indigo-400">
              <Info className="w-4 h-4" /> Environment Status
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                 <span className="text-xs text-slate-400">Gemini AI Key</span>
                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${process.env.API_KEY ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                    {process.env.API_KEY ? 'ACTIVE' : 'MISSING'}
                 </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                 <span className="text-xs text-slate-400">Tailwind Engine</span>
                 <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    PLAY CDN (DEV)
                 </span>
              </div>
            </div>
            
            {testStatus.success && (
              <div className="mt-8">
                <button 
                  onClick={exploreSchema}
                  className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <Eye className="w-5 h-5" /> Auto-Map Schema
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col selection:bg-indigo-500 selection:text-white">
      <nav className="glass-panel sticky top-0 z-50 px-8 py-5 flex items-center justify-between border-b border-slate-800 shadow-lg">
        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setActiveView(DashboardView.PERFORMANCE)}>
          <div className="bg-indigo-600 p-2.5 rounded-2xl group-hover:rotate-12 transition-all shadow-xl shadow-indigo-600/30 group-hover:scale-110">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-black tracking-tight flex items-center gap-1.5">
              TIDB HTAP <span className="text-indigo-400">VISION</span>
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black leading-none mt-1">Advanced Performance Node</p>
          </div>
        </div>

        <div className="hidden lg:flex bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
          <NavButton active={activeView === DashboardView.PERFORMANCE} onClick={() => setActiveView(DashboardView.PERFORMANCE)} icon={<Activity className="w-4 h-4" />} label="Monitor" />
          <NavButton active={activeView === DashboardView.SQL_LAB} onClick={() => setActiveView(DashboardView.SQL_LAB)} icon={<Terminal className="w-4 h-4" />} label="SQL Lab" />
          <NavButton active={activeView === DashboardView.ANALYTICS} onClick={() => setActiveView(DashboardView.ANALYTICS)} icon={<BarChart3 className="w-4 h-4" />} label="Insights" />
          <NavButton active={activeView === DashboardView.SETTINGS} onClick={() => setActiveView(DashboardView.SETTINGS)} icon={<Settings className="w-4 h-4" />} label="Profile" />
        </div>

        <div className="flex items-center gap-5">
          <div className={`h-11 px-5 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center gap-3 transition-all duration-700 ${config.isLive ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : ''}`}>
            {config.isLive ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-slate-600" />}
            <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${config.isLive ? 'text-emerald-400' : 'text-slate-600'}`}>
              {config.isLive ? 'Online Cluster' : 'Internal Node'}
            </span>
          </div>
          <button 
            onClick={() => setActiveView(DashboardView.SETTINGS)}
            className="lg:hidden p-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 active:scale-90 transition-all shadow-inner"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full">
        {activeView === DashboardView.PERFORMANCE && renderPerformanceView()}
        {activeView === DashboardView.SQL_LAB && renderSqlLab()}
        {activeView === DashboardView.ANALYTICS && renderAnalyticsView()}
        {activeView === DashboardView.SETTINGS && renderSettingsView()}
      </main>

      <footer className="p-10 text-center text-slate-600 text-[10px] font-bold border-t border-slate-800/50 glass-panel mt-auto">
        <div className="flex items-center justify-center gap-10 mb-6 uppercase tracking-widest">
           <a href="#" className="hover:text-indigo-400 transition-colors">Documentation</a>
           <a href="#" className="hover:text-indigo-400 transition-colors">HTAP Core</a>
           <a href="#" className="hover:text-indigo-400 transition-colors">Architecture</a>
        </div>
        <p className="opacity-50">© 2024 TIDB HTAP VISION • DISTRIBUTED SQL ANALYTICS SYSTEM • V3.0.4-LTS</p>
      </footer>
    </div>
  );
};

const NavButton: React.FC<{active: boolean, onClick: () => void, icon: React.ReactNode, label: string}> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 scale-105' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}>
    {icon} {label}
  </button>
);

const StatusItem: React.FC<{label: string, value: string | number, sub: string, warning?: boolean}> = ({ label, value, sub, warning }) => (
  <div className="flex items-center justify-between group cursor-default">
    <div>
      <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-tighter">{label}</p>
      <p className={`text-2xl font-black transition-all duration-300 ${warning ? 'text-orange-400' : 'text-slate-100 group-hover:text-indigo-400'}`}>{value}</p>
      <p className="text-[10px] text-slate-600 font-medium mt-0.5">{sub}</p>
    </div>
    <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center group-hover:bg-indigo-500/10 transition-colors">
       <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 transition-all translate-x-0 group-hover:translate-x-1" />
    </div>
  </div>
);

const Step: React.FC<{icon: React.ReactElement, text: string}> = ({ icon, text }) => (
  <div className="flex items-center gap-4 text-slate-300 text-xs font-medium">
    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
      {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-4 h-4' })}
    </div>
    <p>{text}</p>
  </div>
);

const SchemaTable: React.FC<{name: string, columns: string[]}> = ({ name, columns }) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-2 text-xs font-bold text-slate-200 group cursor-default">
      <div className="p-1 bg-indigo-500/10 rounded group-hover:bg-indigo-500 transition-colors">
        <TableIcon className="w-3 h-3 text-indigo-400 group-hover:text-white" />
      </div>
      <span className="group-hover:text-indigo-400 transition-colors">{name}</span>
    </div>
    <div className="pl-6 space-y-0.5 border-l border-slate-800/50 ml-2 mt-2">
      {columns.map(col => (
        <div key={col} className="text-[10px] text-slate-600 font-mono hover:text-indigo-400 cursor-default transition-colors pl-3 py-1 flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-slate-800" />
          {col}
        </div>
      ))}
    </div>
  </div>
);

export default App;
