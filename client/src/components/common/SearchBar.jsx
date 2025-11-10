import React from 'react';
import { TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PropTypes from 'prop-types';

const SearchBar = ({ value, onChange, placeholder = 'Search...', fullWidth = true }) => {
    return (
        <TextField
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            fullWidth={fullWidth}
            size="medium"
            InputProps={{
                startAdornment: (
                    <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                ),
            }}
            sx={{
                '& .MuiOutlinedInput-root': {
                    backgroundColor: 'background.paper',
                    borderRadius: 2,
                    '&:hover': {
                        backgroundColor: 'action.hover',
                    },
                    '&.Mui-focused': {
                        backgroundColor: 'background.paper',
                    },
                },
            }}
        />
    );
};

SearchBar.propTypes = {
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    fullWidth: PropTypes.bool,
};

export default SearchBar;
