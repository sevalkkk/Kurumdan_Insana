import React from 'react';
import { Redirect, useLocation } from 'wouter';
import { useAuth } from './AuthContext';

interface AdminRouteProps {
  component: React.ComponentType<any>;
  [key: string]: any;
}

export function AdminRoute({ component: Component, ...rest }: AdminRouteProps) {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();

  // If unauthenticated, redirect to login
  if (!isAuthenticated) {
    const redirectUrl = `/login?redirect=${encodeURIComponent(location)}`;
    return <Redirect to={redirectUrl} />;
  }

  // If authenticated but not admin, deny access and return to home view
  if (user?.role !== 'admin' && user?.email !== 'admin@gmail.com') {
    return <Redirect to="/" />;
  }

  return <Component {...rest} />;
}
