import { useSelector } from 'react-redux';

/**
 * Custom hook for typed selector
 * Provides type-safe selector function for Redux state
 */
export const useAppSelector = (selector) => useSelector(selector);

export default useAppSelector;