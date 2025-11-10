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
            <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">{emptyMessage}</Typography>
            </Paper>
        );
    }

    return (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        {columns.map((column) => (
                            <TableCell key={column.field} sx={{ fontWeight: 'bold' }}>
                                {column.headerName}
                            </TableCell>
                        ))}
                        {(onEdit || onDelete || onView) && (
                            <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                        )}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.map((row, index) => (
                        <TableRow key={row._id || row.id || index} hover>
                            {columns.map((column) => (
                                <TableCell key={column.field}>
                                    {column.renderCell
                                        ? column.renderCell(row)
                                        : row[column.field]}
                                </TableCell>
                            ))}
                            {(onEdit || onDelete || onView) && (
                                <TableCell>
                                    <Box display="flex" gap={1}>
                                        {onView && (
                                            <Tooltip title="View">
                                                <IconButton
                                                    size="small"
                                                    color="info"
                                                    onClick={() => onView(row)}
                                                >
                                                    <ViewIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        {onEdit && (
                                            <Tooltip title="Edit">
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => onEdit(row)}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        {onDelete && (
                                            <Tooltip title="Delete">
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => onDelete(row)}
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
