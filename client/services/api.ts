/**
 * API Service Layer for G-Balancer Frontend
 * This wraps calls to the FastAPI / ML backend.
 * Currently uses mock delays for testing.
 */

const MOCK_DELAY = 500;

export interface GridMetrics {
  currentDemand: number;
  solarSupply: number;
  windSupply: number;
  conventionalSupply: number;
  batteryPercentage: number;
  netBalance: number;
}

export const api = {
  // Fetch real-time grid metrics
  async getGridMetrics(): Promise<GridMetrics> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          currentDemand: 12450,
          solarSupply: 4200,
          windSupply: 3100,
          conventionalSupply: 6000,
          batteryPercentage: 84,
          netBalance: 850,
        });
      }, MOCK_DELAY);
    });
  },

  // Post simulator scenario
  async runSimulation(scenario: string, severity: number): Promise<any> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          status: "simulated",
          before: { demand: 12450, battery: 84 },
          after: { demand: scenario === "demand_spike" ? 12450 * (1 + severity / 100) : 12450, battery: 45 },
          recommendation: "Discharge battery reserves immediately.",
        });
      }, MOCK_DELAY * 2);
    });
  },

  // Carbon metrics
  async getCarbonMetrics(): Promise<any> {
    return new Promise((resolve) => resolve({
      savedToday: 12.4, // tons
      treesEquivalent: 530,
      creditsEarned: 45000, // INR
    }));
  }
};
