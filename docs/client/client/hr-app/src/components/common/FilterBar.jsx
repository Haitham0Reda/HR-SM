import React from 'react';
import { Box, TextField, MenuItem, Button, Chip } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import PropTypes from 'prop-types';

const FilterBar = ({ filters, activeFilters, onFilterChange, onClearFilters }) => {
    const hasActiveFilters = Object.values(activeFilters).some((value) => value !== '' && value !== null);

    return (
        <Box
            sx={{
                display: 'flex',
                gap: 2,
                flexWrap: 'wrap',
                alignItems: 'center',
                p: 2,
                bgcolor: 'background.paper',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterListIcon sx={{ color: 'text.secondary' }} />
                <Chip
                    label={`${Object.keys(activeFilters).filter((key) => activeFilters[key]).length} Filters`}
                    size="small"
                    color={hasActiveFilters ? 'primary' : 'default'}
                    sx={{ fontWeight: 600 }}
                />
            </Box>

            {filters.map((filter) => (
                <TextField
                    key={filter.name}
                    select={filter.type === 'select'}
                    label={filter.label}
                    value={activeFilters[filter.name] || ''}
                    onChange={(e) => onFilterChange(filter.name, e.target.value)}
                    size="small"
                    sx={{
                        minWidth: 150,
                        '& .MuiOutlinedInput-root': {
                            backgroundColor: 'background.default',
                        },
                    }}
                >
                    {filter.type === 'select' &&
                        filter.options.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                </TextField>
            ))}

            {hasActiveFilters && (
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ClearIcon />}
                    onClick={onClearFilters}
                    sx={{ ml: 'auto' }}
                >
                    Clear Filters
                </Button>
            )}
        </Box>
    );
};

FilterBar.propTypes = {
    filters: PropTypes.arrayOf(
        PropTypes.shape({
            name: PropTypes.string.isRequired,
            label: PropTypes.string.isRequired,
            type: PropTypes.oneOf(['text', 'select']).isRequired,
            options: PropTypes.arrayOf(
                PropTypes.shape({
                    value: PropTypes.string.isRequired,
                    label: PropTypes.string.isRequired,
                })
            ),
        })
    ).isRequired,
    activeFilters: PropTypes.object.isRequired,
    onFilterChange: PropTypes.func.isRequired,
    onClearFilters: PropTypes.func.isRequired,
};

export default FilterBar;
