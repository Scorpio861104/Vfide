import React, { useState, useMemo } from 'react';

interface FilterCondition {
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'between' | 'in';
  value: any;
}

interface AggregationConfig {
  field: string;
  function: 'sum' | 'avg' | 'min' | 'max' | 'count';
  alias?: string;
}

interface QueryBuilderProps {
  fields: Array<{ name: string; type: 'string' | 'number' | 'date' | 'boolean' }>;
  data: any[];
  onQuery?: (results: any[]) => void;
  className?: string;
}

export function QueryBuilder({
  fields,
  data,
  onQuery,
  className = ''
}: QueryBuilderProps) {
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [aggregations, setAggregations] = useState<AggregationConfig[]>([]);
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [sortBy, _setSortBy] = useState<{ field: string; direction: 'asc' | 'desc' }[]>([]);
  const [limit, setLimit] = useState<number>(100);

  const addFilter = () => {
    setFilters([
      ...filters,
      { field: fields[0]?.name || '', operator: 'equals', value: '' }
    ]);
  };

  const updateFilter = (index: number, updates: Partial<FilterCondition>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    setFilters(newFilters);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const addAggregation = () => {
    const numericFields = fields.filter(f => f.type === 'number');
    setAggregations([
      ...aggregations,
      { field: numericFields[0]?.name || fields[0]?.name, function: 'sum' }
    ]);
  };

  const updateAggregation = (index: number, updates: Partial<AggregationConfig>) => {
    const newAggregations = [...aggregations];
    newAggregations[index] = { ...newAggregations[index], ...updates };
    setAggregations(newAggregations);
  };

  const removeAggregation = (index: number) => {
    setAggregations(aggregations.filter((_, i) => i !== index));
  };

  const executeQuery = useMemo(() => {
    // Apply filters
    let results = data.filter(row => {
      return filters.every(filter => {
        const fieldValue = row[filter.field];
        
        switch (filter.operator) {
          case 'equals':
            return fieldValue === filter.value;
          case 'notEquals':
            return fieldValue !== filter.value;
          case 'contains':
            return String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'greaterThan':
            return Number(fieldValue) > Number(filter.value);
          case 'lessThan':
            return Number(fieldValue) < Number(filter.value);
          case 'between':
            const [min, max] = filter.value;
            return Number(fieldValue) >= Number(min) && Number(fieldValue) <= Number(max);
          case 'in':
            return Array.isArray(filter.value) && filter.value.includes(fieldValue);
          default:
            return true;
        }
      });
    });

    // Apply grouping and aggregations
    if (groupBy.length > 0 || aggregations.length > 0) {
      const grouped = new Map<string, any[]>();

      results.forEach(row => {
        const key = groupBy.map(field => row[field]).join('|');
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(row);
      });

      results = Array.from(grouped.entries()).map(([key, rows]) => {
        const result: any = {};

        // Add group by fields
        groupBy.forEach((field, index) => {
          result[field] = key.split('|')[index];
        });

        // Calculate aggregations
        aggregations.forEach(agg => {
          const alias = agg.alias || `${agg.function}_${agg.field}`;
          const values = rows.map(r => Number(r[agg.field])).filter(v => !isNaN(v));

          switch (agg.function) {
            case 'sum':
              result[alias] = values.reduce((a, b) => a + b, 0);
              break;
            case 'avg':
              result[alias] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
              break;
            case 'min':
              result[alias] = values.length > 0 ? Math.min(...values) : 0;
              break;
            case 'max':
              result[alias] = values.length > 0 ? Math.max(...values) : 0;
              break;
            case 'count':
              result[alias] = rows.length;
              break;
          }
        });

        return result;
      });
    }

    // Apply sorting
    if (sortBy.length > 0) {
      results.sort((a, b) => {
        for (const sort of sortBy) {
          const aVal = a[sort.field];
          const bVal = b[sort.field];
          
          if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    // Apply limit
    results = results.slice(0, limit);

    return results;
  }, [data, filters, groupBy, aggregations, sortBy, limit]);

  const handleExecute = () => {
    if (onQuery) {
      onQuery(executeQuery);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Query Builder
        </h3>

        {/* Filters Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filters
            </h4>
            <button
              onClick={addFilter}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              + Add Filter
            </button>
          </div>

          {filters.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No filters applied
            </p>
          ) : (
            <div className="space-y-2">
              {filters.map((filter, index) => (
                <div key={index} className="flex gap-2">
                  <select
                    value={filter.field}
                    onChange={(e) => updateFilter(index, { field: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    {fields.map(field => (
                      <option key={field.name} value={field.name}>
                        {field.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filter.operator}
                    onChange={(e) => updateFilter(index, { operator: e.target.value as any })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <option value="equals">Equals</option>
                    <option value="notEquals">Not Equals</option>
                    <option value="contains">Contains</option>
                    <option value="greaterThan">Greater Than</option>
                    <option value="lessThan">Less Than</option>
                    <option value="between">Between</option>
                    <option value="in">In</option>
                  </select>

                  <input
                    type="text"
                    value={filter.value}
                    onChange={(e) => updateFilter(index, { value: e.target.value })}
                    placeholder="Value"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />

                  <button
                    onClick={() => removeFilter(index)}
                    className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Group By Section */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Group By
          </h4>
          <select
            multiple
            value={groupBy}
            onChange={(e) => setGroupBy(Array.from(e.target.selectedOptions, opt => opt.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
            size={4}
          >
            {fields.map(field => (
              <option key={field.name} value={field.name}>
                {field.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Hold Ctrl/Cmd to select multiple fields
          </p>
        </div>

        {/* Aggregations Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Aggregations
            </h4>
            <button
              onClick={addAggregation}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              + Add Aggregation
            </button>
          </div>

          {aggregations.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No aggregations configured
            </p>
          ) : (
            <div className="space-y-2">
              {aggregations.map((agg, index) => (
                <div key={index} className="flex gap-2">
                  <select
                    value={agg.function}
                    onChange={(e) => updateAggregation(index, { function: e.target.value as any })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <option value="sum">SUM</option>
                    <option value="avg">AVG</option>
                    <option value="min">MIN</option>
                    <option value="max">MAX</option>
                    <option value="count">COUNT</option>
                  </select>

                  <select
                    value={agg.field}
                    onChange={(e) => updateAggregation(index, { field: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    {fields.map(field => (
                      <option key={field.name} value={field.name}>
                        {field.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={agg.alias || ''}
                    onChange={(e) => updateAggregation(index, { alias: e.target.value })}
                    placeholder="Alias (optional)"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />

                  <button
                    onClick={() => removeAggregation(index)}
                    className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Limit */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Result Limit
          </label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            min={1}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Execute Button */}
        <button
          onClick={handleExecute}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Execute Query ({executeQuery.length} results)
        </button>
      </div>

      {/* Results Preview */}
      {executeQuery.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Results Preview ({executeQuery.length} rows)
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {Object.keys(executeQuery[0] || {}).map(key => (
                    <th key={key} className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {executeQuery.slice(0, 10).map((row, index) => (
                  <tr key={index} className="border-b border-gray-100 dark:border-gray-700/50">
                    {Object.values(row).map((value: any, cellIndex) => (
                      <td key={cellIndex} className="py-2 px-3 text-gray-600 dark:text-gray-400">
                        {String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {executeQuery.length > 10 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              Showing first 10 of {executeQuery.length} results
            </p>
          )}
        </div>
      )}
    </div>
  );
};
