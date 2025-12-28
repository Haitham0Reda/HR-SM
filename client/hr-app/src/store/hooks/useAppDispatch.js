import { useDispatch } from 'react-redux';

/**
 * Custom hook for typed dispatch
 * Provides type-safe dispatch function for Redux actions
 */
export const useAppDispatch = () => useDispatch();

export default useAppDispatch;