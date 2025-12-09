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

// Design tokens - can be customized per app
const defaultDesignTokens = {
  borderRadius: {
    lg: '12px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  },
  typography: {
    fontWeight: {
      semibold: 600,
    },
  },
};

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
  designTokens = defaultDesignTokens,
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

  // Calculate paginated data
  const paginatedData = pagination
    ? data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : data;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data || data.length === 0) {
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
                <TableCell key={column.id} align={column.align || 'left'}>
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
          count={data.length}
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
  data: PropTypes.array.isRequired,
  
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
  
  /** Design tokens for theming */
  designTokens: PropTypes.object,
  
  /** Custom styles */
  sx: PropTypes.object,
};

export default DataTable;
