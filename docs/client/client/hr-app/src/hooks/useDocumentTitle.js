import { useEffect } from 'react';

/**
 * Custom hook to set the document title
 * @param {string} title - The title to set for the document
 */
export const useDocumentTitle = (title) => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} - HR Management System` : 'HR Management System';

    return () => {
      document.title = previousTitle;
    };
  }, [title]);
};

export default useDocumentTitle;
