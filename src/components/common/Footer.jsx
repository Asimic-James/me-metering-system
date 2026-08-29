function Footer() {
  return (
    <footer className="mt-12 border-t border-white/10 dark:border-white/5 bg-white/30 dark:bg-black/20 backdrop-blur-sm print:hidden">
      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} <span className="font-medium text-indigo-600 dark:text-indigo-400">ME-JEDC</span> Power Distribution. All rights reserved.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-600">
            Meter Management System
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;