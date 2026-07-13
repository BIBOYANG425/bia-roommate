// Stub for @biboyang425/bia-shared/analytics

export interface AnalyticsSink {
  track(event: string, properties?: Record<string, unknown>): void;
}

let _sink: AnalyticsSink | null = null;

export function setAnalyticsSink(sink: AnalyticsSink): void {
  _sink = sink;
}

export function getAnalyticsSink(): AnalyticsSink | null {
  return _sink;
}
