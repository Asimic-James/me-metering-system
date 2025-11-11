import { useState, useCallback } from 'react';

// Constants for page names
export const PAGE_NAMES = {
  DASHBOARD: 'dashboard',
  SCHEDULE: 'schedule',
  USERS: 'users',
  SUBMIT: 'submit'
};

export const useNavigation = (initialPage = PAGE_NAMES.DASHBOARD) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Navigate to a specific page
  const navigateTo = useCallback((page) => {
    setCurrentPage(page);
    // Close mobile menu when navigating
    setIsMobileMenuOpen(false);
  }, []);

  // Toggle mobile menu
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  // Close mobile menu
  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  // Open mobile menu
  const openMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(true);
  }, []);

  // Check if current page is active
  const isActivePage = useCallback((page) => {
    return currentPage === page;
  }, [currentPage]);

  // Get navigation state
  const getNavigationState = useCallback(() => ({
    currentPage,
    isMobileMenuOpen,
    canGoBack: currentPage !== PAGE_NAMES.DASHBOARD
  }), [currentPage, isMobileMenuOpen]);

  return {
    // State
    currentPage,
    isMobileMenuOpen,
    
    // Actions
    navigateTo,
    toggleMobileMenu,
    closeMobileMenu,
    openMobileMenu,
    
    // Queries
    isActivePage,
    getNavigationState,
    
    // Constants (for convenience)
    PAGE_NAMES
  };
};