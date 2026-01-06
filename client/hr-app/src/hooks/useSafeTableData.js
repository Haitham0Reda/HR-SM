/**
 * Custom hook to ensure table data is always a safe array
 * Prevents "data.slice is not a function" errors in DataTable components
 */

import { useMemo } from 'react';

export const useSafeTableData = (data) => {
  return useMemo(() => {
    // Ensure data is always an array
    if (Array.isArray(data)) {
      return data;
    }
    
    // Log warning in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('useSafeTableData: data is not an array:', { 
        data, 
        type: typeof data,
        isNull: data === null,
        isUndefined: data === undefined
      });
    }
    
    // Return empty array as fallback
    return [];
  }, [data]);
};

export default useSafeTableData;