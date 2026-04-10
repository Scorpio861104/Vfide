import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Layers, Play, X, Plus, Database } from 'lucide-react';
import { safeParseInt } from '@/lib/validation';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';

interface FilterCondition {
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'between' | 'in';
  value: string | number | boolean | [number, number] | Array<string | number | boolean>;
}

interface AggregationConfig {
  field: string;
  function: 'sum' | 'avg' | 'min' | 'max' | 'count';
  alias?: string;
}

interface QueryBuilderProps {
  fields: Array<{ name: string; type: 'string' | 'number' | 'date' | 'boolean' }>;
  data: Record<string, unknown>[];
  onQuery?: (results: Record<string, unknown>[]) => void;
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
  const { playSuccess, playNotification, playError } = useTransactionSounds();

  const addFilter = () => {
    setFilters([
      ...filters,
      { field: fields[0]?.name || '', operator: 'equals', value: '' }
    ]);
    playNotification();
  };

  const updateFilter = (index: number, updates: Partial<FilterCondition>) => {
    const newFilters = [...filters];
    const currentFilter = newFilters[index];
    if (currentFilter) {
      newFilters[index] = { ...currentFilter, ...updates };
      setFilters(newFilters);
    }
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
    playError();
  };

  const addAggregation = () => {
    const numericFields = fields.filter(f => f.type === 'number');
    setAggregations([
      ...aggregations,
      { field: numericFields[0]?.name || fields[0]?.name || '', function: 'sum' }
    ]);
    playNotification();
  };

  const updateAggregation = (index: number, updates: Partial<AggregationConfig>) => {
    const newAggregations = [...aggregations];
    const currentAgg = newAggregations[index];
    if (currentAgg) {
      newAggregations[index] = { ...currentAgg, ...updates };
      setAggregations(newAggregations);
    }
  };

  const removeAggregation = (index: number) => {
    setAggregations(aggregations.filter((_, i) => i !== index));
    playError();
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
            if (Array.isArray(filter.value) && filter.value.length === 2) {
              const [min, max] = filter.value as [number, number];
              return Number(fieldValue) >= Number(min) && Number(fieldValue) <= Number(max);
            }
            return false;
          case 'in':
            return Array.isArray(filter.value) && (filter.value as Array<string | number | boolean>).includes(fieldValue as string | number | boolean);
          default:
            return true;
        }
      });
    });

    // Apply grouping and aggregations
    if (groupBy.length > 0 || aggregations.length > 0) {
      const grouped = new Map<string, Record<string, unknown>[]>();

      results.forEach(row => {
        const key = groupBy.map(field => row[field]).join('|');
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(row);
      });

      results = Array.from(grouped.entries()).map(([key, rows]) => {
        const result: Record<string, unknown> = {};

        // Add group by fields
        groupBy.forEach((field, index) => {
          result[field] = key.split('|')[index];
        });

        // Calculate aggregations
        aggregations.forEach(agg => {
          const alias = agg.alias || `${agg.function}_${agg.field}`;
          // Optimized: Single-pass filtering and conversion instead of map + filter
          const values = rows.reduce<number[]>((acc, r) => {
            const num = Number(r[agg.field]);
            if (!isNaN(num)) acc.push(num);
            return acc;
          }, []);

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
          const aVal = a[sort.field] as string | number | boolean | null | undefined;
          const bVal = b[sort.field] as string | number | boolean | null | undefined;
          
          if (aVal === bVal) continue;
          if (aVal == null) return sort.direction === 'asc' ? -1 : 1;
          if (bVal == null) return sort.direction === 'asc' ? 1 : -1;
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
      <motion.div 
        className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-500" />
          Query Builder
        </h3>

        {/* Filters Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </h4>
            <motion.button
              onClick={addFilter}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="w-3 h-3" /> Add Filter
            </motion.button>
          </div>

          <AnimatePresence mode="popLayout">
          {filters.length === 0 ? (
            <motion.p 
              className="text-sm text-gray-500 dark:text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              No filters applied
            </motion.p>
          ) : (
            <div className="space-y-2">
              {filters.map((filter, index) => (
                <motion.div 
                  key={index} 
                  className="flex gap-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <select
                    value={filter.field}
                    onChange={(e) =>  updateFilter(index, { field: e.target.value })}
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
                    onChange={(e) =>  updateFilter(index, { operator: e.target.value as FilterCondition['operator'] })}
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
                    value={
                      typeof filter.value === 'string' || typeof filter.value === 'number'
                        ? filter.value
                        : Array.isArray(filter.value)
                          ? filter.value.join(',')
                          : filter.value === true
                            ? 'true'
                            : filter.value === false
                              ? 'false'
                              : ''
                    }
                    onChange={(e) =>  updateFilter(index, { value: e.target.value })}
                    placeholder="Value"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />

                  <motion.button
                    onClick={() => removeFilter(index)}
                    className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              ))}
            </div>
          )}
          </AnimatePresence>
        </div>

        {/* Group By Section */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Group By
          </h4>
          <select
            multiple
            value={groupBy}
            onChange={(e) =>  setGroupBy(Array.from(e.target.selectedOptions, opt => opt.value))}
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
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Aggregations
            </h4>
            <motion.button
              onClick={addAggregation}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="w-3 h-3" /> Add Aggregation
            </motion.button>
          </div>

          <AnimatePresence mode="popLayout">
          {aggregations.length === 0 ? (
            <motion.p 
              className="text-sm text-gray-500 dark:text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              No aggregations configured
            </motion.p>
          ) : (
            <div className="space-y-2">
              {aggregations.map((agg, index) => (
                <motion.div 
                  key={index} 
                  className="flex gap-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <select
                    value={agg.function}
                    onChange={(e) =>  updateAggregation(index, { function: e.target.value as AggregationConfig['function'] })}
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
                    onChange={(e) =>  updateAggregation(index, { field: e.target.value })}
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
                    onChange={(e) =>  updateAggregation(index, { alias: e.target.value })}
                    placeholder="Alias (optional)"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />

                  <motion.button
                    onClick={() => removeAggregation(index)}
                    className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              ))}
            </div>
          )}
          </AnimatePresence>
        </div>

        {/* Limit */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Result Limit
          </label>
          <input
            type="number"
            value={limit}
            onChange={(e) =>  setLimit(safeParseInt(e.target.value, 100, { min: 1 }))}
            min={1}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Execute Button */}
        <motion.button
          onClick={() => {
            handleExecute();
            playSuccess();
          }}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Play className="w-5 h-5" />
          Execute Query ({executeQuery.length} results)
        </motion.button>
      </motion.div>

      {/* Results Preview */}
      <AnimatePresence>
      {executeQuery.length > 0 && (
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Results Preview ({executeQuery.length} rows)
          </h4>
          <div
            className="table-responsive"
            role="region"
            aria-label="Query results"
            tabIndex={0}
          >
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
                  <motion.tr 
                    key={index} 
                    className="border-b border-gray-100 dark:border-gray-700/50"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    {Object.values(row).map((value, cellIndex) => (
                      <td key={cellIndex} className="py-2 px-3 text-gray-600 dark:text-gray-400">
                        {String(value)}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {executeQuery.length > 10 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              Showing first 10 of {executeQuery.length} results
            </p>
          )}
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};
