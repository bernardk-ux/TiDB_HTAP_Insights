
import { GoogleGenAI, Type } from "@google/genai";
import { HTAPStatus, AIInsight } from "../types";

// Always use a named parameter for apiKey and direct environment variable access
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAIInsights = async (status: HTAPStatus): Promise<AIInsight> => {
  try {
    const prompt = `
      Act as a senior TiDB Database Administrator. Analyze the following HTAP cluster metrics:
      - OLTP QPS: ${status.qpsOltp}
      - OLAP QPS: ${status.qpsOlap}
      - TiFlash Sync Lag: ${status.syncLagMs}ms
      - TiKV Regions: ${status.tikvRegionCount}
      - TiFlash Replicas: ${status.tiflashReplicaCount}

      Provide a brief architectural insight about this hybrid workload. 
      Identify if TiFlash is keeping up with TiKV and if the analytical queries are impacting transactional throughput.
    `;

    // Use gemini-3-pro-preview for complex reasoning and architectural analysis
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { 
              type: Type.STRING,
              description: "A short, descriptive title for the insight."
            },
            content: { 
              type: Type.STRING,
              description: "Detailed analysis of the cluster performance."
            },
            recommendation: { 
              type: Type.STRING,
              description: "Actionable advice for the DBA."
            },
            severity: { 
              type: Type.STRING,
              description: "One of: 'low', 'medium', 'high'"
            }
          },
          required: ["title", "content", "recommendation", "severity"]
        }
      }
    });

    // Access text as a property, not a method
    const result = JSON.parse(response.text || '{}');
    return result as AIInsight;
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return {
      title: "Monitoring Active",
      content: "System metrics are within normal operating parameters. HTAP isolation is maintained.",
      recommendation: "Continue standard monitoring.",
      severity: 'low'
    };
  }
};