import React, { memo, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';

/**
 * Optimized list component for rendering large datasets
 * Uses react-window for virtualization to improve performance
 */
const OptimizedList = memo(({ 
    items = [], 
    itemHeight = 50, 
    height = 400, 
    renderItem, 
    keyExtractor = (item, index) => item.id || index,
    ...props 
}) => {
    // Memoize the item data to prevent unnecessary re-renders
    const itemData = useMemo(() => ({
        items,
        renderItem
    }), [items, renderItem]);

    // Row renderer for react-window
    const Row = memo(({ index, style, data }) => {
        const item = data.items[index];
        return (
            <div style={style}>
                {data.renderItem(item, index)}
            </div>
        );
    });

    Row.displayName = 'OptimizedListRow';

    if (!items || items.length === 0) {
        return <div>No items to display</div>;
    }

    return (
        <List
            height={height}
            itemCount={items.length}
            itemSize={itemHeight}
            itemData={itemData}
            {...props}
        >
            {Row}
        </List>
    );
});

OptimizedList.displayName = 'OptimizedList';

export default OptimizedList;