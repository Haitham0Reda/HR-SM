import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
} from '@mui/material';

const SimpleTable = ({ columns = [], data = [], emptyMessage = 'No data available' }) => {
  console.log('🔍 SimpleTable render:', { columns: columns.length, data: data.length });
  
  if (!Array.isArray(data)) {
    console.error('❌ SimpleTable: data is not an array:', data);
    return (
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <Typography variant="body2" color="error">
          Error: Invalid data format
        </Typography>
      </Box>
    );
  }

  if (!Array.isArray(columns) || columns.length === 0) {
    console.error('❌ SimpleTable: columns is not a valid array:', columns);
    return (
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <Typography variant="body2" color="error">
          Error: Invalid columns configuration
        </Typography>
      </Box>
    );
  }

  if (data.length === 0) {
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
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 1,
      }}
    >
      <Table sx={{ tableLayout: 'fixed' }}>
        <TableHead>
          <TableRow sx={{ bgcolor: 'background.default' }}>
            {columns.map((column) => (
              <TableCell
                key={column.id}
                align={column.align || 'left'}
                sx={{
                  fontWeight: 600,
                  borderBottom: '2px solid',
                  borderColor: 'divider',
                  width: column.width || 'auto',
                  minWidth: column.minWidth || 'auto',
                  maxWidth: column.maxWidth || 'auto',
                  padding: '8px 12px',
                  fontSize: '0.875rem',
                }}
              >
                {column.label}
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
                <TableCell 
                  key={column.id} 
                  align={column.align || 'left'}
                  sx={{
                    width: column.width || 'auto',
                    minWidth: column.minWidth || 'auto',
                    maxWidth: column.maxWidth || 'auto',
                    padding: '8px 12px',
                    fontSize: '0.875rem',
                  }}
                >
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

export default SimpleTable;