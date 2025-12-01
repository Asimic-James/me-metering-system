import { Home, Power, FileText, Calendar, X, Users, Upload, MessageSquare, Settings, MoreHorizontal } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

// Navigation-specific constants
const NAVIGATION_CONFIG = {
  ITEMS: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      icon: Home,
      mobileBottomNav: (role) => true, // Always show
      description: 'Overview and statistics',
      accessible: () => true,
    },
    {
      id: 'schedule',
      label: 'Meter Schedule',
      path: '/schedule',
      icon: Calendar,
      mobileBottomNav: (role) => role === 'admin', // Admin only
      description: 'View installation schedules',
      accessible: () => true,
    },
    {
      id: 'submit',
      label: 'Install Meter',
      path: '/submit',
      icon: FileText,
      mobileBottomNav: (role) => true, // Always show
      description: 'Submit new installations',
      accessible: () => true,
    },
    {
      id: 'users',
      label: 'Users',
      path: '/users',
      icon: Users,
      mobileBottomNav: (role) => role === 'admin', // Admin only
      description: 'Manage system users',
      accessible: (userRole) => userRole === 'admin',
    },
    {
      id: 'reports',
      label: 'Reports',
      path: '/reports',
      icon: FileText,
      mobileBottomNav: (role) => role === 'admin', // Admin only
      description: 'Analytics & exports',
      accessible: (userRole) => userRole === 'admin'
    },
    {
      id: 'uploads',
      label: 'Uploads',
      path: '/uploads',
      icon: Upload,
      description: 'Upload Excel files',
      accessible: (userRole) => ['admin', 'installer'].includes(userRole)
    },
    {
      id: 'settings',
      label: 'Settings',
      path: '/settings',
      icon: Settings,
      description: 'Application settings',
      accessible: (userRole) => userRole === 'admin'
    },
    {
      id: 'complaint',
      label: 'Submit Complaint',
      path: '/complaint',
      icon: MessageSquare,
      mobileBottomNav: (role) => role === 'installer', // Installer only
      description: 'Report installation issues',
      accessible: (userRole) => ['admin', 'installer'].includes(userRole)
    }
  ]
};

// Navigation-specific hooks
const useBodyScroll = (isOpen) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);
};

function Navigation({ userRole, isOpen, onMenuToggle, onClose }) {
  const location = useLocation();
  useBodyScroll(isOpen);

  const isItemAccessible = useCallback((item) => {
    return item.accessible(userRole);
  }, [userRole]);

  const handleLinkClick = useCallback(() => {
    if (window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
    onClose?.();
  }, [onClose]);

  // Base Navigation Item Component
  const NavItem = useCallback(({ item, variant = 'desktop' }) => {
    const Icon = item.icon;
    const isAccessible = isItemAccessible(item);

    const getVariantStyles = (isActive) => {
      const variants = {
        desktop: {
          container: `flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-4 border-b-2 transition-all duration-200 whitespace-nowrap group relative ${!isAccessible ? 'opacity-50 cursor-not-allowed text-gray-400 border-transparent' : ''}`,
          active: 'border-blue-600 text-blue-600 font-semibold bg-blue-50',
          inactive: 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50',
          icon: `w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'animate-pulse' : ''}`,
          text: item.label,
        },
        mobileSidebar: {
          container: `w-full flex items-start gap-4 p-4 rounded-xl transition-all duration-200 ${!isAccessible ? 'opacity-50 cursor-not-allowed' : ''}`,
          active: 'bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 shadow-md',
          inactive: 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200',
          iconContainer: `p-2 rounded-lg flex-shrink-0 ${isActive ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`,
          icon: "w-5 h-5",
          labelClass: `font-semibold text-sm ${isActive ? 'text-blue-900' : 'text-gray-900'}`,
          descriptionClass: `text-xs mt-0.5 ${isActive ? 'text-blue-700' : 'text-gray-500'}`,
        },
        mobileBottom: {
          container: `relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-95 touch-manipulation ${!isAccessible ? 'opacity-50 cursor-not-allowed' : ''}`,
          active: 'text-blue-600',
          inactive: 'text-gray-600 hover:text-gray-900 active:bg-gray-50',
          iconContainer: `relative rounded-lg p-1 transition-all duration-200 ${isActive ? 'bg-blue-100' : ''}`,
          icon: `w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`,
          text: item.label.split(' ')[0],
        }
      };
      return variants[variant];
    };

    const renderContent = (isActive) => {
      const styles = getVariantStyles(isActive);
      if (variant === 'mobileSidebar') {
        return (
          <div className={`${styles.container} ${isActive ? styles.active : styles.inactive}`} >
            <div className={styles.iconContainer}>
              <Icon className={styles.icon} />
            </div>
            <div className="flex-1 text-left">
              <p className={styles.labelClass}>
                {item.label}
              </p>
              <p className={styles.descriptionClass}>
                {item.description}
              </p>
            </div>
            {isActive && <div className="flex-shrink-0 w-1 h-full bg-blue-600 rounded-full" />}
          </div>
        );
      }

      return (
        <div className={`${styles.container} ${isActive ? styles.active : styles.inactive}`}>
          <div className={styles.iconContainer}>
            <Icon className={styles.icon} />
          </div>
          <span className="text-sm sm:text-base">
            {styles.text}
          </span>
          {isActive && variant === 'desktop' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600" />}
          {isActive && variant === 'mobileBottom' && <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-blue-600 rounded-b-full" />}
        </div>
      );
    };

    if (!isAccessible) {
      return (
        <div title="Not available for your role">
          {renderContent(false)}
        </div>
      );
    }

    return (
      <NavLink to={item.path} onClick={handleLinkClick} end>
        {({ isActive }) => renderContent(isActive)}
      </NavLink>
    );
  }, [isItemAccessible, handleLinkClick]);

  const filteredNavItems = useMemo(() => NAVIGATION_CONFIG.ITEMS.filter(isItemAccessible), [isItemAccessible]);

  const MobileOverlay = useCallback(() => (
    <div
      className={`
        fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden
        transition-all duration-300 ease-in-out
        ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}
      onClick={onClose}
      aria-hidden={!isOpen}
    />
  ), [isOpen, onClose]);

  const DesktopNavigation = useCallback(() => (
    <nav className="hidden lg:block bg-white border-b border-gray-200 shadow-sm sticky top-16 sm:top-20 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {filteredNavItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              variant="desktop"
            />
          ))}
        </div>
      </div>
    </nav>
  ), [filteredNavItems, NavItem]);

  const MobileSidebar = useCallback(() => (
    <aside
      className={`
        fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-2xl z-50 lg:hidden
        transform transition-all duration-300 ease-in-out overflow-y-auto
        ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'}
      `}
      aria-hidden={!isOpen}
    >
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <Power className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Menu</h2>
              <p className="text-blue-100 text-xs">JEDC Partnership</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {filteredNavItems.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            variant="mobileSidebar"
          />
        ))}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">Need Help?</p>
          <p className="text-xs text-blue-700 mb-2">Contact support team</p>
          <button 
            className="w-full px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => alert('Support contact: support@jedc.com')}
          >
            Get Support
          </button>
        </div>
      </div>
    </aside>
  ), [isOpen, onClose, filteredNavItems, NavItem]);

  const MobileBottomNavigation = useCallback(() => (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-30 pb-safe">
      <div className="flex justify-around items-center h-16">
        {/* Show curated items for the bottom nav */}
        {filteredNavItems
          .filter(item => item.mobileBottomNav && item.mobileBottomNav(userRole))
          .slice(0, 3) // Show a max of 3 curated items
          .map((item) => (
          <NavItem
            key={item.id}
            item={item}
            variant="mobileBottom"
          />
        ))}
        <button
          onClick={onMenuToggle} // Correctly toggle the sidebar
          className="relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-95 touch-manipulation text-gray-600 hover:text-gray-900"
        >
          <div className="relative rounded-lg p-1 transition-all duration-200">
            <MoreHorizontal className="w-5 h-5" />
          </div>
          <span className="text-sm sm:text-base">More</span>
        </button>
      </div>
    </nav>
  ), [filteredNavItems, NavItem, onMenuToggle, userRole]);

  return (
    <>
      <MobileOverlay />
      <DesktopNavigation />
      <MobileSidebar />
      <MobileBottomNavigation />
    </>
  );
}

export default Navigation;