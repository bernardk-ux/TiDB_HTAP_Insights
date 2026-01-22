
import React, { useState, useEffect, useCallback } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { 
  Activity, 
  BarChart3, 
  Database, 
  LayoutDashboard, 
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
  Globe
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

  const [testStatus, setTestStatus] = useState<{ loading: boolean; success?: boolean; message?: string }>({ loading: false });

  // SQL Lab State
  const [sql, setSql] = useState<string>("SELECT category, SUM(amount) as total_sales \nFROM orders \nGROUP BY category \nORDER BY total_sales DESC;");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [executing, setExecuting] = useState(false);
  const [copied, setCopied] = useState(false);

  const refreshData = useCallback(() => {
    setMetrics(generateRealtimePerformance());
    setBusinessData(generateBusinessData());
    setStatus(getHTAPStatus());
  }, []);

  const handleRunQuery = async () => {
    setExecuting(true);
    try {
      if (config.isLive) {
        const result = await executeLiveQuery(config, sql);
        setQueryResult(result);
      } else {
        const result = await runMockQuery(sql);
        setQueryResult(result);
      }
    } catch (e: any) {
      setQueryResult({
        columns: [], rows: [], executionTimeMs: 0, engine: 'TiKV', isMPP: false, sql, error: e.message
      });
    }
    setExecuting(false);
  };

  const handleTestConnection = async () => {
    setTestStatus({ loading: true });
    const result = await testConnection(config);
    setTestStatus({ loading: false, success: result.success, message: result.message });
    if (result.success) {
      setConfig(prev => ({ ...prev, isLive: true }));
      setSql("SHOW TABLES;"); // Suggest exploration
    }
  };

  const fetchAIInsights = async () => {
    setLoadingInsight(true);
    const result = await getAIInsights(status);
    setInsight(result);
    setLoadingInsight(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
  }, []);

  const renderPerformanceView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="lg:col-span-2 glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Zap className="text-yellow-400" /> Real-time Queries (HTAP)
            </h3>
            <p className="text-slate-400 text-sm">Transactional vs Analytical Throughput</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-indigo-500 rounded-full"></span>
              <span className="text-xs text-slate-300">OLTP (TiKV)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
              <span className="text-xs text-slate-300">OLAP (TiFlash)</span>
            </div>
          </div>
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickMargin={10} />
              <YAxis yAxisId="left" stroke="#6366f1" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="#a855f7" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#f8fafc' }}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="oltp" 
                stroke="#6366f1" 
                strokeWidth={3}
                dot={false}
                animationDuration={300}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="olap" 
                stroke="#a855f7" 
                strokeWidth={3}
                dot={false}
                animationDuration={300}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-6">
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Cpu className="text-indigo-400" /> Cluster Health
          </h3>
          <div className="space-y-4">
            <StatusItem label="TiKV Regions" value={status.tikvRegionCount} sub="High Availability Active" />
            <StatusItem label="TiFlash Replicas" value={status.tiflashReplicaCount} sub="Analytical Isolation" />
            <StatusItem 
              label="Sync Lag" 
              value={`${status.syncLagMs.toFixed(1)}ms`} 
              sub="Real-time Consistency" 
              warning={status.syncLagMs > 50}
            />
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 border-l-4 border-indigo-500 bg-indigo-500/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="text-indigo-400" /> AI DBA Insights
            </h3>
            <button 
              onClick={fetchAIInsights} 
              disabled={loadingInsight}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <RefreshCcw className={`w-4 h-4 ${loadingInsight ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {insight ? (
            <div className="space-y-2">
              <h4 className="font-medium text-slate-100">{insight.title}</h4>
              <p className="text-sm text-slate-400 leading-relaxed">{insight.content}</p>
              <div className="pt-2">
                <p className="text-xs uppercase font-bold text-indigo-400 mb-1">Recommendation</p>
                <p className="text-sm text-slate-200">{insight.recommendation}</p>
              </div>
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center text-slate-500 text-sm">
              Analyzing cluster telemetry...
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
        <div className="lg:col-span-1 glass-panel rounded-2xl p-4 overflow-y-auto flex flex-col">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Schema Browser</h4>
          <div className="space-y-4 flex-1">
            <SchemaTable name="orders" columns={['id', 'user_id', 'amount', 'status', 'created_at']} />
            <SchemaTable name="users" columns={['id', 'email', 'name', 'country']} />
            <SchemaTable name="products" columns={['id', 'name', 'price', 'category_id']} />
          </div>

          <div className="mt-6 pt-6 border-t border-slate-800">
             <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
               <Terminal className="w-3 h-3" /> CLI Access
             </h4>
             <div className="bg-slate-900 rounded-lg p-3 font-mono text-[10px] text-slate-400 relative group">
                <p className="break-all">mysql -h {config.host} -P {config.port} -u {config.user} -p</p>
                <button 
                  onClick={() => copyToClipboard(`mysql -h ${config.host} -P ${config.port} -u ${config.user} -p`)}
                  className="absolute top-2 right-2 p-1 bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
             </div>
             <p className="text-[10px] text-slate-500 mt-2 italic">Connect via MySQL CLI for raw terminal access.</p>
          </div>
        </div>

        {/* Editor and Results */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="glass-panel rounded-2xl overflow-hidden flex flex-col border border-slate-700/50">
            <div className="bg-slate-800/80 px-4 py-2 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-medium text-slate-300">New Query Tab</span>
                {config.isLive && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Live</span>}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setActiveView(DashboardView.SETTINGS)}
                  className="text-slate-400 hover:text-slate-200 p-1.5 rounded transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleRunQuery}
                  disabled={executing}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold py-1.5 px-4 rounded-lg flex items-center gap-2 transition-all"
                >
                  {executing ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  Run SQL
                </button>
              </div>
            </div>
            <textarea 
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              spellCheck={false}
              className="w-full h-48 bg-slate-900/50 p-6 font-mono text-sm text-indigo-100 focus:outline-none resize-none"
            />
          </div>

          <div className="glass-panel rounded-2xl flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-emerald-400" /> Query Results
              </h3>
              {queryResult && !queryResult.error && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />
                    {queryResult.executionTimeMs.toFixed(2)}ms
                  </div>
                  <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    queryResult.engine === 'TiFlash' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'
                  }`}>
                    {queryResult.engine} {queryResult.isMPP ? 'MPP Mode' : ''}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto">
              {queryResult?.error ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-red-500/5">
                  <AlertCircle className="w-12 h-12 mb-4 text-red-500" />
                  <h4 className="text-lg font-bold text-slate-100 mb-2">Query Execution Error</h4>
                  <p className="text-sm text-slate-400 max-w-md font-mono mb-4">{queryResult.error}</p>
                  <button 
                    onClick={() => setActiveView(DashboardView.SETTINGS)}
                    className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    Check Connection Settings <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              ) : !queryResult && !executing ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                  <Search className="w-12 h-12 mb-4 opacity-20" />
                  <p>Execute a query to see real-time data from the cluster.</p>
                </div>
              ) : executing ? (
                <div className="h-full flex items-center justify-center p-8">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                    <p className="text-sm text-slate-400">Optimizing and routing query...</p>
                  </div>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-800/50 sticky top-0">
                    <tr>
                      {queryResult?.columns.map(col => (
                        <th key={col} className="px-6 py-3 font-semibold text-slate-300 border-b border-slate-700 capitalize">
                          {col.replace('_', ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {queryResult?.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        {queryResult?.columns.map(col => (
                          <td key={col} className="px-6 py-4 text-slate-400 font-mono">
                            {row[col]}
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="glass-panel rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <BarChart3 className="text-purple-400" /> Revenue by Category
        </h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={businessData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="category" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#f8fafc' }}
              />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]}>
                {businessData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Layers className="text-pink-400" /> Market Share Distribution
        </h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={businessData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {businessData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#f8fafc' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="lg:col-span-2 glass-panel rounded-2xl p-6 overflow-x-auto">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Activity className="text-emerald-400" /> Category Growth Analysis
        </h3>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800/50">
            <tr>
              <th className="px-6 py-3 text-slate-300 font-semibold border-b border-slate-700">Category</th>
              <th className="px-6 py-3 text-slate-300 font-semibold border-b border-slate-700">Current Value</th>
              <th className="px-6 py-3 text-slate-300 font-semibold border-b border-slate-700">Growth Rate</th>
              <th className="px-6 py-3 text-slate-300 font-semibold border-b border-slate-700">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {businessData.map((item, idx) => (
              <tr key={idx} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-200">{item.category}</td>
                <td className="px-6 py-4 text-slate-400">${item.value.toLocaleString()}</td>
                <td className={`px-6 py-4 ${item.growth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {item.growth >= 0 ? '+' : ''}{item.growth}%
                </td>
                <td className="px-6 py-4">
                  <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.growth >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                      style={{ width: `${Math.min(100, Math.max(0, 50 + item.growth))}%` }}
                    />
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
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass-panel rounded-2xl p-8 h-fit">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <LinkIcon className="text-indigo-400" /> Connection Manager
            </h2>
            <p className="text-slate-400">Configure your TiDB Cloud Data Service endpoint.</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase ${config.isLive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
            {config.isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {config.isLive ? 'Live Mode' : 'Simulation Mode'}
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
             <div className="space-y-2">
               <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                 <Globe className="w-3 h-3" /> Endpoint URL
               </label>
               <input 
                 type="text" 
                 placeholder="https://gateway.tidbcloud.com/..." 
                 className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none transition-colors"
                 value={config.endpoint}
                 onChange={(e) => setConfig({...config, endpoint: e.target.value})}
               />
             </div>
             <div className="space-y-2">
               <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                 <Key className="w-3 h-3" /> Public Key
               </label>
               <input 
                 type="text" 
                 placeholder="Enter Public Key"
                 className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none transition-colors"
                 value={config.publicKey}
                 onChange={(e) => setConfig({...config, publicKey: e.target.value})}
               />
             </div>
             <div className="space-y-2">
               <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                 <Key className="w-3 h-3" /> Private Key
               </label>
               <input 
                 type="password" 
                 placeholder="Enter Private Key"
                 className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none transition-colors"
                 value={config.privateKey}
                 onChange={(e) => setConfig({...config, privateKey: e.target.value})}
               />
             </div>
          </div>

          <div className="flex flex-col gap-4 pt-4">
            <button 
              onClick={handleTestConnection}
              disabled={testStatus.loading || !config.endpoint}
              className={`w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                testStatus.loading ? 'bg-slate-700 text-slate-400' : 
                testStatus.success ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 
                'bg-slate-700 hover:bg-slate-600 text-white'
              }`}
            >
              {testStatus.loading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {testStatus.success ? 'Connection Verified!' : 'Test Connection'}
            </button>

            {testStatus.message && (
              <div className={`p-4 rounded-xl text-xs flex gap-3 ${testStatus.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                {testStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <p className="flex-1">{testStatus.message}</p>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-slate-800">
             <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors border border-slate-700">
                <input 
                  type="checkbox" 
                  checked={config.isLive}
                  disabled={!testStatus.success && config.isLive === false}
                  onChange={(e) => setConfig({...config, isLive: e.target.checked})}
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                />
                <div className="flex-1">
                  <span className="text-sm font-bold text-slate-100 block">Enable Live HTAP Mode</span>
                  <span className="text-xs text-slate-500">Route SQL Lab queries to the actual cluster.</span>
                </div>
             </label>
             {!testStatus.success && (
               <p className="text-[10px] text-orange-400/70 mt-2 px-2 italic">Verify connection before enabling live mode.</p>
             )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="glass-panel rounded-2xl p-8 border border-indigo-500/20 bg-indigo-500/5">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-400">
            <Info className="w-5 h-5" /> How to connect
          </h3>
          <ul className="space-y-4 text-sm text-slate-300">
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
              <p>Sign in to <a href="https://tidbcloud.com" target="_blank" className="text-indigo-400 hover:underline">TiDB Cloud</a> and select your cluster.</p>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
              <p>Navigate to <strong>Data Service</strong> in the sidebar.</p>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
              <p>Create an <strong>App</strong> and a <strong>Data App Key</strong> to get your API keys.</p>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">4</span>
              <p>Copy the <strong>HTTPS Endpoint</strong> from the Data Service dashboard.</p>
            </li>
          </ul>
          <div className="mt-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700 text-xs text-slate-400 leading-relaxed italic">
            "Direct MySQL protocol (Port 4000) connections from browsers are blocked by security policies. We use TiDB's Data Service API as a secure gateway."
          </div>
        </div>

        <button 
          onClick={() => setActiveView(DashboardView.SQL_LAB)}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3"
        >
          <Terminal className="w-5 h-5" /> Launch SQL Lab
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="glass-panel sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setActiveView(DashboardView.PERFORMANCE)}>
          <div className="bg-indigo-600 p-2 rounded-lg group-hover:rotate-12 transition-transform">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">TiDB HTAP <span className="text-indigo-400">Vision</span></h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Hybrid Performance Monitor</p>
          </div>
        </div>

        <div className="flex bg-slate-800/50 p-1 rounded-xl">
          <NavButton active={activeView === DashboardView.PERFORMANCE} onClick={() => setActiveView(DashboardView.PERFORMANCE)} icon={<Activity className="w-4 h-4" />} label="Monitor" />
          <NavButton active={activeView === DashboardView.SQL_LAB} onClick={() => setActiveView(DashboardView.SQL_LAB)} icon={<Terminal className="w-4 h-4" />} label="SQL Lab" />
          <NavButton active={activeView === DashboardView.ANALYTICS} onClick={() => setActiveView(DashboardView.ANALYTICS)} icon={<BarChart3 className="w-4 h-4" />} label="Insights" />
          <NavButton active={activeView === DashboardView.SETTINGS} onClick={() => setActiveView(DashboardView.SETTINGS)} icon={<Settings className="w-4 h-4" />} label="Connection" />
        </div>

        <div className="hidden md:flex items-center gap-4">
          <div className={`h-10 px-4 bg-slate-800 rounded-full border border-slate-700 flex items-center justify-center gap-2 ${config.isLive ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10' : ''}`}>
            {config.isLive ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-slate-500" />}
            <span className={`text-[10px] font-bold uppercase tracking-wider ${config.isLive ? 'text-emerald-400' : 'text-slate-500'}`}>
              {config.isLive ? 'Live Cluster' : 'Simulated'}
            </span>
          </div>
        </div>
      </nav>

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        {activeView === DashboardView.PERFORMANCE && renderPerformanceView()}
        {activeView === DashboardView.SQL_LAB && renderSqlLab()}
        {activeView === DashboardView.ANALYTICS && renderAnalyticsView()}
        {activeView === DashboardView.SETTINGS && renderSettingsView()}
      </main>

      <footer className="p-8 text-center text-slate-500 text-sm border-t border-slate-800 glass-panel mt-auto">
        <p>© 2024 TiDB HTAP Vision. MySQL-Compatible Distributed SQL visualization.</p>
      </footer>
    </div>
  );
};

const NavButton: React.FC<{active: boolean, onClick: () => void, icon: React.ReactNode, label: string}> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}>
    {icon} {label}
  </button>
);

const StatusItem: React.FC<{label: string, value: string | number, sub: string, warning?: boolean}> = ({ label, value, sub, warning }) => (
  <div className="flex items-center justify-between group">
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className={`text-lg font-bold ${warning ? 'text-orange-400' : 'text-slate-100'}`}>{value}</p>
      <p className="text-[10px] text-slate-500">{sub}</p>
    </div>
    <ChevronRight className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
  </div>
);

const SchemaTable: React.FC<{name: string, columns: string[]}> = ({ name, columns }) => (
  <div className="space-y-1">
    <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
      <TableIcon className="w-3 h-3 text-indigo-400" /> {name}
    </div>
    <div className="pl-5 space-y-0.5">
      {columns.map(col => (
        <div key={col} className="text-[11px] text-slate-500 font-mono hover:text-slate-300 cursor-default transition-colors">
          {col}
        </div>
      ))}
    </div>
  </div>
);

export default App;
