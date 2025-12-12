import * as React from 'react';
import PropTypes from 'prop-types';
import ListSubheader from '@mui/material/ListSubheader';

import DashboardSidebarContext from '../context/DashboardSidebarContext';
import { DRAWER_WIDTH } from '../constants';
import { getDrawerSxTransitionMixin } from '../mixins';

function DashboardSidebarHeaderItem({ children }) {
    const sidebarContext = React.useContext(DashboardSidebarContext);
    if (!sidebarContext) {
        throw new Error('Sidebar context was used without a provider.');
    }
    const {
        mini = false,
        fullyExpanded = true,
        hasDrawerTransitions,
    } = sidebarContext;

    return (
        <ListSubheader
            sx={{
                fontSize: 11,
                fontWeight: '700',
                height: mini ? 0 : 36,
                ...(hasDrawerTransitions
                    ? getDrawerSxTransitionMixin(fullyExpanded, 'height')
                    : {}),
                px: 2,
                py: 0,
                minWidth: DRAWER_WIDTH,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
                letterSpacing: 1,
                color: 'text.secondary',
                bgcolor: 'transparent',
                lineHeight: '36px',
                position: 'relative',
                top: 'auto',
                left: 'auto',
            }}
        >
            {children}
        </ListSubheader>
    );
}

DashboardSidebarHeaderItem.propTypes = {
    children: PropTypes.node,
};

export default DashboardSidebarHeaderItem;