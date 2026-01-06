/**
 * Standardized DataTable Component
 * 
 * A wrapper around MUI Table with sorting, filtering, and responsive design.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Paper,
  CircularProgress,
  Typography,
  Box,
} from '@mui/material';
import { designTokens } from '../../theme/designTokens';

const DataTable = ({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  sortable = true,
  onSort,
  pagination = true,
  rowsPerPageOptions = [5, 10, 25, 50],
  defaultRowsPerPage = 5,
  sx = {},
}) => {
  const [orderBy, setOrderBy] = useState('');
  const [order, setOrder] = useState('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  const handleSort = (columnId) => {
    if (!sortable) return;
    
    const isAsc = orderBy === columnId && order === 'asc';
    const newOrder = isAsc ? 'desc' : 'asc';
    
    setOrder(newOrder);
    setOrderBy(columnId);
    
    if (onSort) {
      onSort(columnId, newOrder);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Ensure data is always an array with multiple fallbacks
  let safeData;
  try {
    if (data === null || data === undefined) {
      safeData = [];
    } else if (Array.isArray(data)) {
      safeData = data;
    } else if (typeof data === 'object' && data.length !== undefined) {
      // Handle array-like objects
      safeData = Array.from(data);
    } else {
      safeData = [];
    }
  } catch (error) {
    console.error('DataTable (hr-app/common): Error processing data prop:', error);
    safeData = [];
  }
  
  // Debug logging for development
  if (process.env.NODE_ENV === 'development' && !Array.isArray(data)) {
    console.warn('DataTable (hr-app/common): data prop is not an array:', { 
      originalData: data, 
      originalType: typeof data,
      safeData,
      safeDataType: typeof safeData,
      safeDataIsArray: Array.isArray(safeData)
    });
  }

  // Calculate paginated data with additional error handling
  let paginatedData;
  try {
    // Final safety check before slice
    if (!Array.isArray(safeData)) {
      console.error('DataTable (hr-app/common): safeData is still not an array!', safeData);
      paginatedData = [];
    } else {
      paginatedData = pagination
        ? safeData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
        : safeData;
    }
  } catch (error) {
    console.error('DataTable (hr-app/common): Error in pagination calculation:', error);
    console.error('DataTable (hr-app/common): safeData:', safeData, 'type:', typeof safeData, 'isArray:', Array.isArray(safeData));
    paginatedData = [];
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!safeData || safeData.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <Typography variant="body2" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer
      component={Paper}
      sx={{
        borderRadius: designTokens.borderRadius.lg,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: designTokens.shadows.sm,
        ...sx,
      }}
    >
      <Table>
        <TableHead>
          <TableRow
            sx={{
              bgcolor: 'background.default',
            }}
          >
            {columns.map((column) => (
              <TableCell
                key={column.id}
                align={column.align || 'left'}
                sx={{
                  fontWeight: designTokens.typography.fontWeight.semibold,
                  borderBottom: '2px solid',
                  borderColor: 'divider',
                  width: column.width || 'auto',
                  minWidth: column.minWidth || 'auto',
                  maxWidth: column.maxWidth || 'auto',
                }}
              >
                {sortable && column.sortable !== false ? (
                  <TableSortLabel
                    active={orderBy === column.id}
                    direction={orderBy === column.id ? order : 'asc'}
                    onClick={() => handleSort(column.id)}
                  >
                    {column.label}
                  </TableSortLabel>
                ) : (
                  column.label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedData.map((row, index) => (
            <TableRow
              key={row.id || row._id || index}
              sx={{
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                '&:last-child td': {
                  borderBottom: 0,
                },
              }}
            >
              {columns.map((column) => (
                <TableCell 
                  key={column.id} 
                  align={column.align || 'left'}
                  sx={{
                    width: column.width || 'auto',
                    minWidth: column.minWidth || 'auto',
                    maxWidth: column.maxWidth || 'auto',
                  }}
                >
                  {column.render ? column.render(row) : row[column.id]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pagination && (
        <TablePagination
          rowsPerPageOptions={rowsPerPageOptions}
          component="div"
          count={safeData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      )}
    </TableContainer>
  );
};

DataTable.propTypes = {
  /** Column definitions */
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      align: PropTypes.oneOf(['left', 'center', 'right']),
      sortable: PropTypes.bool,
      render: PropTypes.func,
    })
  ).isRequired,
  
  /** Table data */
  data: PropTypes.array,
  
  /** Loading state */
  loading: PropTypes.bool,
  
  /** Message when no data */
  emptyMessage: PropTypes.string,
  
  /** Enable sorting */
  sortable: PropTypes.bool,
  
  /** Sort handler */
  onSort: PropTypes.func,
  
  /** Enable pagination */
  pagination: PropTypes.bool,
  
  /** Rows per page options */
  rowsPerPageOptions: PropTypes.arrayOf(PropTypes.number),
  
  /** Default rows per page */
  defaultRowsPerPage: PropTypes.number,
  
  /** Custom styles */
  sx: PropTypes.object,
};

export default DataTable;