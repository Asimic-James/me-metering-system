import { Power, User, LogOut, ChevronDown, Menu, X, Bell } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Header-specific constants
const HEADER_STYLES = {
  gradient: 'bg-gradient-to-r from-blue-600 to-blue-700',
  mobile: {
    menuButton: 'lg:hidden p-2 -ml-2 hover:bg-blue-700 rounded-lg transition-colors',
    avatar: 'w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-500',
    title: 'text-sm font-bold truncate',
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
  if (!user?.name) return 'U';
  return user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

function Header({ user, onLogout, onMenuToggle, isMenuOpen }) {
  const [showDropdown, setShowDropdown] = useState(false);
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

  const handleProfileClick = useCallback(() => {
    setShowDropdown(false);
    console.log('Navigate to profile');
  }, []);

  const handleSettingsClick = useCallback(() => {
    setShowDropdown(false);
    navigate('/settings');
  }, [navigate]);

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
          <p className="text-xs text-gray-600 truncate">{user.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium capitalize">
              {user.role}
            </span>
            <span className="text-xs text-gray-500">ID: {user.employeeId}</span>
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
    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink-0">
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
      onClick={handleDropdownToggle}
      className="flex items-center gap-2 sm:gap-3 bg-blue-700/50 hover:bg-blue-700 rounded-lg px-2 sm:px-4 py-2 transition-all duration-200 hover:shadow-lg"
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
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
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
    </header>
  );
}

export default Header;