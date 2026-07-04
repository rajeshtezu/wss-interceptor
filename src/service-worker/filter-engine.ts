import type { JsonPropertyFilter } from '../shared/types';
import { getPropertyByPath, tryParseJSON } from '../shared/utils';

/**
 * Filter engine for matching messages against filter rules
 */
export class FilterEngine {
  private filters = new Map<string, JsonPropertyFilter[]>();

  async loadFilters(connectionId: string): Promise<void> {
    const key = `filters_${connectionId}`;
    const result = await chrome.storage.local.get(key);
    const filters = result[key] || [];
    this.filters.set(connectionId, filters);
    console.log('[FilterEngine] Loaded filters for', connectionId, ':', filters.length);
  }

  async updateFilters(connectionId: string, filters: JsonPropertyFilter[]): Promise<void> {
    this.filters.set(connectionId, filters);
    const key = `filters_${connectionId}`;
    await chrome.storage.local.set({ [key]: filters });
    console.log('[FilterEngine] Updated filters for', connectionId, ':', filters.length);
  }

  getFilters(connectionId: string): JsonPropertyFilter[] {
    return this.filters.get(connectionId) || [];
  }

  async removeFilters(connectionId: string): Promise<void> {
    this.filters.delete(connectionId);
    await chrome.storage.local.remove(`filters_${connectionId}`);
    console.log('[FilterEngine] Removed filters for', connectionId);
  }

  async shouldHoldMessage(
    connectionId: string,
    direction: 'incoming' | 'outgoing',
    data: any
  ): Promise<boolean> {
    // Load filters if not in memory
    if (!this.filters.has(connectionId)) {
      await this.loadFilters(connectionId);
    }

    const filters = this.filters.get(connectionId) || [];
    if (filters.length === 0) {
      return false;
    }

    // Parse JSON if possible
    const parsedData = tryParseJSON(data);
    if (parsedData === null) {
      // Not JSON, can't apply property filters
      return false;
    }

    // Check if any enabled filter matches
    const enabledFilters = filters.filter(f => f.enabled);
    return enabledFilters.some(filter => this.filterMatches(filter, direction, parsedData));
  }

  private filterMatches(
    filter: JsonPropertyFilter,
    direction: 'incoming' | 'outgoing',
    data: any
  ): boolean {
    // Check direction
    if (filter.direction !== 'both' && filter.direction !== direction) {
      return false;
    }

    // Get property value by path
    const value = getPropertyByPath(data, filter.propertyPath);

    // Apply operator
    switch (filter.operator) {
      case 'exists':
        return value !== undefined;

      case 'equals':
        return String(value) === filter.value;

      case 'contains':
        return String(value).includes(filter.value);

      case 'regex':
        try {
          const regex = new RegExp(filter.value);
          return regex.test(String(value));
        } catch (err) {
          console.error('[FilterEngine] Invalid regex:', filter.value, err);
          return false;
        }

      default:
        return false;
    }
  }

  clear(): void {
    this.filters.clear();
  }
}
