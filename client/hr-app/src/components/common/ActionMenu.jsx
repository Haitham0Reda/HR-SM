import React, { useState } from 'react';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PropTypes from 'prop-types';

const ActionMenu = ({ actions }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const handleClick = (event) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    };

    const handleClose = (event) => {
        event?.stopPropagation();
        setAnchorEl(null);
    };

    const handleAction = (event, action) => {
        event.stopPropagation();
        handleClose();
        action.onClick();
    };

    return (
        <>
            <IconButton
                size="small"
                onClick={handleClick}
                sx={{
                    '&:hover': {
                        bgcolor: 'action.hover',
                    },
                }}
            >
                <MoreVertIcon />
            </IconButton>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                onClick={(e) => e.stopPropagation()}
                PaperProps={{
                    elevation: 3,
                    sx: {
                        minWidth: 180,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        '& .MuiMenuItem-root': {
                            borderRadius: 1,
                            mx: 1,
                            my: 0.5,
                            '&:hover': {
                                backgroundColor: 'action.hover',
                            },
                        },
                    },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                {actions.map((action, index) => (
                    <React.Fragment key={action.label}>
                        {action.divider && index > 0 && <Divider sx={{ my: 1 }} />}
                        <MenuItem
                            onClick={(e) => handleAction(e, action)}
                            disabled={action.disabled}
                            sx={{
                                color: action.color || 'text.primary',
                            }}
                        >
                            {action.icon && (
                                <ListItemIcon
                                    sx={{
                                        color: action.color || 'inherit',
                                    }}
                                >
                                    {action.icon}
                                </ListItemIcon>
                            )}
                            <ListItemText
                                primary={action.label}
                                primaryTypographyProps={{
                                    variant: 'body2',
                                    fontWeight: 500,
                                }}
                            />
                        </MenuItem>
                    </React.Fragment>
                ))}
            </Menu>
        </>
    );
};

ActionMenu.propTypes = {
    actions: PropTypes.arrayOf(
        PropTypes.shape({
            label: PropTypes.string.isRequired,
            icon: PropTypes.node,
            onClick: PropTypes.func.isRequired,
            disabled: PropTypes.bool,
            color: PropTypes.string,
            divider: PropTypes.bool,
        })
    ).isRequired,
};

export default ActionMenu;
