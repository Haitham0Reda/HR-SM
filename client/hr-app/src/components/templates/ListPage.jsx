/**
 * ListPage Template
 * 
 * A reusable template for list/index pages with search, filters, and pagination.
 * 
 * Features:
 * - Consistent layout structure
 * - Search functionality
 * - Filter options
 * - Pagination controls
 * - Loading and empty states
 * - Responsive design
 * 
 * Usage:
 * ```jsx
 * <ListPage
 *   title="Users"
 *   items={users}
 *   columns={columns}
 *   onSearch={handleSearch}
 *   onFilter={handleFilter}
 *   onPageChange={handlePageChange}
 *   totalPages={10}
 *   currentPage={1}
 * />
 * ```
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Stack,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { spacing } from '../../theme/designTokens';

const ListPage = ({
  title,
  subtitle,
  items = [],
  columns = [],
  loading = false,
  searchPlaceholder = 'Search...',
  onSearch,
  filters = [],
  activeFilters = {},
  onFilterChange,
  onAdd,
  onRefresh,
  onRowClick,
  pagination = true,
  page = 0,
  rowsPerPage = 10,
  totalCount = 0,
  onPageChange,
  onRowsPerPageChange,
  emptyMessage = 'No items found',
  emptyIcon,
  actions,
  renderRow,
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchValue(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleFilterClick = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  const handleFilterSelect = (filterKey, value) => {
    if (onFilterChange) {
      onFilterChange(filterKey, value);
    }
    handleFilterClose();
  };

  const handlePageChange = (event, newPage) => {
    if (onPageChange) {
      onPageChange(newPage);
    }
  };

  const handleRowsPerPageChange = (event) => {
    if (onRowsPerPageChange) {
      onRowsPerPageChange(parseInt(event.target.value, 10));
    }
  };

  const activeFilterCount = Object.keys(activeFilters).filter(
    key => activeFilters[key] !== null && activeFilters[key] !== undefined
  ).length;

  return (
    <Box sx={{ padding: spacing(3) }}>
      {/* Header */}
      <Box sx={{ marginBottom: spacing(3) }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box>
            <Typography variant="h4" gutterBottom>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1}>
            {onRefresh && (
              <IconButton onClick={onRefresh} size="small">
                <RefreshIcon />
              </IconButton>
            )}
            {onAdd && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={onAdd}
              >
                Add New
              </Button>
            )}
            {actions}
          </Stack>
        </Stack>
      </Box>

      {/* Search and Filters */}
      <Card sx={{ marginBottom: spacing(2) }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              fullWidth
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
            {filters.length > 0 && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<FilterIcon />}
                  onClick={handleFilterClick}
                  endIcon={
                    activeFilterCount > 0 && (
                      <Chip
                        label={activeFilterCount}
                        size="small"
                        color="primary"
                      />
                    )
                  }
                >
                  Filters
                </Button>
                <Menu
                  anchorEl={filterAnchorEl}
                  open={Boolean(filterAnchorEl)}
                  onClose={handleFilterClose}
                >
                  {filters.map((filter) => (
                    <MenuItem
                      key={filter.key}
                      onClick={() => handleFilterSelect(filter.key, filter.value)}
                    >
                      {filter.label}
                    </MenuItem>
                  ))}
                </Menu>
              </>
            )}
          </Stack>

          {/* Active Filters */}
          {activeFilterCount > 0 && (
            <Box sx={{ marginTop: spacing(2) }}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {Object.entries(activeFilters).map(([key, value]) => {
                  if (value === null || value === undefined) return null;
                  const filter = filters.find(f => f.key === key);
                  return (
                    <Chip
                      key={key}
                      label={`${filter?.label || key}: ${value}`}
                      onDelete={() => handleFilterSelect(key, null)}
                      size="small"
                    />
                  );
                })}
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.align || 'left'}
                    style={{ minWidth: column.minWidth }}
                  >
                    {column.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center">
                    <Box sx={{ padding: spacing(4) }}>
                      <CircularProgress />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center">
                    <Box sx={{ padding: spacing(4) }}>
                      {emptyIcon && <Box sx={{ marginBottom: spacing(2) }}>{emptyIcon}</Box>}
                      <Typography variant="body1" color="text.secondary">
                        {emptyMessage}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => (
                  <TableRow
                    key={item.id || index}
                    hover
                    onClick={() => onRowClick && onRowClick(item)}
                    sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  >
                    {renderRow ? (
                      renderRow(item, columns)
                    ) : (
                      columns.map((column) => (
                        <TableCell key={column.id} align={column.align || 'left'}>
                          {column.format
                            ? column.format(item[column.id], item)
                            : item[column.id]}
                        </TableCell>
                      ))
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {pagination && !loading && items.length > 0 && (
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        )}
      </Card>
    </Box>
  );
};

ListPage.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  items: PropTypes.array,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      minWidth: PropTypes.number,
      align: PropTypes.oneOf(['left', 'center', 'right']),
      format: PropTypes.func,
    })
  ).isRequired,
  loading: PropTypes.bool,
  searchPlaceholder: PropTypes.string,
  onSearch: PropTypes.func,
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      value: PropTypes.any,
    })
  ),
  activeFilters: PropTypes.object,
  onFilterChange: PropTypes.func,
  onAdd: PropTypes.func,
  onRefresh: PropTypes.func,
  onRowClick: PropTypes.func,
  pagination: PropTypes.bool,
  page: PropTypes.number,
  rowsPerPage: PropTypes.number,
  totalCount: PropTypes.number,
  onPageChange: PropTypes.func,
  onRowsPerPageChange: PropTypes.func,
  emptyMessage: PropTypes.string,
  emptyIcon: PropTypes.node,
  actions: PropTypes.node,
  renderRow: PropTypes.func,
};

export default ListPage;
