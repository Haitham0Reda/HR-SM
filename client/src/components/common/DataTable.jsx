import React from 'react';
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
}) => {
    if (!data || data.length === 0) {
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

    return (
        <TableContainer
            component={Paper}
            sx={{
                boxShadow: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                flex: 1,
                overflow: 'auto',
                height: '100%',
                '& .MuiTable-root': {
                    minWidth: { xs: 600, sm: 650 },
                },
                '&::-webkit-scrollbar': {
                    width: { xs: '6px', sm: '10px' },
                    height: { xs: '6px', sm: '10px' },
                },
                '&::-webkit-scrollbar-track': {
                    bgcolor: 'background.default',
                    borderRadius: 2,
                },
                '&::-webkit-scrollbar-thumb': {
                    bgcolor: 'divider',
                    borderRadius: 2,
                    '&:hover': {
                        bgcolor: 'text.secondary',
                    },
                },
                '&::-webkit-scrollbar-corner': {
                    bgcolor: 'background.default',
                },
            }}
        >
            <Table stickyHeader>
                <TableHead>
                    <TableRow>
                        {columns.map((column) => (
                            <TableCell
                                key={column.field}
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
                                }}
                            >
                                {column.headerName}
                            </TableCell>
                        ))}
                        {(onEdit || onDelete || onView) && (
                            <TableCell
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
                                }}
                            >
                                Actions
                            </TableCell>
                        )}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.map((row, index) => (
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
                                    cellContent = column.renderCell(row);
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
                                    sx={{
                                        py: { xs: 2, sm: 2.5 },
                                        px: { xs: 1.5, sm: 2 },
                                    }}
                                >
                                    <Box display="flex" gap={0.5}>
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
    );
};

export default DataTable;
