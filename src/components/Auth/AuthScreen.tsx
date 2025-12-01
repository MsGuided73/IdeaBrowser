import React, { useState } from 'react';
import { Login } from './Login';
import { Register } from './Register';
import { Sparkles } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'forgot-password';

export const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');

  const handleSwitchToRegister = () => setMode('register');
  const handleSwitchToLogin = () => setMode('login');
  const handleForgotPassword = () => setMode('forgot-password');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">BizWiz</h1>
              <p className="text-sm text-gray-600">NeuroBoard</p>
            </div>
          </div>
        </div>
        <h2 className="mt-6 text-center text-xl font-semibold text-gray-900">
          AI-Powered Business Idea Generation
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Create, analyze, and validate business ideas with AI assistance
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {mode === 'login' && (
            <Login
              onSwitchToRegister={handleSwitchToRegister}
              onForgotPassword={handleForgotPassword}
            />
          )}
          {mode === 'register' && (
            <Register onSwitchToLogin={handleSwitchToLogin} />
          )}
          {mode === 'forgot-password' && (
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Forgot Password</h3>
              <p className="text-gray-600 mb-6">
                Password reset functionality is coming soon. Please contact support for assistance.
              </p>
              <button
                onClick={() => setMode('login')}
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-gray-500">
        <p>© 2024 BizWiz NeuroBoard. All rights reserved.</p>
      </div>
    </div>
  );
};
