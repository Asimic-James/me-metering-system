import { Wrench } from 'lucide-react';
import { usePermissions } from './auth/usePermissions';
import InstallationForm from './installation/InstallationForm';

// Single page, single header. Previously this wrapped a tab switcher
// (Installation / Complaint — Complaint was removed, see API_GAP_REPORT.md)
// AND InstallationForm.jsx rendered its own competing page-level header
// underneath, producing two H1-style headers fighting for attention. Now
// there's exactly one: this page owns the header, InstallationForm owns
// only its card content. The copy also now describes what this page
// actually does — POST /external/jed/complete-installation requires an
// already-PAID request, so this looks up an existing paid account and
// records the physical install; it does not create a new request.
function SubmissionPage() {
  const permissions = usePermissions();

  if (!permissions.isAdmin && !permissions.canCreateInstallation) {
    return (
      <div className="min-h-[420px] flex items-center justify-center p-6">
        <div className="text-center max-w-lg">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Access restricted</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            You do not have permission to complete meter installations. Please contact your administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
          <Wrench className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Complete Installation</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            Look up a paid customer account and record the meter and seal numbers to finish the installation.
          </p>
        </div>
      </div>

      <InstallationForm />
    </div>
  );
}

export default SubmissionPage;
