# Supabase Integration Setup Instructions

This guide will help you set up Supabase authentication in your Vite React TypeScript Electron application.

## 🚀 What's Been Implemented

✅ **Supabase Client Configuration**

- Configured Supabase client with environment variables
- Type-safe authentication integration

✅ **Authentication Context**

- React context for managing authentication state
- Custom hooks for easy authentication access
- Session management with automatic state updates

✅ **Authentication Components**

- `AuthForm`: Sign in/Sign up form with error handling
- `UserProfile`: User information display with sign out functionality
- `ProtectedRoute`: Component wrapper for authenticated content

✅ **UI Integration**

- Seamless integration with existing dark mode and internationalization
- Responsive design using Tailwind CSS
- Loading states and error handling

## 🔧 Setup Steps

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new account or sign in
2. Create a new project
3. Wait for the project to be fully set up

### 2. Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy your:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **Anon Public Key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### 3. Configure Environment Variables

Create a `.env.local` file in your project root:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Important**: Replace the placeholder values with your actual Supabase credentials.

### 4. Configure Authentication in Supabase

1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Configure your **Site URL** (for development, use `http://localhost:3000`)
3. Add any additional redirect URLs if needed
4. Configure email authentication settings under **Auth** → **Settings** → **Email**

### 5. Test the Integration

1. Start your development server:

   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000` (or your configured port)

3. You should see:
   - A sign-in form when not authenticated
   - User profile and protected content when authenticated

## 🔐 Authentication Features

### Sign Up

- Users can create new accounts with email and password
- Email confirmation is required (configurable in Supabase)
- Automatic redirect to sign-in after successful registration

### Sign In

- Email and password authentication
- Persistent sessions across browser refreshes
- Automatic token refresh

### Sign Out

- Clear user session and redirect to sign-in form
- Secure token invalidation

### Protected Routes

- Use the `ProtectedRoute` component to wrap authenticated content
- Automatic loading states during authentication checks

## 📁 File Structure

```
src/
├── config/
│   └── supabase.ts           # Supabase client configuration
├── context/
│   └── AuthContext.tsx       # Authentication context and provider
├── components/
│   ├── AuthForm.tsx          # Sign in/up form
│   ├── UserProfile.tsx       # User profile display
│   └── ProtectedRoute.tsx    # Protected route wrapper
├── App.tsx                   # Updated with auth integration
└── main.tsx                  # Updated with AuthProvider
```

## 🎯 Usage Examples

### Using Authentication in Components

```tsx
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { user, signOut, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!user) return <div>Please sign in</div>;

  return (
    <div>
      <p>Welcome, {user.email}!</p>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}
```

### Protecting Routes

```tsx
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <ProtectedRoute fallback={<AuthForm />}>
      <Dashboard />
    </ProtectedRoute>
  );
}
```

## 🔧 Customization

### Adding More Authentication Methods

You can extend the authentication to include:

- Google OAuth
- GitHub OAuth
- Magic links
- Phone number authentication

Example for Google OAuth:

```tsx
const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google'
  });
  if (error) console.error('Error:', error);
};
```

### Database Integration

To add database functionality:

1. Create tables in your Supabase dashboard
2. Set up Row Level Security (RLS) policies
3. Use the Supabase client to query data:

```tsx
const { data, error } = await supabase.from('your_table').select('*').eq('user_id', user.id);
```

## 🚨 Security Notes

- Never commit your `.env.local` file to version control
- Use Row Level Security (RLS) policies in Supabase for data protection
- Validate user inputs on both client and server side
- Regularly rotate your API keys

## 🐛 Troubleshooting

### Common Issues

1. **"Missing Supabase environment variables" error**

   - Ensure your `.env.local` file is in the project root
   - Verify variable names match exactly: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - Restart your development server after adding environment variables

2. **Authentication not working**

   - Check your Supabase project URL and API key
   - Verify your project is properly configured in the Supabase dashboard
   - Check the browser console for error messages

3. **Email confirmation not working**
   - Check your Supabase authentication settings
   - Verify your email configuration in Supabase
   - Check your spam folder for confirmation emails

### Getting Help

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Authentication Guide](https://supabase.com/docs/guides/auth)
- [Supabase Community](https://github.com/supabase/supabase/discussions)

## 🎉 Next Steps

Your Supabase integration is now complete! You can:

- Add database tables and queries
- Implement user profiles and preferences
- Add real-time subscriptions
- Deploy your application with proper environment variables

Happy coding! 🚀
