interface MetricTags {
  [key: string]: string | number | boolean;
}

interface MetricsCollector {
  counter(name: string, value: number, tags?: MetricTags): void;
  gauge(name: string, value: number, tags?: MetricTags): void;
  histogram(name: string, value: number, tags?: MetricTags): void;
}

// Simple in-memory metrics collector (can be replaced with OpenTelemetry/Prometheus)
class SimpleMetricsCollector implements MetricsCollector {
  private metrics: Map<string, any[]> = new Map();

  counter(name: string, value: number = 1, tags?: MetricTags): void {
    const key = this.formatKey(name, tags);
    const current = this.metrics.get(key) || [];
    current.push({ type: 'counter', value, timestamp: Date.now(), tags });
    this.metrics.set(key, current);

    // Log for monitoring (would normally send to metrics backend)
    if (process.env.LOG_METRICS === 'true') {
      console.log(`METRIC [${name}] ${value} ${JSON.stringify(tags || {})}`);
    }
  }

  gauge(name: string, value: number, tags?: MetricTags): void {
    const key = this.formatKey(name, tags);
    this.metrics.set(key, [{ type: 'gauge', value, timestamp: Date.now(), tags }]);
  }

  histogram(name: string, value: number, tags?: MetricTags): void {
    const key = this.formatKey(name, tags);
    const current = this.metrics.get(key) || [];
    current.push({ type: 'histogram', value, timestamp: Date.now(), tags });
    this.metrics.set(key, current);
  }

  private formatKey(name: string, tags?: MetricTags): string {
    if (!tags) return name;
    const tagStr = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}{${tagStr}}`;
  }

  // Export metrics for testing/monitoring
  getMetrics(): Map<string, any[]> {
    return new Map(this.metrics);
  }

  clear(): void {
    this.metrics.clear();
  }
}

export const metrics = new SimpleMetricsCollector();
export type { MetricsCollector, MetricTags };