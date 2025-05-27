import React from 'react';
import { FaGoogle, FaGithub } from 'react-icons/fa';

const OAuthButtons = ({ isLoading = false }) => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleGoogleLogin = () => {
    if (isLoading) return;
    window.location.href = `${API_URL}/api/auth/google`;
  };

  const handleGithubLogin = () => {
    if (isLoading) return;
    window.location.href = `${API_URL}/api/auth/github`;
  };

  return (
    <div className="space-y-3">
      {/* Google OAuth Button */}
      <button
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="btn btn-outline w-full flex items-center justify-center gap-3 hover:bg-red-50 hover:border-red-200 disabled:opacity-50"
      >
        <FaGoogle className="text-red-500 text-lg" />
        <span className="text-gray-700">Continue with Google</span>
      </button>

      {/* GitHub OAuth Button */}
      <button
        onClick={handleGithubLogin}
        disabled={isLoading}
        className="btn btn-outline w-full flex items-center justify-center gap-3 hover:bg-gray-800 hover:text-white hover:border-gray-800 disabled:opacity-50"
      >
        <FaGithub className="text-gray-800 text-lg" />
        <span>Continue with GitHub</span>
      </button>

      {/* Divider */}
      <div className="divider">or</div>
    </div>
  );
};

export default OAuthButtons;