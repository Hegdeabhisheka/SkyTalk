import React, { useState, useEffect } from 'react';
import { chatAPI, friendsAPI } from '../../services/api';
import { initSocket } from '../../services/socket';
import ChatWindow from './ChatWindow';
import '../../styles/chat.css';

function Chat() {
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    // Initialize socket
    const newSocket = initSocket();
    setSocket(newSocket);

    // Load friends and conversations
    loadData();

    // Socket event listeners
    if (newSocket) {
      const handleUserOnline = ({ userId }) => {
        setOnlineUsers(prev => new Set([...prev, userId]));
      };

      const handleUserOffline = ({ userId }) => {
        setOnlineUsers(prev => {
          const updated = new Set(prev);
          updated.delete(userId);
          return updated;
        });
      };

      const handleReceiveMessage = () => {
        console.log('New message received');
        loadConversations();
        if (window.sidebarRefresh) {
          window.sidebarRefresh();
        }
      };

      newSocket.on('user-online', handleUserOnline);
      newSocket.on('user-offline', handleUserOffline);
      newSocket.on('receive-message', handleReceiveMessage);

      return () => {
        if (newSocket) {
          newSocket.off('user-online', handleUserOnline);
          newSocket.off('user-offline', handleUserOffline);
          newSocket.off('receive-message', handleReceiveMessage);
        }
      };
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [friendsRes, conversationsRes] = await Promise.all([
        friendsAPI.getFriendsList(),
        chatAPI.getConversations()
      ]);

      setFriends(friendsRes.data.friends);
      setConversations(conversationsRes.data.conversations);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await chatAPI.getConversations();
      setConversations(response.data.conversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const handleSelectFriend = (friend) => {
    console.log('Selected friend:', friend);
    setSelectedFriend(friend);
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
        <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="content-header">
        <h1 className="content-title">💬 Messages</h1>
        <p className="content-subtitle">Chat with your friends in real-time</p>
      </div>

      <div className="chat-container">
        {/* Chat List */}
        <div className="chat-list">
          <div className="chat-list-header">
            <h2 className="chat-list-title">Chats</h2>
          </div>
          <div className="chat-list-content">
            {friends.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                <div className="empty-state-icon" style={{ fontSize: '2rem' }}>👥</div>
                <p className="empty-state-text" style={{ fontSize: '0.875rem' }}>
                  Add friends to start chatting
                </p>
              </div>
            ) : (
              friends.map((friend, index) => {
                const conversation = conversations.find(
                  conv => conv.friend.id === friend.id
                );
                const isOnline = onlineUsers.has(friend.id);

                return (
                  <div
                    key={friend.id}
                    className={`conversation-item ${selectedFriend?.id === friend.id ? 'active' : ''} stagger-item`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                    onClick={() => handleSelectFriend(friend)}
                  >
                    <div className="conversation-avatar">
                      {friend.username.charAt(0).toUpperCase()}
                      {isOnline && <div className="online-indicator"></div>}
                    </div>
                    <div className="conversation-info">
                      <div className="conversation-name">{friend.username}</div>
                      {conversation && (
                        <div className="conversation-preview">
                          {conversation.lastMessage}
                        </div>
                      )}
                    </div>
                    <div className="conversation-meta">
                      {conversation && (
                        <>
                          <div className="conversation-time">
                            {formatTime(conversation.timestamp)}
                          </div>
                          {conversation.unreadCount > 0 && (
                            <div className="unread-badge">
                              {conversation.unreadCount}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Window */}
        {selectedFriend ? (
          <ChatWindow
            friend={selectedFriend}
            socket={socket}
            isOnline={onlineUsers.has(selectedFriend.id)}
          />
        ) : (
          <div className="chat-window">
            <div className="chat-empty-state">
              <div className="chat-empty-icon">💬</div>
              <h3 className="chat-empty-title">Select a friend to start chatting</h3>
              <p className="chat-empty-text">
                Choose a conversation from the list to begin messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;
