import { useState } from 'react';
import { Power, Phone, Lock, Eye, EyeOff, AlertCircle, Users } from 'lucide-react';

function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showDemoCredentials, setShowDemoCredentials] = useState(true);

  const validateForm = () => {
    const newErrors = {};

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^0\d{10}$/.test(formData.phone)) {
      newErrors.phone = 'Phone number must start with 0 and be 11 digits';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    
    // Clear field-specific error
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Clear general login error
    if (loginError) {
      setLoginError('');
    }
  };

  const handleQuickLogin = (phone, password, role) => {
    setFormData({ phone, password, rememberMe: false });
    setLoginError('');
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setLoginError('');

    try {
      console.log('[Login] Submitting credentials...');
      
      // Call the login function passed from App
      const result = await onLogin(
        {
          phone: formData.phone,
          password: formData.password
        },
        formData.rememberMe
      );

      console.log('[Login] Login successful:', result);

      // Handle API response
      if (!result || typeof result !== 'object') {
        console.error('[Login] Invalid response format:', result);
        throw new Error('Unexpected server response');
      }

      console.log('[Login] Authentication complete, user:', result);
      // Success - user will be redirected by App component

    } catch (error) {
      console.error('[Login] Error:', error);
      
      // User-friendly error messages
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.message.startsWith('AUTH_ERROR:')) {
        // Handle authentication-specific errors
        errorMessage = error.message.replace('AUTH_ERROR:', '').trim();
      } else if (error.message.includes('fetch') || error.message.includes('Network')) {
        errorMessage = 'Unable to connect to server. Please check your internet connection.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message.includes('Unexpected')) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setLoginError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-2xl shadow-xl">
              <Power className="w-12 h-12 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            JED Meter Management
          </h2>
          <p className="text-sm text-gray-600 font-medium">
            ME Metering Integration (JEDC Partnership)
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Sign in to access your account
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {loginError && (
              <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4 animate-fade-in">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800">{loginError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Phone Number Field */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  maxLength="11"
                  className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all ${
                    errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="08012345678"
                  autoComplete="tel"
                />
              </div>
              {errors.phone && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.phone}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className={`block w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all ${
                    errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  tabIndex="-1"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700 cursor-pointer">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a 
                  href="#" 
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Please contact your administrator for password reset.');
                  }}
                >
                  Forgot password?
                </a>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  <Power className="w-5 h-5 mr-2" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          {showDemoCredentials && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <p className="text-xs font-semibold text-gray-700">Quick Login (Demo)</p>
                </div>
                <button
                  onClick={() => setShowDemoCredentials(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Hide
                </button>
              </div>
              
              <div className="space-y-2">
                {/* Admin Login */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('08012345679', 'Pass123!', 'Admin')}
                  disabled={isSubmitting}
                  className="w-full p-3 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-all text-left disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-purple-900">Admin Account</p>
                      <p className="text-xs text-purple-700 mt-0.5">08012345679 • Pass123!</p>
                    </div>
                    <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full font-medium">
                      ADMIN
                    </span>
                  </div>
                </button>

                {/* Installer Login */}
                <button
                  type="button"
                  onClick={() => handleQuickLogin('08012345680', 'Pass123!', 'Installer')}
                  disabled={isSubmitting}
                  className="w-full p-3 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all text-left disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-blue-900">Installer Account</p>
                      <p className="text-xs text-blue-700 mt-0.5">08012345680 • Pass123!</p>
                    </div>
                    <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full font-medium">
                      INSTALLER
                    </span>
                  </div>
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-3 text-center italic">
                Click any card to auto-fill credentials
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <a 
              href="#" 
              className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                alert('Please contact your administrator to create an account.');
              }}
            >
              Contact Administrator
            </a>
          </p>
          <p className="text-xs text-gray-500 mt-4">
            © 2024 JED Meter Management. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;