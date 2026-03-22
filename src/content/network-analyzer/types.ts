/**
 * Network Analyzer - Types
 *
 * Type definitions for the Network Analyzer module.
 */

export type ResourceType =
  | 'document'
  | 'stylesheet'
  | 'script'
  | 'image'
  | 'font'
  | 'api'
  | 'media'
  | 'other';

export interface NetworkRequest {
  id: string;
  url: string;
  name: string;
  type: ResourceType;
  method: string;
  status: number;
  statusText: string;
  size: number;
  transferSize: number;
  startTime: number;
  endTime: number;
  duration: number;
  timing: ResourceTiming | null;
  initiator: string;
  renderBlocking: boolean;
}

export interface ResourceTiming {
  dns: number;
  connect: number;
  tls: number;
  ttfb: number;
  download: number;
  total: number;
}

export type FilterType = 'all' | ResourceType;

export interface NetworkStats {
  totalSize: number;
  transferSize: number;
  totalTime: number;
  domContentLoaded: number;
  renderBlocking: number;
}

export interface ResourcePattern {
  type: ResourceType;
  patterns: RegExp[];
}

export interface FilterConfig {
  type: FilterType;
  label: string;
  color: string;
}
