import {
  LayoutDashboard, Database, Zap, Users, BarChart3,
  Upload, Settings, MessageSquare, X, Layers2
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import InfoModal from './InfoModal';

// Navigation-specific constants
const NAVIGATION_CONFIG = {
  ITEMS: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      mobileBottomNav: () => true,
      description: 'Overview and statistics',
      accessible: () => true,
    },
    {
      id: 'schedule',
      label: 'Meter Schedule',
      path: '/schedule',
      icon: Database,
      mobileBottomNav: false,
      description: 'View and query meter inventory',
      accessible: () => true,
    },
    {
      id: 'submit',
      label: 'Install Meter',
      path: '/submit',
      icon: Zap,
      mobileBottomNav: () => true,
      description: 'Submit new installations',
      accessible: () => true,
    },
    {
      id: 'users',
      label: 'Users',
      path: '/users',
      icon: Users,
      mobileBottomNav: (role) => role === 'admin',
      description: 'Manage system users',
      accessible: (userRole) => userRole === 'admin',
    },
    {
      id: 'reports',
      label: 'Reports',
      path: '/reports',
      icon: BarChart3,
      mobileBottomNav: (role) => role === 'admin',
      description: 'Analytics & exports',
      accessible: (userRole) => userRole === 'admin'
    },
    {
      id: 'uploads',
      label: 'Uploads',
      path: '/uploads',
      icon: Upload,
      description: 'Upload meter data',
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
      mobileBottomNav: (role) => role === 'installer',
      description: 'Report installation issues',
      accessible: (userRole) => ['admin', 'installer'].includes(userRole)
    }
  ]
};

// Navigation-specific hooks
const useBodyScroll = (isOpen) => {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);
};

function Navigation({ userRole, isOpen, onMenuToggle: _onMenuToggle, onClose }) {
  const [isSupportModalOpen, setSupportModalOpen] = useState(false);

  useBodyScroll(isOpen || isSupportModalOpen);

  const handleOpenSupportModal = useCallback(() => setSupportModalOpen(true), []);
  const handleCloseSupportModal = useCallback(() => setSupportModalOpen(false), []);

  const isItemAccessible = useCallback((item) => item.accessible(userRole), [userRole]);

  const handleLinkClick = useCallback(() => {
    if (window.navigator.vibrate) window.navigator.vibrate(50);
    onClose?.();
  }, [onClose]);

  // Base Navigation Item Component
  const NavItem = useCallback(({ item, variant = 'desktop' }) => {
    const Icon = item.icon;
    const isAccessible = isItemAccessible(item);

    const getVariantStyles = (isActive) => {
      const variants = {
        desktop: {
          container: `flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-4 border-b-2 transition-all duration-200 whitespace-nowrap group relative ${!isAccessible ? 'opacity-40 cursor-not-allowed text-gray-400 border-transparent' : ''}`,
          active: 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50/60 dark:bg-indigo-900/20',
          inactive: 'border-transparent text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10',
          icon: `w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:scale-110`,
          text: item.label,
        },
        mobileSidebar: {
          container: `w-full flex items-center gap-4 p-3.5 rounded-xl transition-all duration-200 ${!isAccessible ? 'opacity-40 cursor-not-allowed' : ''}`,
          active: 'bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/20 border border-indigo-200 dark:border-indigo-800 shadow-sm',
          inactive: 'hover:bg-gray-50 dark:hover:bg-white/5 border border-transparent hover:border-gray-200 dark:hover:border-white/10',
          iconContainer: `p-2 rounded-lg flex-shrink-0 ${isActive ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'}`,
          icon: "w-4 h-4",
          labelClass: `font-semibold text-sm ${isActive ? 'text-indigo-900 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-200'}`,
          descriptionClass: `text-xs mt-0.5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-500'}`,
        },
        mobileBottom: {
          container: `relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-95 touch-manipulation ${!isAccessible ? 'opacity-40 cursor-not-allowed' : ''}`,
          active: 'text-indigo-600 dark:text-indigo-400',
          inactive: 'text-gray-500 dark:text-gray-400 hover:text-indigo-500',
          iconContainer: `relative rounded-lg p-1.5 transition-all duration-200 ${isActive ? 'bg-indigo-100 dark:bg-indigo-900/40' : ''}`,
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
          <div className={`${styles.container} ${isActive ? styles.active : styles.inactive}`}>
            <div className={styles.iconContainer}>
              <Icon className={styles.icon} />
            </div>
            <div className="flex-1 text-left">
              <p className={styles.labelClass}>{item.label}</p>
              <p className={styles.descriptionClass}>{item.description}</p>
            </div>
            {isActive && (
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
            )}
          </div>
        );
      }

      return (
        <div className={`${styles.container} ${isActive ? styles.active : styles.inactive}`}>
          {variant === 'mobileBottom' ? (
            <>
              <div className={styles.iconContainer}>
                <Icon className={styles.icon} />
              </div>
              <span className="text-[10px] font-medium">{styles.text}</span>
              {isActive && (
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-indigo-400 to-blue-500 rounded-b-full" />
              )}
            </>
          ) : (
            <>
              <Icon className={styles.icon} />
              <span className="text-sm font-medium">{styles.text}</span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-400 via-blue-500 to-cyan-400" />
              )}
            </>
          )}
        </div>
      );
    };

    if (!isAccessible) {
      return <div title="Not available for your role">{renderContent(false)}</div>;
    }

    return (
      <NavLink to={item.path} onClick={handleLinkClick} end>
        {({ isActive }) => renderContent(isActive)}
      </NavLink>
    );
  }, [isItemAccessible, handleLinkClick]);

  const filteredNavItems = useMemo(
    () => NAVIGATION_CONFIG.ITEMS.filter(isItemAccessible),
    [isItemAccessible]
  );

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
    <nav className="hidden lg:block bg-white/70 dark:bg-black/30 backdrop-blur-md border-b border-white/40 dark:border-white/10 shadow-sm sticky top-16 sm:top-20 z-30">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center items-center gap-0.5 px-2 sm:px-4 lg:px-6">
          {filteredNavItems.map((item) => (
            <NavItem key={item.id} item={item} variant="desktop" />
          ))}
        </div>
      </div>
    </nav>
  ), [filteredNavItems]);

  const MobileSidebar = useCallback(() => (
    <aside
      className={`
        fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] z-50 lg:hidden flex flex-col
        bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl
        border-r border-white/40 dark:border-white/10
        transform transition-all duration-300 ease-in-out overflow-y-auto
        ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'}
      `}
      aria-hidden={!isOpen}
    >
      {/* Sidebar Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-white p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/15 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <Layers2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">Navigation</h2>
              <p className="text-blue-100 text-xs">JEDC Partnership</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Nav Items */}
      <div className="p-3 space-y-1 flex-1 overflow-y-auto">
        {filteredNavItems.map((item) => (
          <NavItem key={item.id} item={item} variant="mobileSidebar" />
        ))}
      </div>

      {/* Support Box */}
      <div className="p-4 border-t border-gray-100 dark:border-white/10">
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3">
          <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-1">Need Help?</p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-2.5">Contact the support team</p>
          <button
            className="w-full px-3 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs font-semibold rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all shadow-md"
            onClick={handleOpenSupportModal}
          >
            Get Support
          </button>
        </div>
      </div>
    </aside>
  ), [isOpen, onClose, filteredNavItems, handleOpenSupportModal]);

  const MobileBottomNavigation = useCallback(() => (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-white/40 dark:border-white/10 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl shadow-lg pb-safe">
      <div className="flex justify-around items-center h-16">
        {filteredNavItems
          .filter(item => item.mobileBottomNav && item.mobileBottomNav(userRole))
          .slice(0, 5)
          .map((item) => (
            <NavItem key={item.id} item={item} variant="mobileBottom" />
          ))}
      </div>
    </nav>
  ), [filteredNavItems, userRole]);

  return (
    <>
      <MobileOverlay />
      <DesktopNavigation />
      <MobileSidebar />
      <MobileBottomNavigation />

      <InfoModal
        isOpen={isSupportModalOpen}
        onClose={handleCloseSupportModal}
        title="Contact Support"
      >
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p className="mb-2">For any assistance or questions, please do not hesitate to reach out to our support team.</p>
          <p>You can email us at:</p>
          <a
            href="mailto:support@jedc.com"
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            support@jedc.com
          </a>
        </div>
      </InfoModal>
    </>
  );
}

export default Navigation;