import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PERMISSIONS, hasPermission } from '../auth/permissions';
import jedApi from '../services/api';
import { AlertCircle, Upload, Download } from 'lucide-react';

function ExcelUpload() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [uploadType, setUploadType] = useState('excel'); // excel | first-sheet | modified
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  if (!hasPermission(user?.role, PERMISSIONS.CREATE_INSTALLATION)) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to upload installations.</p>
      </div>
    );
  }

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null);
    setMessage(null);
    setError(null);
  };

  const handleDownloadTemplate = async () => {
    try {
      setError(null);
      setMessage('Preparing template...');
      const blob = await jedApi.downloadMetersTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'meters-template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage('Template downloaded');
    } catch (err) {
      console.error('Template download failed', err);
      setError('Failed to download template.');
      setMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return setError('Please select a file to upload.');

    setUploading(true);
    setError(null);
    setMessage('Uploading...');

    try {
      const fd = new FormData();
      fd.append('file', file);
      // include installer info when available
      const storedUser = jedApi.getStoredUser?.() || null;
      if (storedUser) {
        fd.append('installerId', storedUser.id || storedUser.employeeId || storedUser.phone || '');
      }

      let resp;
      if (uploadType === 'excel') {
        resp = await jedApi.uploadExcel(fd);
      } else if (uploadType === 'first-sheet') {
        resp = await jedApi.uploadExcelFirstSheet(fd);
      } else {
        resp = await jedApi.uploadExcelModified(fd);
      }

      // If server returned a Blob (modified file), prompt download
      if (resp instanceof Blob) {
        const url = URL.createObjectURL(resp);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'processed.xlsx';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setMessage('Processed file downloaded');
      } else {
        // assume JSON response
        setMessage(resp?.message || 'Upload successful');
      }

      // clear selected file on success
      setFile(null);
    } catch (err) {
      console.error('Upload failed', err);
      setError(err?.message || 'Upload failed.');
      setMessage(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upload Installations (Excel)</h1>
          <p className="text-gray-600">Upload installations in bulk using an Excel file.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleDownloadTemplate} className="inline-flex items-center gap-2 bg-white border px-3 py-2 rounded-lg">
            <Download className="w-4 h-4" />
            Download Template
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Excel file</label>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} disabled={uploading} />
            {file && (
              <p className="text-sm text-gray-600 mt-2">Selected: <span className="font-mono">{file.name}</span> ({Math.round(file.size/1024)} KB)</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload mode</label>
            <div className="flex gap-4">
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="mode" value="excel" checked={uploadType==='excel'} onChange={() => setUploadType('excel')} />
                <span className="text-sm">Upload & process (server default)</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="mode" value="first-sheet" checked={uploadType==='first-sheet'} onChange={() => setUploadType('first-sheet')} />
                <span className="text-sm">Upload only first sheet</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="mode" value="modified" checked={uploadType==='modified'} onChange={() => setUploadType('modified')} />
                <span className="text-sm">Upload & return modified file</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Upload'}
            </button>

            <button onClick={() => { setFile(null); setError(null); setMessage(null); }} className="px-3 py-2 border rounded-lg">Clear</button>
          </div>

          {message && <div className="text-sm text-green-700">{message}</div>}
          {error && <div className="text-sm text-red-700">{error}</div>}
        </div>
      </div>
    </div>
  );
}

export default ExcelUpload;
