import React, { useState, useEffect } from 'react';
import { friendsAPI } from '../../services/api';

function FriendRequests() {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingRequest, setProcessingRequest] = useState({});

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const [pendingRes, sentRes] = await Promise.all([
        friendsAPI.getPendingRequests(),
        friendsAPI.getSentRequests(),
      ]);

      setPendingRequests(pendingRes.data.requests);
      setSentRequests(sentRes.data.requests);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId) => {
    setProcessingRequest({ ...processingRequest, [requestId]: 'accepting' });

    try {
      const response = await friendsAPI.acceptRequest(requestId);
      alert(response.data.message);
      
      // Remove from pending requests
      setPendingRequests(pendingRequests.filter(req => req.id !== requestId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept request');
    } finally {
      setProcessingRequest({ ...processingRequest, [requestId]: null });
    }
  };

  const handleReject = async (requestId) => {
    setProcessingRequest({ ...processingRequest, [requestId]: 'rejecting' });

    try {
      await friendsAPI.rejectRequest(requestId);
      
      // Remove from pending requests
      setPendingRequests(pendingRequests.filter(req => req.id !== requestId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject request');
    } finally {
      setProcessingRequest({ ...processingRequest, [requestId]: null });
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading requests...</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="content-header">
        <h1 className="content-title">📬 Friend Requests</h1>
        <p className="content-subtitle">Manage your friend requests</p>
      </div>

      {error && (
        <div className="alert alert-error shake">
          ⚠️ {error}
        </div>
      )}

      {/* Pending Requests (Received) */}
      <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: 'var(--spacing-lg)', color: 'var(--gray-800)' }}>
          Received ({pendingRequests.length})
        </h2>

        {pendingRequests.length > 0 ? (
          <div>
            {pendingRequests.map((request, index) => (
              <div key={request.id} className={`request-card slide-in-left`} style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="request-header">
                  <div className="request-avatar">
                    {request.sender.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="request-info">
                    <div className="request-name">{request.sender.username}</div>
                    <div className="request-time">⏱️ {formatTime(request.createdAt)}</div>
                  </div>
                </div>

                <div className="request-actions">
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleAccept(request.id)}
                    disabled={processingRequest[request.id]}
                  >
                    {processingRequest[request.id] === 'accepting' ? (
                      <>
                        <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                        Accepting...
                      </>
                    ) : (
                      <>✓ Accept</>
                    )}
                  </button>
                  
                  <button 
                    className="btn btn-secondary"
                    onClick={() => handleReject(request.id)}
                    disabled={processingRequest[request.id]}
                  >
                    {processingRequest[request.id] === 'rejecting' ? (
                      <>
                        <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                        Rejecting...
                      </>
                    ) : (
                      <>✕ Reject</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3 className="empty-state-title">No pending requests</h3>
            <p className="empty-state-text">You don't have any friend requests at the moment</p>
          </div>
        )}
      </div>

      {/* Sent Requests */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: 'var(--spacing-lg)', color: 'var(--gray-800)' }}>
          Sent ({sentRequests.length})
        </h2>

        {sentRequests.length > 0 ? (
          <div className="users-grid">
            {sentRequests.map((request, index) => (
              <div key={request.id} className={`user-card glass-card stagger-item`} style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="user-card-header">
                  <div className="user-card-avatar">
                    {request.receiver.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-card-info">
                    <div className="user-card-name">{request.receiver.username}</div>
                    <div className="user-card-email">{request.receiver.email}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'center', padding: 'var(--spacing-sm)' }}>
                  <span className="badge badge-primary">⏳ Pending</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📤</div>
            <h3 className="empty-state-title">No sent requests</h3>
            <p className="empty-state-text">You haven't sent any friend requests yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FriendRequests;
