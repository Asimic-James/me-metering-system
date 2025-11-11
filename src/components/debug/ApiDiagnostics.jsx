import { useState, useEffect } from 'react';
import jedApi from '../services/api';
import { AlertCircle, CheckCircle, Zap } from 'lucide-react';

function ApiDiagnostics() {
  const [results, setResults] = useState({});
  const [testing, setTesting] = useState(false);
  const [testPayload, setTestPayload] = useState({ phone: '', password: '' });

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setTesting(true);
    const diags = {
      apiIntegration: await jedApi.validateApiIntegration(),
      baseUrl: jedApi.config.BASE_URL,
      authToken: !!jedApi.getAuthToken(),
      storedUser: !!jedApi.getStoredUser(),
      isAuthenticated: jedApi.isAuthenticated(),
      userRole: jedApi.getUserRole()
    };
    setResults(diags);
    setTesting(false);
    console.log('[Diagnostics] Results:', diags);
  };

  const testLoginPayloads = async () => {
    if (!testPayload.phone || !testPayload.password) {
      alert('Please enter phone and password');
      return;
    }

    setTesting(true);
    const payloads = [
      { name: 'phone + password', data: { phone: testPayload.phone, password: testPayload.password } },
      { name: 'phoneNumber + password', data: { phoneNumber: testPayload.phone, password: testPayload.password } },
      { name: 'username + password', data: { username: testPayload.phone, password: testPayload.password } },
      { name: 'nested data', data: { data: { phone: testPayload.phone, password: testPayload.password } } }
    ];

    const url = jedApi.buildUrl('/login', true);
    
    for (const p of payloads) {
      try {
        console.log(`[Test] Trying payload: ${p.name}`, p.data);
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p.data)
        });
        const text = await resp.text();
        console.log(`[Test] ${p.name}: ${resp.status}`, text);
        alert(`${p.name}: ${resp.status}\nResponse: ${text.substring(0, 100)}`);
      } catch (err) {
        console.error(`[Test] ${p.name} failed:`, err);
      }
    }
    setTesting(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">API Diagnostics</h1>

      {/* Health Check Results */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Health Check</h2>
        <button
          onClick={runDiagnostics}
          disabled={testing}
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {testing ? 'Testing...' : 'Run Diagnostics'}
        </button>

        <div className="space-y-3">
          {Object.entries(results).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="font-mono text-sm">{key}</span>
              <div className="flex items-center gap-2">
                {value === true ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : value === false ? (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                ) : (
                  <span className="text-sm">{String(value)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payload Tester */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Test Login Payloads</h2>
        <div className="space-y-3 mb-4">
          <input
            type="text"
            placeholder="Phone"
            value={testPayload.phone}
            onChange={e => setTestPayload({ ...testPayload, phone: e.target.value })}
            className="w-full px-3 py-2 border rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={testPayload.password}
            onChange={e => setTestPayload({ ...testPayload, password: e.target.value })}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <button
          onClick={testLoginPayloads}
          disabled={testing}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Test Payloads
        </button>
      </div>

      {/* Debug Console */}
      <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
        <p className="text-xs text-gray-500 mb-2">Open Browser DevTools → Console to see full logs</p>
        <p className="text-yellow-400">Type: window.DEBUG_API = true in console for verbose logging</p>
      </div>
    </div>
  );
}

export default ApiDiagnostics;
