import { useAuth as useAuthFromContext } from '../contexts/AuthContext';

export const useAuth = () => {
    return useAuthFromContext();
};

export default useAuth;
