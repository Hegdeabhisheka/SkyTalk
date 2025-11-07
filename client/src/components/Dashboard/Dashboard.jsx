import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../Layout/Sidebar';
import SearchUsers from '../Friends/SearchUsers';
import FriendsList from '../Friends/FriendsList';
import FriendRequests from '../Friends/FriendRequests';
import Chat from '../Chat/Chat';
import About from '../About/About';
import '../../styles/friends.css';

function Dashboard() {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('search');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);

  // First useEffect - Check authentication
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      console.log('No auth data, redirecting to login');
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      console.log('User loaded:', parsedUser);
      setUser(parsedUser);
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
    }
  }, [navigate]);

  // Second useEffect - Make setCurrentView available globally for friend list
  useEffect(() => {
    window.dashboardSetView = setCurrentView;
    window.sidebarRefresh = () => {
      // This will trigger a re-render
      setCurrentView(currentView);
    };
    
    return () => {
      delete window.dashboardSetView;
      delete window.sidebarRefresh;
    };
  }, [currentView]);

  const renderContent = () => {
    switch (currentView) {
      case 'friends':
        return <FriendsList />;
      case 'search':
        return <SearchUsers />;
      case 'requests':
        return <FriendRequests />;
      case 'chat':
        return <Chat />;
      case 'about':
        return <About />;
      default:
        return <SearchUsers />;
    }
  };

  if (!user) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="dashboard-container">
        <Sidebar 
          user={user} 
          currentView={currentView}
          setCurrentView={setCurrentView}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        
        <div className="main-content">
          {renderContent()}
        </div>

        <button 
          className="mobile-menu-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
