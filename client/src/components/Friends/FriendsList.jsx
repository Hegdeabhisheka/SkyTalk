import React, { useState, useEffect } from 'react';
import { friendsAPI } from '../../services/api';

function FriendsList({ onChatClick }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const response = await friendsAPI.getFriendsList();
      setFriends(response.data.friends);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch friends');
    } finally {
      setLoading(false);
    }
  };

  const handleChatClick = (friend) => {
    // Notify parent component to switch to chat view
    if (window.dashboardSetView) {
      window.dashboardSetView('chat');
      // Store selected friend for chat to pick up
      sessionStorage.setItem('selectedFriend', JSON.stringify(friend));
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading friends...</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="content-header">
        <h1 className="content-title">👥 My Friends</h1>
        <p className="content-subtitle">
          {friends.length} {friends.length === 1 ? 'friend' : 'friends'} • Stay connected
        </p>
      </div>

      {error && (
        <div className="alert alert-error shake">
          ⚠️ {error}
        </div>
      )}

      {friends.length > 0 ? (
        <div className="friends-list">
          {friends.map((friend, index) => (
            <div 
              key={friend.id} 
              className={`friend-card hover-lift stagger-item`}
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => handleChatClick(friend)}
            >
              <div className="friend-card-content">
                <div className="friend-avatar">
                  {friend.username.charAt(0).toUpperCase()}
                  <div className="online-indicator"></div>
                </div>
                <div className="friend-info">
                  <div className="friend-name">{friend.username}</div>
                  <div className="friend-status online">● Online</div>
                </div>
                <div style={{ fontSize: '1.5rem' }}>💬</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">😢</div>
          <h3 className="empty-state-title">No friends yet</h3>
          <p className="empty-state-text">
            Start by searching for people and sending friend requests!
          </p>
        </div>
      )}
    </div>
  );
}

export default FriendsList;
