// src/App.tsx
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeProvider';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import JobListings from './pages/JobListings';
import CompanyResearch from './pages/CompanyResearch';
import ResumeTailoring from './pages/ResumeTailoring';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import { auth, onAuthStateChanged } from './firebase';

function App() {
  
  const [currentPage, setCurrentPage] = useState<'auth' | 'dashboard'>('auth');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentPage(user ? 'dashboard' : 'auth');
    });
    return () => unsubscribe();
  }, []);

  if (currentPage === 'auth') {
    return <Auth />;
  }

  return (
    <ThemeProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/jobs" element={<JobListings />} />
            <Route
              path="/company-research/:jobId"
              element={<CompanyResearch />}
            />
            <Route
              path="/resume-tailoring/:jobId"
              element={<ResumeTailoring />}
            />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;