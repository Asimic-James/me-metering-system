import { Power, User, LogOut, ChevronDown, Menu, X, Bell, Mail, Phone, MapPin, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import JEDApiService from '../services/api';
import VerificationModal from '../auth/VerificationModal';

// Header-specific constants
const HEADER_STYLES = {
  gradient: 'bg-gradient-to-r from-blue-600 to-blue-700',
  mobile: {
    menuButton: 'lg:hidden p-2 -ml-2 hover:bg-blue-700 rounded-lg transition-colors',
    avatar: 'w-9 h-9 bg-gradient-to-br from-blue-400 to-blue-500',
    title: 'text-base font-bold truncate',
    subtitle: 'text-blue-100 text-xs'
  },
  desktop: {
    avatar: 'sm:w-9 sm:h-9',
    title: 'sm:text-lg md:text-xl lg:text-2xl font-bold',
    subtitle: 'text-blue-100 text-sm'
  }
};

// Header-specific hooks
const useClickOutside = (ref, callback) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, callback]);
};

const getUserInitials = (user) => {
  if (!user) return 'U';

  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }

  if (user.name) {
    const parts = user.name.split(' ').filter(Boolean);
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0]?.substring(0, 2).toUpperCase() || 'U';
  }

  return 'U';
};

// Profile Modal Component
const ProfileModal = ({ isOpen, onClose, profileData, loading, error, onStartVerification }) => {
  if (!isOpen) return null;

  const DetailItem = ({ icon: Icon, label, value, isVerified, verificationType, contact }) => (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-800">{value || 'Not provided'}</p>
          {isVerified === false && onStartVerification && (
            <button onClick={() => onStartVerification(verificationType, contact)} className="text-xs text-blue-600 hover:underline font-semibold">Verify</button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-4 sm:p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">User Profile</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="mt-3 text-sm text-gray-600">Loading profile...</p>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <p className="mt-3 text-sm text-red-600">{error}</p>
            </div>
          )}
          {!loading && !error && profileData && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center font-bold text-white text-2xl shadow-lg">
                  {getUserInitials(profileData)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{`${profileData.firstName || ''} ${profileData.lastName || ''}`}</h3>
                  <p className="text-sm text-gray-600 capitalize">{profileData.role?.toLowerCase()}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 border-t pt-6">
                <DetailItem icon={Mail} label="Email" value={profileData.email} />
                <DetailItem icon={Phone} label="Phone" value={profileData.phone} />
                <DetailItem icon={MapPin} label="Home Address" value={profileData.homeAddress} />
                <DetailItem icon={Shield} label="NIN" value={profileData.nin} />
                <DetailItem icon={profileData.isEmailVerified ? CheckCircle : AlertCircle} label="Email Verified" value={profileData.isEmailVerified ? 'Yes' : 'No'} isVerified={profileData.isEmailVerified} verificationType="email" contact={profileData.email} onStartVerification={onStartVerification} />
                <DetailItem icon={profileData.isPhoneVerified ? CheckCircle : AlertCircle} label="Phone Verified" value={profileData.isPhoneVerified ? 'Yes' : 'No'} isVerified={profileData.isPhoneVerified} verificationType="phone" contact={profileData.phone} onStartVerification={onStartVerification} />
                <DetailItem icon={profileData.isActive ? CheckCircle : AlertCircle} label="Account Active" value={profileData.isActive ? 'Yes' : 'No'} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function Header({ user, onLogout, onMenuToggle, isMenuOpen }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationDetails, setVerificationDetails] = useState({ type: 'phone', contact: '' });
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useClickOutside(dropdownRef, () => setShowDropdown(false));

  const handleDropdownToggle = useCallback(() => {
    setShowDropdown(prev => !prev);
  }, []);

  const handleLogout = useCallback(() => {
    setShowDropdown(false);
    onLogout();
  }, [onLogout]);

  const handleProfileClick = useCallback(async () => {
    setShowDropdown(false);
    setShowProfileModal(true);
    setProfileLoading(true);
    setProfileError(null);

    try {
      const response = await JEDApiService.getProfile();
      if (response.success && response.data) {
        setProfileData(response.data);
      } else {
        // Fallback for different response structures
        setProfileData(response.user || response.data || response);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setProfileError(err.message || 'Could not load profile data.');
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const handleSettingsClick = useCallback(() => {
    setShowDropdown(false);
    navigate('/settings');
  }, [navigate]);

  const handleStartVerification = useCallback((type, contact) => {
    console.log(`Starting verification for ${type}: ${contact}`);
    setVerificationDetails({ type, contact });
    setShowProfileModal(false); // Close profile modal
    setIsVerificationModalOpen(true); // Open verification modal
  }, []);

  const handleVerificationSuccess = useCallback(() => {
    console.log('Verification successful!');
    setIsVerificationModalOpen(false);
    handleProfileClick(); // Re-fetch profile to show updated status
  }, [handleProfileClick]);

  const MenuIcon = useCallback(() => 
    isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />, 
  [isMenuOpen]);

  // Header Sub-components
  const UserInfo = useCallback(() => (
    <div className="px-4 py-3 border-b border-gray-100">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center font-bold text-white text-lg shadow-md">
          {getUserInitials(user)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-600 truncate capitalize">{user.role}</p>
            <p className="text-xs text-gray-600 truncate">• {user.email}</p>
          </div>
        </div>
      </div>
    </div>
  ), [user]);

  const DropdownMenuItems = useCallback(() => (
    <>
      <button
        onClick={handleProfileClick}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <User className="w-4 h-4" />
        <span>View Profile</span>
      </button>

      <button
        onClick={handleSettingsClick}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>Settings</span>
      </button>
    </>
  ), [handleProfileClick, handleSettingsClick]);

  const LogoSection = useCallback(() => (
    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
      <div className="flex-shrink-0">
        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
          <Power className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>
      <div className="min-w-0">
        <h1 className={`${HEADER_STYLES.mobile.title} ${HEADER_STYLES.desktop.title}`}>
          ME Metering Integration
        </h1>
        <p className={`${HEADER_STYLES.desktop.subtitle} hidden sm:block`}>
          JEDC Partnership - Meter Management System
        </p>
        <p className={`${HEADER_STYLES.mobile.subtitle} sm:hidden`}>
          JEDC Partnership
        </p>
      </div>
    </div>
  ), []);

  const UserAvatar = useCallback(() => (
    <button
      onClick={handleDropdownToggle} // Simplified for mobile
      className="flex items-center gap-2 sm:gap-3 bg-blue-700/50 hover:bg-blue-700 rounded-lg sm:px-4 sm:py-2 p-1.5 transition-all duration-200 hover:shadow-lg"
      aria-expanded={showDropdown}
      aria-haspopup="true"
    >
      <div className={`${HEADER_STYLES.mobile.avatar} ${HEADER_STYLES.desktop.avatar} rounded-full flex items-center justify-center font-semibold text-sm shadow-md`}>
        {getUserInitials(user)}
      </div>
      <div className="text-left hidden md:block">
        <p className="text-sm font-semibold leading-tight">{user.name}</p>
        <p className="text-xs text-blue-200 leading-tight capitalize">{user.role}</p>
      </div>

      <ChevronDown 
        className={`w-4 h-4 transition-transform duration-200 hidden sm:block ${
          showDropdown ? 'rotate-180' : ''
        }`} 
      />
    </button>
  ), [user, showDropdown, handleDropdownToggle]);

  const NotificationsButton = useCallback(() => (
    <button
      className="relative p-2 hover:bg-blue-700 rounded-lg transition-colors hidden sm:block"
      aria-label="Notifications"
    >
      <Bell className="w-5 h-5" />
      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-blue-600" />
    </button>
  ), []);

  const DropdownContent = useCallback(() => 
    showDropdown ? (
      <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-[60] animate-fade-in">
        <UserInfo />
        <div className="py-2">
          <DropdownMenuItems />
        </div>
        <div className="border-t border-gray-100 pt-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    ) : null
  , [showDropdown, UserInfo, DropdownMenuItems, handleLogout]);

  return (
    <header className={`${HEADER_STYLES.gradient} text-white shadow-lg sticky top-0 z-40`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 mr-2 sm:mr-4">
            <button
              onClick={onMenuToggle}
              className={HEADER_STYLES.mobile.menuButton}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            >
              <MenuIcon />
            </button>
            <LogoSection />
          </div>

          {user && (
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <NotificationsButton />
              
              <div className="relative" ref={dropdownRef}>
                <UserAvatar />
                {showDropdown && (
                  <div
                    className="fixed inset-0 z-40 md:hidden"
                    onClick={() => setShowDropdown(false)}
                  />
                )}
                <DropdownContent />
              </div>
            </div>
          )}
        </div>
      </div>

      <ProfileModal 
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        profileData={profileData}
        loading={profileLoading}
        error={profileError}
        onStartVerification={handleStartVerification}
      />

      <VerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        verificationType={verificationDetails.type}
        contactInfo={verificationDetails.contact}
        onVerificationSuccess={handleVerificationSuccess}
      />
    </header>
  );
}

export default Header;