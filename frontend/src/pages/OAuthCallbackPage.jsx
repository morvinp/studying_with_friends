import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../lib/axios';

const OAuthCallbackPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const error = urlParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        navigate('/login?error=oauth_failed');
        return;
      }

      if (!token) {
        console.error('No token received');
        navigate('/login?error=no_token');
        return;
      }

      try {
        // Store the token as cookie (to match your existing auth system)
        document.cookie = `jwt-studyapp=${token}; path=/; max-age=${7 * 24 * 60 * 60}`; // 7 days
        
        // Invalidate auth query to refetch user data
        await queryClient.invalidateQueries({ queryKey: ['authUser'] });
        
        // Navigate to home page
        navigate('/');
      } catch (error) {
        console.error('OAuth callback error:', error);
        navigate('/login?error=callback_failed');
      }
    };

    handleOAuthCallback();
  }, [navigate, queryClient]);

  return (
    <div className="min-h-screen flex items-center justify-center" data-theme="forest">
      <div className="text-center">
        <div className="loading loading-spinner loading-lg text-primary"></div>
        <p className="mt-4 text-lg">Completing authentication...</p>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;