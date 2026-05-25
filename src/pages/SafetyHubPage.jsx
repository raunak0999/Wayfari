import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SafetyHubComponent from '../components/SafetyHub';

export default function SafetyHubPage() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/auth" replace />;

  return <SafetyHubComponent />;
}
