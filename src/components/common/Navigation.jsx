import { Home, Power, FileText, Calendar, X, Users, Upload, MessageSquare } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';

// Constants for better maintainability
const NAVIGATION_CONFIG = {
  ITEMS: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      description: 'Overview and statistics',
      accessible: true,
    },
    {
      id: 'schedule',
      label: 'Meter Schedule',
      icon: Calendar,
      description: 'View installation schedules',
      accessible: true,
    },
    {
      id: 'submit',
      label: 'Install Meter',
      icon: FileText,
      description: 'Submit new installations',
      accessible: true,
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      description: 'Manage system users',
      accessible: (userRole) => userRole === 'admin',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      description: 'Analytics & exports',
      accessible: (userRole) => userRole === 'admin'
    }
    ,
    {
      id: 'uploads',
      label: 'Uploads',
      icon: Upload,
      description: 'Upload Excel files',
      accessible: (userRole) => ['admin', 'installer'].includes(userRole)
    },
    {
      id: 'complaint',
      label: 'Submit Complaint',
      icon: MessageSquare,
      description: 'Report installation issues',
      accessible: (userRole) => ['admin', 'installer'].includes(userRole)
    }
  ]
};

function Navigation({ currentPage, onNavigate, userRole, isOpen, onClose }) {
  // Handle body scroll when mobile menu is open
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

  // Filter navigation items based on user role and accessibility
  const filteredNavigationItems = useMemo(() => {
    return NAVIGATION_CONFIG.ITEMS.filter(item => {
      if (typeof item.accessible === 'function') {
        // Show all items regardless of role during loading
        // The disabled state will be handled in individual item components
        return true;
      }
      return item.accessible;
    });
  }, []);

  // Handle navigation with haptic feedback
  const handleNavigation = useCallback((page) => {
    // Add haptic feedback if supported
    if (window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
    
    onNavigate(page);
    onClose?.(); // Close mobile menu after navigation
  }, [onNavigate, onClose]);

  // Navigation item component for desktop
  const DesktopNavItem = useCallback(({ item, isActive }) => {
    const Icon = item.icon;
    
    // Determine if item is accessible
    let isAccessible = true;
    if (typeof item.accessible === 'function') {
      // If userRole is undefined, consider items accessible (they'll appear but might be disabled)
      // Once userRole loads, properly check accessibility
      isAccessible = userRole ? item.accessible(userRole) : true;
    } else {
      isAccessible = item.accessible;
    }
    
    return (
      <button
        onClick={() => handleNavigation(item.id)}
        disabled={!isAccessible}
        className={`
          flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-4 border-b-2 
          transition-all duration-200 whitespace-nowrap group relative
          ${!isAccessible 
            ? 'opacity-50 cursor-not-allowed text-gray-400 border-transparent'
            : isActive
            ? 'border-blue-600 text-blue-600 font-semibold bg-blue-50'
            : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50'
          }
        `}
        title={!isAccessible ? 'Not available for your role' : item.label}
      >
        <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'animate-pulse' : ''}`} />
        <span className="text-sm sm:text-base">{item.label}</span>
        
        {/* Active Indicator */}
        {isActive && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600" />
        )}
      </button>
    );
  }, [handleNavigation, userRole]);

  // Navigation item component for mobile sidebar
  const MobileSidebarItem = useCallback(({ item, isActive }) => {
    const Icon = item.icon;
    
    // Determine if item is accessible
    let isAccessible = true;
    if (typeof item.accessible === 'function') {
      isAccessible = userRole ? item.accessible(userRole) : true;
    } else {
      isAccessible = item.accessible;
    }
    
    return (
      <button
        onClick={() => handleNavigation(item.id)}
        disabled={!isAccessible}
        className={`
          w-full flex items-start gap-4 p-4 rounded-xl transition-all duration-200
          ${!isAccessible
            ? 'opacity-50 cursor-not-allowed'
            : isActive
            ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 shadow-md'
            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200'
          }
        `}
      >
        <div className={`
          p-2 rounded-lg flex-shrink-0
          ${!isAccessible 
            ? 'bg-gray-300 text-gray-500'
            : isActive 
            ? 'bg-blue-600 text-white' 
            : 'bg-white text-gray-600'
          }
        `}>
          <Icon className="w-5 h-5" />
        </div>
        
        <div className="flex-1 text-left">
          <p className={`font-semibold text-sm ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
            {item.label}
          </p>
          <p className={`text-xs mt-0.5 ${isActive ? 'text-blue-700' : 'text-gray-500'}`}>
            {item.description}
          </p>
        </div>

        {isActive && (
          <div className="flex-shrink-0 w-1 h-full bg-blue-600 rounded-full" />
        )}
      </button>
    );
  }, [handleNavigation, userRole]);

  // Navigation item component for mobile bottom bar
  const MobileBottomNavItem = useCallback(({ item, isActive }) => {
    const Icon = item.icon;
    
    // Determine if item is accessible
    let isAccessible = true;
    if (typeof item.accessible === 'function') {
      isAccessible = userRole ? item.accessible(userRole) : true;
    } else {
      isAccessible = item.accessible;
    }
    
    return (
      <button
        onClick={() => handleNavigation(item.id)}
        disabled={!isAccessible}
        className={`
          relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all
          active:scale-95 touch-manipulation
          ${!isAccessible 
            ? 'opacity-50 cursor-not-allowed'
            : isActive
            ? 'text-blue-600'
            : 'text-gray-600 hover:text-gray-900 active:bg-gray-50'
          }
        `}
      >
        <div className={`
          relative rounded-lg p-1 transition-all duration-200
          ${!isAccessible 
            ? 'bg-gray-200'
            : isActive 
            ? 'bg-blue-100' 
            : ''
          }
        `}>
          <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
        </div>
        <span className="text-xs font-medium">{item.label.split(' ')[0]}</span>
        {isActive && (
          <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-blue-600 rounded-b-full" />
        )}
      </button>
    );
  }, [handleNavigation, userRole]);

  // Mobile sidebar overlay
  const MobileOverlay = useCallback(() => (
    <div
      className={`
        fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden
        transition-all duration-300 ease-in-out
        ${isOpen 
          ? 'opacity-100' 
          : 'opacity-0 pointer-events-none'
        }
      `}
      onClick={onClose}
      aria-hidden={!isOpen}
    />
  ), [isOpen, onClose]);

  // Desktop navigation bar
  const DesktopNavigation = useCallback(() => (
    <nav className="hidden lg:block bg-white border-b border-gray-200 shadow-sm sticky top-16 sm:top-20 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {filteredNavigationItems.map((item) => (
            <DesktopNavItem
              key={item.id}
              item={item}
              isActive={currentPage === item.id}
            />
          ))}
        </div>
      </div>
    </nav>
  ), [filteredNavigationItems, currentPage, DesktopNavItem]);

  // Mobile sidebar navigation
  const MobileSidebar = useCallback(() => (
    <aside
      className={`
        fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-2xl z-50 lg:hidden
        transform transition-all duration-300 ease-in-out overflow-y-auto
        ${isOpen 
          ? 'translate-x-0 opacity-100' 
          : '-translate-x-full opacity-0 pointer-events-none'
        }
      `}
      aria-hidden={!isOpen}
    >
      {/* Sidebar Header */}
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

      {/* Navigation Items */}
      <div className="p-4 space-y-2">
        {filteredNavigationItems.map((item) => (
          <MobileSidebarItem
            key={item.id}
            item={item}
            isActive={currentPage === item.id}
          />
        ))}
      </div>

      {/* Sidebar Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-900 mb-1">Need Help?</p>
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
  ), [isOpen, onClose, filteredNavigationItems, currentPage, MobileSidebarItem]);

  // Mobile bottom navigation
  const MobileBottomNavigation = useCallback(() => (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-30 pb-safe">
      <div className="flex justify-around items-center h-16">
        {filteredNavigationItems.map((item) => (
          <MobileBottomNavItem
            key={item.id}
            item={item}
            isActive={currentPage === item.id}
          />
        ))}
      </div>
    </nav>
  ), [filteredNavigationItems, currentPage, MobileBottomNavItem]);

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