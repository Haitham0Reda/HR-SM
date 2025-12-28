import { useSelector } from 'react-redux';

// Custom hook for typed selector
export const useAppSelector = (selector) => useSelector(selector);

export default useAppSelector;