import React, { useState, useEffect, useCallback } from 'react';
import { friendsAPI } from '../../services/api';

function SearchUsers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sendingRequest, setSendingRequest] = useState({});
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Use useCallback to memoize the search function
  const handleSearch = useCallback(async () => {
    if (searchQuery.trim().length < 1) {
      setUsers([]);
      setSearchPerformed(false);
      return;
    }

    setLoading(true);
    setError('');
    setSearchPerformed(true);

    try {
      const response = await friendsAPI.searchUsers(searchQuery);
      console.log('Search results:', response.data);
      setUsers(response.data.users);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.response?.data?.message || 'Failed to search users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]); // Include searchQuery as dependency

  // Auto-search as user types (with debounce)
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim().length >= 1) {
        handleSearch();
      } else {
        setUsers([]);
        setSearchPerformed(false);
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, handleSearch]); // Include handleSearch in dependencies

  const handleSendRequest = async (userId, username) => {
    setSendingRequest(prev => ({ ...prev, [userId]: true }));

    try {
      await friendsAPI.sendRequest(userId);
      
      // Update user status in list
      setUsers(prevUsers => prevUsers.map(user => 
        user.id === userId 
          ? { ...user, requestStatus: 'sent' }
          : user
      ));

      // Show success message
      alert(`✅ Friend request sent to ${username}!`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send friend request');
    } finally {
      setSendingRequest(prev => ({ ...prev, [userId]: false }));
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setUsers([]);
    setSearchPerformed(false);
    setError('');
  };

  return (
    <div className="fade-in">
      <div className="content-header">
        <h1 className="content-title">🔍 Find Friends</h1>
        <p className="content-subtitle">Search by username or email</p>
      </div>

      <div className="search-section">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search by username or email (e.g., @john or john@email.com)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button 
              className="btn btn-secondary"
              style={{ 
                position: 'absolute', 
                right: '10px', 
                padding: '0.5rem 1rem',
                fontSize: '0.875rem'
              }}
              onClick={handleClearSearch}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error shake">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Searching...</p>
        </div>
      ) : users.length > 0 ? (
        <>
          <div style={{ marginBottom: 'var(--spacing-md)', color: 'var(--gray-600)' }}>
            Found {users.length} {users.length === 1 ? 'user' : 'users'}
          </div>
          <div className="users-grid">
            {users.map((user, index) => (
              <div key={user.id} className={`user-card glass-card stagger-item`} style={{ animationDelay: `${index * 0.05}s` }}>
                <div className="user-card-header">
                  <div className="user-card-avatar">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-card-info">
                    <div className="user-card-name">@{user.username}</div>
                    <div className="user-card-email" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                      {user.email}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>
                      Joined {formatDate(user.joinedDate)}
                    </div>
                  </div>
                </div>
                
                <div className="user-card-actions">
                  {user.requestStatus === 'sent' ? (
                    <button className="btn btn-secondary" disabled style={{ width: '100%' }}>
                      ✓ Request Sent
                    </button>
                  ) : user.requestStatus === 'received' ? (
                    <button className="btn btn-primary" disabled style={{ width: '100%' }}>
                      ✓ Pending Your Response
                    </button>
                  ) : (
                    <button 
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                      onClick={() => handleSendRequest(user.id, user.username)}
                      disabled={sendingRequest[user.id]}
                    >
                      {sendingRequest[user.id] ? (
                        <>
                          <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          ➕ Add Friend
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : searchPerformed && searchQuery ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3 className="empty-state-title">No users found</h3>
          <p className="empty-state-text">
            No users match "{searchQuery}". Try searching with a different username or email.
          </p>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <h3 className="empty-state-title">Find Your Friends</h3>
          <p className="empty-state-text">
            Search by username (e.g., @john) or email (e.g., john@example.com)
          </p>
          <div style={{ marginTop: 'var(--spacing-lg)', textAlign: 'left', maxWidth: '400px', margin: '2rem auto' }}>
            <p style={{ color: 'var(--gray-600)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              <strong>💡 Search Tips:</strong>
            </p>
            <ul style={{ color: 'var(--gray-600)', fontSize: '0.875rem', paddingLeft: '1.5rem' }}>
              <li>Type username without @ symbol</li>
              <li>Search by full or partial email</li>
              <li>Results appear as you type</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchUsers;
