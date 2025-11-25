import React, { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Tooltip,
    Box,
    Typography,
    TablePagination,
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as ViewIcon,
} from '@mui/icons-material';

const DataTable = ({
    columns,
    data,
    onEdit,
    onDelete,
    onView,
    emptyMessage = 'No data available',
    rowsPerPageOptions = [10, 25, 50],
    defaultRowsPerPage = 10,
}) => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };
    console.log('DataTable received data:', data);
    console.log('DataTable data length:', data ? data.length : 'undefined');
    console.log('DataTable columns:', columns);

    // Log the first row if data exists
    if (data && data.length > 0) {
        console.log('First row data:', data[0]);
    }

    // Check if data is valid
    if (!data) {
        console.log('DataTable: data is null or undefined');
        return (
            <Paper
                sx={{
                    p: 6,
                    textAlign: 'center',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 1,
                }}
            >
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {emptyMessage}
                </Typography>
            </Paper>
        );
    }

    // Check if data is an array
    if (!Array.isArray(data)) {
        console.log('DataTable: data is not an array, type:', typeof data);
        return (
            <Paper
                sx={{
                    p: 6,
                    textAlign: 'center',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 1,
                }}
            >
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {emptyMessage}
                </Typography>
            </Paper>
        );
    }

    // Check if data array is empty
    if (data.length === 0) {
        console.log('DataTable showing empty state');
        return (
            <Paper
                sx={{
                    p: 6,
                    textAlign: 'center',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 1,
                }}
            >
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {emptyMessage}
                </Typography>
            </Paper>
        );
    }

    console.log('DataTable rendering table with', data.length, 'rows');
    return (
        <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            px: 2,
        }}>
            <TableContainer
                component={Paper}
                sx={{
                    boxShadow: 2,
                    borderRadius: '8px 8px 0 0',
                    border: '1px solid',
                    borderColor: 'divider',
                '& .MuiTable-root': {
                    minWidth: { xs: 600, sm: 650 },
                },
                '& .MuiTableCell-root': {
                    px: 3,
                    py: 2.5,
                },
            }}
        >
            <Table stickyHeader>
                <TableHead>
                    <TableRow>
                        {columns.map((column) => (
                            <TableCell
                                key={column.field}
                                align={column.align || 'left'}
                                sx={{
                                    fontWeight: 700,
                                    bgcolor: 'background.default',
                                    borderBottom: '2px solid',
                                    borderColor: 'divider',
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                    py: { xs: 2, sm: 2.5 },
                                    px: { xs: 1.5, sm: 2 },
                                    color: 'text.primary',
                                    verticalAlign: 'middle',
                                }}
                            >
                                {column.headerName}
                            </TableCell>
                        ))}
                        {(onEdit || onDelete || onView) && (
                            <TableCell
                                align="center"
                                sx={{
                                    fontWeight: 700,
                                    bgcolor: 'background.default',
                                    borderBottom: '2px solid',
                                    borderColor: 'divider',
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                    py: { xs: 2, sm: 2.5 },
                                    px: { xs: 1.5, sm: 2 },
                                    color: 'text.primary',
                                    verticalAlign: 'middle',
                                    width: '100px',
                                }}
                            >
                                Actions
                            </TableCell>
                        )}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((row, index) => (
                        <TableRow
                            key={row._id || row.id || index}
                            hover
                            sx={{
                                '&:hover': {
                                    bgcolor: 'action.hover',
                                    cursor: 'pointer',
                                },
                                '&:last-child td': {
                                    borderBottom: 0,
                                },
                                '&:nth-of-type(even)': {
                                    bgcolor: 'action.hover',
                                    opacity: 0.5,
                                },
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {columns.map((column) => {
                                let cellContent;
                                if (column.renderCell) {
                                    cellContent = column.renderCell(row, page * rowsPerPage + index);
                                } else {
                                    const value = row[column.field];
                                    // Handle different value types
                                    if (value === null || value === undefined) {
                                        cellContent = '-';
                                    } else if (typeof value === 'object') {
                                        // If it's an object, try to get a name or convert to string
                                        cellContent = value.name || value.title || JSON.stringify(value);
                                    } else {
                                        cellContent = value;
                                    }
                                }

                                return (
                                    <TableCell
                                        key={column.field}
                                        align={column.align || 'left'}
                                        sx={{
                                            py: { xs: 2, sm: 2.5 },
                                            px: { xs: 1.5, sm: 2 },
                                            fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                                            fontWeight: 500,
                                        }}
                                    >
                                        {cellContent}
                                    </TableCell>
                                );
                            })}
                            {(onEdit || onDelete || onView) && (
                                <TableCell
                                    align="center"
                                    sx={{
                                        py: { xs: 2, sm: 2.5 },
                                        px: { xs: 1.5, sm: 2 },
                                        width: '100px',
                                    }}
                                >
                                    <Box display="flex" gap={0.5} justifyContent="center">
                                        {onView && (
                                            <Tooltip title="View" arrow>
                                                <IconButton
                                                    size="small"
                                                    color="info"
                                                    onClick={() => onView(row)}
                                                    sx={{
                                                        '&:hover': {
                                                            bgcolor: 'info.light',
                                                            color: 'info.contrastText',
                                                        },
                                                    }}
                                                >
                                                    <ViewIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        {onEdit && (
                                            <Tooltip title="Edit" arrow>
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => onEdit(row)}
                                                    sx={{
                                                        '&:hover': {
                                                            bgcolor: 'primary.light',
                                                            color: 'primary.contrastText',
                                                        },
                                                    }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        {onDelete && (
                                            <Tooltip title="Delete" arrow>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => onDelete(row)}
                                                    sx={{
                                                        '&:hover': {
                                                            bgcolor: 'error.light',
                                                            color: 'error.contrastText',
                                                        },
                                                    }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Box>
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
        <TablePagination
            component={Paper}
            count={data.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={rowsPerPageOptions}
            sx={{
                borderTop: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                borderRadius: '0 0 8px 8px',
                boxShadow: 2,
                border: '1px solid',
                borderTop: 'none',
                '.MuiTablePagination-toolbar': {
                    px: 2,
                },
            }}
        />
        </Box>
    );
};

export default DataTable;
