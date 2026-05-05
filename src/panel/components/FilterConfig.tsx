import { useState } from 'react';
import type { JsonPropertyFilter } from '../../shared/types';
import { generateId } from '../../shared/utils';

interface FilterConfigProps {
  filters: JsonPropertyFilter[];
  onUpdateFilters: (filters: JsonPropertyFilter[]) => void;
  onClose: () => void;
}

export function FilterConfig({ filters, onUpdateFilters, onClose }: FilterConfigProps) {
  const [localFilters, setLocalFilters] = useState<JsonPropertyFilter[]>(filters);

  function addFilter() {
    const newFilter: JsonPropertyFilter = {
      id: generateId(),
      enabled: true,
      propertyPath: '',
      operator: 'equals',
      value: '',
      direction: 'both'
    };
    setLocalFilters([...localFilters, newFilter]);
  }

  function updateFilter(id: string, updates: Partial<JsonPropertyFilter>) {
    setLocalFilters(localFilters.map(f =>
      f.id === id ? { ...f, ...updates } : f
    ));
  }

  function removeFilter(id: string) {
    setLocalFilters(localFilters.filter(f => f.id !== id));
  }

  function handleSave() {
    onUpdateFilters(localFilters);
    onClose();
  }

  return (
    <div className="filter-config">
      <div className="filter-config-header">
        <h4>Configure Filters</h4>
        <button className="btn-close" onClick={onClose}>×</button>
      </div>

      <div className="filter-config-body">
        {localFilters.length === 0 ? (
          <div className="filter-empty">
            <p>No filters configured. Add a filter to intercept messages.</p>
          </div>
        ) : (
          <div className="filter-list">
            {localFilters.map(filter => (
              <div key={filter.id} className="filter-item">
                <div className="filter-row">
                  <label className="filter-enabled">
                    <input
                      type="checkbox"
                      checked={filter.enabled}
                      onChange={(e) => updateFilter(filter.id, { enabled: e.target.checked })}
                    />
                    <span>Enabled</span>
                  </label>

                  <button
                    className="btn-remove"
                    onClick={() => removeFilter(filter.id)}
                    title="Remove filter"
                  >
                    🗑️
                  </button>
                </div>

                <div className="filter-row">
                  <div className="filter-field">
                    <label>Property Path</label>
                    <input
                      type="text"
                      placeholder="e.g., user.id or event.type"
                      value={filter.propertyPath}
                      onChange={(e) => updateFilter(filter.id, { propertyPath: e.target.value })}
                    />
                  </div>

                  <div className="filter-field">
                    <label>Operator</label>
                    <select
                      value={filter.operator}
                      onChange={(e) => updateFilter(filter.id, { operator: e.target.value as any })}
                    >
                      <option value="equals">Equals</option>
                      <option value="contains">Contains</option>
                      <option value="regex">Regex</option>
                      <option value="exists">Exists</option>
                    </select>
                  </div>
                </div>

                {filter.operator !== 'exists' && (
                  <div className="filter-row">
                    <div className="filter-field">
                      <label>Value</label>
                      <input
                        type="text"
                        placeholder={filter.operator === 'regex' ? 'e.g., ^user_\\d+$' : 'Enter value'}
                        value={filter.value}
                        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <div className="filter-row">
                  <div className="filter-field">
                    <label>Direction</label>
                    <select
                      value={filter.direction}
                      onChange={(e) => updateFilter(filter.id, { direction: e.target.value as any })}
                    >
                      <option value="both">Both (↕)</option>
                      <option value="incoming">Incoming (↓)</option>
                      <option value="outgoing">Outgoing (↑)</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="filter-actions">
          <button className="btn-add" onClick={addFilter}>
            + Add Filter
          </button>
        </div>
      </div>

      <div className="filter-config-footer">
        <button className="btn-cancel" onClick={onClose}>
          Cancel
        </button>
        <button className="btn-save" onClick={handleSave}>
          Save Filters
        </button>
      </div>
    </div>
  );
}
