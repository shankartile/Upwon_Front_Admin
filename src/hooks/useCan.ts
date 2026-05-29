import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { roleCan, type Permission } from '../config/permissions';

export function useCan() {
  const { user } = useAuth();
  return useCallback((perm: Permission) => (user ? roleCan(user.role, perm) : false), [user]);
}
