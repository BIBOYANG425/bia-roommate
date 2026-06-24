export interface AnalyticsSink {
  capture: (event: string, props?: Record<string, unknown>) => void;
  identify: (distinctId: string, traits?: Record<string, unknown>) => void;
  reset: () => void;
}

export declare function setAnalyticsSink(sink: AnalyticsSink | null): void;
