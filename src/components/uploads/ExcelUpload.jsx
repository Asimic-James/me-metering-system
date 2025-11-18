import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PERMISSIONS, hasPermission } from '../auth/permissions.jsx';
import jedApi from '../services/api';
import { AlertCircle, Upload, Download } from 'lucide-react';

function ExcelUpload() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [uploadType, setUploadType] = useState('meters'); // meters | excel | first-sheet | modified
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  // FIX: Use the correct permission path
  if (!hasPermission(user?.role, PERMISSIONS.INSTALLATIONS.CREATE)) {
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
    setUploadResult(null);
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
    setUploadResult(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      
      // include installer info when available
      const storedUser = jedApi.getStoredUser?.() || null;
      if (storedUser) {
        fd.append('installerId', storedUser.id || storedUser.employeeId || storedUser.phone || '');
      }

      let resp;
      
      // Use the meters upload endpoint for the new API
      if (uploadType === 'meters') {
        resp = await jedApi.uploadMeters(fd);
        
        // Handle the response with the new format
        if (resp.success) {
          setUploadResult(resp.data);
          setMessage(resp.message || 'Meters uploaded successfully');
        } else {
          throw new Error(resp.message || 'Upload failed');
        }
      } 
      // Keep existing functionality for other upload types
      else if (uploadType === 'excel') {
        resp = await jedApi.uploadExcel(fd);
      } else if (uploadType === 'first-sheet') {
        resp = await jedApi.uploadExcelFirstSheet(fd);
      } else {
        resp = await jedApi.uploadExcelModified(fd);
      }

      // Handle non-meters responses (existing functionality)
      if (uploadType !== 'meters') {
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

  const handleClear = () => {
    setFile(null);
    setError(null);
    setMessage(null);
    setUploadResult(null);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upload Meters (Excel)</h1>
          <p className="text-gray-600">Upload meters in bulk using an Excel file.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleDownloadTemplate} 
            className="inline-flex items-center gap-2 bg-white border px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Excel file</label>
            <input 
              type="file" 
              accept=".xlsx,.xls,.csv" 
              onChange={handleFileChange} 
              disabled={uploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {file && (
              <p className="text-sm text-gray-600 mt-2">
                Selected: <span className="font-mono">{file.name}</span> ({Math.round(file.size/1024)} KB)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload mode</label>
            <div className="flex gap-4 flex-wrap">
              <label className="inline-flex items-center gap-2">
                <input 
                  type="radio" 
                  name="mode" 
                  value="meters" 
                  checked={uploadType === 'meters'} 
                  onChange={() => setUploadType('meters')} 
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Upload Meters</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input 
                  type="radio" 
                  name="mode" 
                  value="excel" 
                  checked={uploadType === 'excel'} 
                  onChange={() => setUploadType('excel')} 
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Upload & process (server default)</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input 
                  type="radio" 
                  name="mode" 
                  value="first-sheet" 
                  checked={uploadType === 'first-sheet'} 
                  onChange={() => setUploadType('first-sheet')} 
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Upload only first sheet</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input 
                  type="radio" 
                  name="mode" 
                  value="modified" 
                  checked={uploadType === 'modified'} 
                  onChange={() => setUploadType('modified')} 
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Upload & return modified file</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Upload'}
            </button>

            <button 
              onClick={handleClear} 
              className="px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Upload Results */}
          {uploadResult && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Upload Results</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-white rounded border">
                  <div className="text-2xl font-bold text-gray-900">{uploadResult.totalRows}</div>
                  <div className="text-sm text-gray-600">Total Rows</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded border border-green-200">
                  <div className="text-2xl font-bold text-green-700">{uploadResult.created}</div>
                  <div className="text-sm text-green-600">Created</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded border border-red-200">
                  <div className="text-2xl font-bold text-red-700">{uploadResult.failed}</div>
                  <div className="text-sm text-red-600">Failed</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="text-2xl font-bold text-blue-700">{uploadResult.successRate || Math.round((uploadResult.created / uploadResult.totalRows) * 100)}%</div>
                  <div className="text-sm text-blue-600">Success Rate</div>
                </div>
              </div>

              {/* Error Details */}
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Errors ({uploadResult.errors.length}):</h4>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Meter Number</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {uploadResult.errors.map((error, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm text-gray-900">{error.row + 1}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 font-mono">{error.meterNumber}</td>
                            <td className="px-3 py-2 text-sm text-red-600">{error.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Messages and Errors */}
          {message && !uploadResult && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {message}
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExcelUpload;