import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import KycVerifications from './pages/KycVerifications';
import ComplianceChecks from './pages/ComplianceChecks';
import Reports from './pages/Reports';
import RiskAnalysis from './pages/RiskAnalysis';
import Settings from './pages/Settings';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="kyc" element={<KycVerifications />} />
        <Route path="compliance" element={<ComplianceChecks />} />
        <Route path="reports" element={<Reports />} />
        <Route path="risk" element={<RiskAnalysis />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;