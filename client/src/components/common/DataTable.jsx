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
  sx = {},
}) => {
  const [orderBy, setOrderBy] = useState('');
  const [order, setOrder] = useState('asc');

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
          {data.map((row, index) => (
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
  
  /** Custom styles */
  sx: PropTypes.object,
};

export default DataTable;
