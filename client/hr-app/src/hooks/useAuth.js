import { useAuth as useAuthFromRedux } from '../store/providers/ReduxAuthProvider';

export const useAuth = () => {
    return useAuthFromRedux();
};

export default useAuth;
