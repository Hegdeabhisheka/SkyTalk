import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { friendsAPI, chatAPI } from '../../services/api';

function Sidebar({ user, currentView, setCurrentView, sidebarOpen, setSidebarOpen }) {
  const navigate = useNavigate();
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  useEffect(() => {
    fetchCounts();
    
    // Refresh counts every 5 seconds
    const interval = setInterval(fetchCounts, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchCounts = async () => {
    try {
      // Get pending friend requests count
      const requestsRes = await friendsAPI.getPendingRequests();
      setPendingRequestCount(requestsRes.data.requests.length);

      // Get unread messages count
      const conversationsRes = await chatAPI.getConversations();
      const unreadCount = conversationsRes.data.conversations.reduce(
        (sum, conv) => sum + (conv.unreadCount || 0),
        0
      );
      setUnreadMessageCount(unreadCount);
    } catch (error) {
      console.error('Error fetching notification counts:', error);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.clear();
      navigate('/login');
    }
  };

  const handleNavClick = (view) => {
    console.log('Navigating to:', view);
    setCurrentView(view);
    setSidebarOpen(false);
  };

  return (
    <div className={`sidebar ${sidebarOpen ? 'mobile-visible' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">☁️</div>
        <div className="sidebar-title">Sky Talk</div>
      </div>

      <div className="sidebar-user slide-in-left">
        <div className="user-avatar">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div className="user-info">
          <div className="user-name">{user.username}</div>
          <div className="user-status">
            <span className="badge badge-online">Online</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <div className="nav-section-title">Navigate</div>
          
          <div 
            className={`nav-item ${currentView === 'search' ? 'active' : ''} stagger-item`}
            onClick={() => handleNavClick('search')}
          >
            <span className="nav-item-icon">🔍</span>
            <span className="nav-item-text">Find Friends</span>
          </div>

          <div 
            className={`nav-item ${currentView === 'requests' ? 'active' : ''} stagger-item`}
            onClick={() => handleNavClick('requests')}
          >
            <span className="nav-item-icon">📬</span>
            <span className="nav-item-text">Friend Requests</span>
            {pendingRequestCount > 0 && (
              <span className="nav-item-badge notification-badge">
                {pendingRequestCount > 9 ? '9+' : pendingRequestCount}
              </span>
            )}
          </div>

          <div 
            className={`nav-item ${currentView === 'friends' ? 'active' : ''} stagger-item`}
            onClick={() => handleNavClick('friends')}
          >
            <span className="nav-item-icon">👥</span>
            <span className="nav-item-text">My Friends</span>
          </div>

          <div 
            className={`nav-item ${currentView === 'chat' ? 'active' : ''} stagger-item`}
            onClick={() => handleNavClick('chat')}
          >
            <span className="nav-item-icon">💬</span>
            <span className="nav-item-text">Messages</span>
            {unreadMessageCount > 0 && (
              <span className="nav-item-badge notification-badge chat-badge">
                {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
              </span>
            )}
          </div>
        </div>

        <div className="nav-section">
          <div className="nav-section-title">More</div>
          
          <div 
            className={`nav-item ${currentView === 'about' ? 'active' : ''} stagger-item`}
            onClick={() => handleNavClick('about')}
          >
            <span className="nav-item-icon">ℹ️</span>
            <span className="nav-item-text">About</span>
          </div>
        </div>
      </nav>

      <div className="sidebar-footer">
        <button className="btn logout-btn" onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
