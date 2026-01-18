
import { TiDBConfig, QueryResult } from "../types";

/**
 * Service to interact with TiDB Cloud Data Service
 * https://docs.pingcap.com/tidbcloud/data-service-overview
 */
export const executeLiveQuery = async (config: TiDBConfig, sql: string): Promise<QueryResult> => {
  if (!config.endpoint || !config.publicKey || !config.privateKey) {
    throw new Error("Missing connection credentials");
  }

  const startTime = performance.now();
  
  try {
    // Note: In a production environment, you would call your own backend 
    // to sign these requests or use the TiDB Cloud SDK.
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${config.publicKey}:${config.privateKey}`)}`
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || "Query execution failed");
    }

    const data = await response.json();
    const endTime = performance.now();

    // Data Service usually returns results in a specific format
    // We map it to our internal QueryResult format
    const columns = data.result.columns.map((c: any) => c.name);
    const rows = data.result.rows;

    // Detect engine via EXPLAIN if possible, or heuristic
    const isAnalytical = sql.toUpperCase().includes('GROUP BY') || sql.toUpperCase().includes('JOIN');

    return {
      columns,
      rows,
      executionTimeMs: endTime - startTime,
      engine: isAnalytical ? 'TiFlash' : 'TiKV',
      isMPP: isAnalytical,
      sql
    };
  } catch (error: any) {
    return {
      columns: [],
      rows: [],
      executionTimeMs: 0,
      engine: 'TiKV',
      isMPP: false,
      sql,
      error: error.message
    };
  }
};
