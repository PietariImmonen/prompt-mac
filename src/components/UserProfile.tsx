import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const UserProfile: React.FC = () => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">Welcome!</h2>

      <div className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">User Information</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <strong>Email:</strong> {user.email}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <strong>User ID:</strong> {user.id}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <strong>Email Verified:</strong> {user.email_confirmed_at ? 'Yes' : 'No'}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <strong>Created:</strong> {new Date(user.created_at).toLocaleDateString()}
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default UserProfile;
