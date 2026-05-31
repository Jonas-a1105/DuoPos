import React from 'react';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '../routes';

interface AuthGuardProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
}

export function AuthGuard({ children, isAuthenticated }: AuthGuardProps) {
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }
  return <>{children}</>;
}
