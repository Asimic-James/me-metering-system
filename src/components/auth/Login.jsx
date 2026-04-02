// src/components/auth/Login.jsx
// Modern, mobile-first login with best practices
import { useState, useCallback, useEffect } from 'react';
import { Power, Phone, Lock, Eye, EyeOff, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import InfoModal from '../common/InfoModal';

// Validation rules
const VALIDATION = {
  PHONE: /^0\d{10}$/,
  PASSWORD_MIN: 6
};

// Input field component - Moved outside Login to prevent re-rendering issues
 
const InputField = ({ 
  label, 
  name, 
  type, 
  value,
  error,
  isTouched,
  isSubmitting,
  icon: Icon, 
  placeholder, 
  autoComplete,
  showToggle = false,
  onChange,
  onBlur,
  onTogglePassword,
  maxLength
}) => (
  <div className="space-y-2">
    <label 
      htmlFor={name}
      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
    >
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Icon className={`h-5 w-5 ${error && isTouched ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`} />
      </div>
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={isSubmitting}
        maxLength={maxLength}
        className={`
          block w-full pl-10 ${showToggle ? 'pr-10' : 'pr-3'} py-3
          border rounded-lg
          focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
          text-gray-900 dark:text-white
          placeholder-gray-400 dark:placeholder-gray-500
          ${error && isTouched
            ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/10 focus:ring-red-500'
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
          }
        `}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error && isTouched ? 'true' : 'false'}
        aria-describedby={error && isTouched ? `${name}-error` : undefined}
      />
      {showToggle && (
        <button
          type="button"
          onClick={onTogglePassword}
          disabled={isSubmitting}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
          tabIndex={-1}
          aria-label={type === 'text' ? 'Hide password' : 'Show password'}
        >
          {type === 'text' ? (
            <EyeOff className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
          ) : (
            <Eye className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
          )}
        </button>
      )}
    </div>
    {error && isTouched && (
      <p id={`${name}-error`} className="text-sm text-red-600 dark:text-red-400 flex items-start gap-1.5" role="alert">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>{error}</span>
      </p>
    )}
  </div>
);

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
  const [modalContent, setModalContent] = useState({ isOpen: false, title: '', message: '' });
  const [touched, setTouched] = useState({});

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (loginError) {
      const timer = setTimeout(() => setLoginError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [loginError]);

  // Real-time validation
  const validateField = useCallback((name, value) => {
    switch (name) {
      case 'phone':
        if (!value.trim()) return 'Phone number is required';
        if (!VALIDATION.PHONE.test(value)) return 'Enter valid 11-digit phone (e.g., 08012345678)';
        return '';
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < VALIDATION.PASSWORD_MIN) return `Password must be at least ${VALIDATION.PASSWORD_MIN} characters`;
        return '';
      default:
        return '';
    }
  }, []);

  // Handle input changes with real-time validation
  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({ ...prev, [name]: newValue }));
    
    // Validate if field has been touched
    if (touched[name]) {
      const error = validateField(name, newValue);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
    
    if (loginError) setLoginError('');
  }, [touched, validateField, loginError]);

  // Handle field blur for validation
  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [validateField]);

  // Toggle password visibility
  const togglePassword = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  // Form validation
  const validateForm = useCallback(() => {
    const phoneError = validateField('phone', formData.phone);
    const passwordError = validateField('password', formData.password);
    
    const newErrors = {
      phone: phoneError,
      password: passwordError
    };
    
    setErrors(newErrors);
    setTouched({ phone: true, password: true });
    
    return !phoneError && !passwordError;
  }, [formData, validateField]);

  // Handle submit
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setLoginError('');

    try {
      await onLogin({
        phone: formData.phone,
        password: formData.password
      });
    } catch (error) {
      console.error('[Login] Error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      const msg = String(error?.message || '').toLowerCase();
      
      if (msg.includes('auth_error') || msg.includes('invalid credentials')) {
        errorMessage = 'Invalid phone number or password';
      } else if (msg.includes('network') || msg.includes('fetch')) {
        errorMessage = 'Connection error. Check your internet';
      } else if (msg.includes('timeout')) {
        errorMessage = 'Request timed out. Try again';
      } else if (error.message) {
        errorMessage = error.message.replace(/^[A-Z_]+:/, '').trim();
      }
      
      setLoginError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onLogin, validateForm]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
      {/* Top decoration */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>
      
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-600 rounded-2xl blur-xl opacity-30 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-blue-600 to-indigo-600 p-3 sm:p-4 rounded-2xl shadow-xl">
                  <Power className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Welcome Back
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                ME Meter Management System
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                <ShieldCheck className="w-4 h-4" />
                <span>Secure Login Portal</span>
              </div>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Error Banner */}
            {loginError && (
              <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      {loginError}
                    </p>
                  </div>
                  <button
                    onClick={() => setLoginError('')}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                    aria-label="Dismiss error"
                  >
                    <AlertCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
              <InputField
                label="Phone Number"
                name="phone"
                type="tel"
                value={formData.phone}
                error={errors.phone}
                isTouched={touched.phone}
                isSubmitting={isSubmitting}
                icon={Phone}
                placeholder="08012345678"
                autoComplete="tel"
                onChange={handleInputChange}
                onBlur={handleBlur}
                maxLength={11}
              />

              <InputField
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                error={errors.password}
                isTouched={touched.password}
                isSubmitting={isSubmitting}
                icon={Lock}
                placeholder="Enter your password"
                autoComplete="current-password"
                showToggle
                onChange={handleInputChange}
                onBlur={handleBlur}
                onTogglePassword={togglePassword}
              />

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                  />
                  <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    Remember me
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setModalContent({ 
                    isOpen: true, 
                    title: 'Password Reset', 
                    message: 'For security reasons, please contact your system administrator to reset your password.' })}
                  className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="
                  w-full flex items-center justify-center gap-2
                  py-3 px-4 rounded-lg
                  text-base font-semibold text-white
                  bg-gradient-to-r from-blue-600 to-indigo-600
                  hover:from-blue-700 hover:to-indigo-700
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed
                  shadow-lg hover:shadow-xl
                  transition-all duration-200
                  transform hover:scale-[1.02] active:scale-[0.98]
                "
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <Power className="w-5 h-5" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setModalContent({ 
                  isOpen: true, 
                  title: 'Account Creation', 
                  message: 'New user accounts must be created by a system administrator. Please contact support for assistance.' })}
                className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
              >
                Contact Administrator
              </button>
            </p>
            
            <p className="text-xs text-gray-500 dark:text-gray-500">
              © {new Date().getFullYear()} JEDC Meter Management. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Informational Modal */}
      <InfoModal
        isOpen={modalContent.isOpen}
        onClose={() => setModalContent({ isOpen: false, title: '', message: '' })}
        title={modalContent.title}
      >
        <p>{modalContent.message}</p>
      </InfoModal>
    </div>
  );
}

export default Login;