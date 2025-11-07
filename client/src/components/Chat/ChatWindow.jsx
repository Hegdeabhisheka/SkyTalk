import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatAPI } from '../../services/api';
import { showNotification, playNotificationSound } from '../../services/notifications';

function ChatWindow({ friend, socket, isOnline }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('user'));

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await chatAPI.getConversation(friend.id);
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [friend.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleReceiveMessage = useCallback((messageData) => {
    if (messageData.sender.id === friend.id) {
      setMessages(prev => [...prev, messageData]);
      
      let notificationBody = messageData.message;
      if (messageData.messageType === 'image') {
        notificationBody = '📷 Sent an image';
      } else if (messageData.messageType === 'file') {
        notificationBody = `📎 Sent a file: ${messageData.fileName}`;
      }

      showNotification(`New message from ${messageData.sender.username}`, {
        body: notificationBody,
        tag: `msg-${friend.id}`,
        badge: '💬'
      });

      playNotificationSound();
    }
  }, [friend.id]);

  const handleMessageSent = useCallback((messageData) => {
    setMessages(prev => {
      const updated = [...prev];
      const lastMsg = updated[updated.length - 1];
      if (lastMsg && !lastMsg.id) {
        updated[updated.length - 1] = messageData;
      }
      return updated;
    });
  }, []);

  const handleMessageDeletedPermanently = useCallback((data) => {
    const { messageId } = data;
    // Remove the message completely
    setMessages(prev => 
      prev.filter(msg => msg.id !== messageId)
    );
  }, []);

  const handleUserTyping = useCallback((data) => {
    if (data.userId === friend.id) {
      setIsTyping(true);
    }
  }, [friend.id]);

  const handleStopTyping = useCallback((data) => {
    if (data.userId === friend.id) {
      setIsTyping(false);
    }
  }, [friend.id]);

  useEffect(() => {
    if (socket) {
      socket.on('receive-message', handleReceiveMessage);
      socket.on('message-sent', handleMessageSent);
      socket.on('message-deleted-permanently', handleMessageDeletedPermanently);
      socket.on('user-typing', handleUserTyping);
      socket.on('user-stop-typing', handleStopTyping);

      return () => {
        socket.off('receive-message', handleReceiveMessage);
        socket.off('message-sent', handleMessageSent);
        socket.off('message-deleted-permanently', handleMessageDeletedPermanently);
        socket.off('user-typing', handleUserTyping);
        socket.off('user-stop-typing', handleStopTyping);
      };
    }
  }, [socket, handleReceiveMessage, handleMessageSent, handleMessageDeletedPermanently, handleUserTyping, handleStopTyping]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await uploadAndSendFile(file, 'image');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await uploadAndSendFile(file, 'file');
  };

  const uploadAndSendFile = async (file, type) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append(type === 'image' ? 'image' : 'file', file);

      const uploadEndpoint = type === 'image' ? chatAPI.uploadImage : chatAPI.uploadFile;
      
      console.log(`Uploading ${type}:`, file.name);

      const response = await uploadEndpoint(formData);
      
      console.log('Upload response:', response.data);

      if (response.data.success) {
        const { fileUrl, fileSize, fileType } = response.data;
        const fileName = file.name; // Use original file name from laptop

        const tempMessage = {
          sender: {
            id: currentUser.id,
            username: currentUser.username,
            avatar: currentUser.avatar
          },
          receiver: {
            id: friend.id,
            username: friend.username,
            avatar: friend.avatar
          },
          message: type === 'image' ? '📷 Image' : `📎 ${fileName}`,
          messageType: type,
          fileUrl,
          fileName,
          fileSize,
          fileType,
          timestamp: new Date(),
          isRead: false
        };

        setMessages(prev => [...prev, tempMessage]);
        setUploadProgress(0);

        if (socket) {
          socket.emit('send-message', {
            receiverId: friend.id,
            message: type === 'image' ? '📷 Image' : `📎 ${fileName}`,
            messageType: type,
            fileUrl,
            fileName,
            fileSize,
            fileType
          });
        }
      }

    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      alert(`Failed to upload ${type}. Please try again.`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (type === 'image' && imageInputRef.current) {
        imageInputRef.current.value = '';
      } else if (type === 'file' && fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending) return;

    setSending(true);

    const tempMessage = {
      sender: {
        id: currentUser.id,
        username: currentUser.username,
        avatar: currentUser.avatar
      },
      receiver: {
        id: friend.id,
        username: friend.username,
        avatar: friend.avatar
      },
      message: newMessage.trim(),
      messageType: 'text',
      timestamp: new Date(),
      isRead: false
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    if (socket) {
      socket.emit('send-message', {
        receiverId: friend.id,
        message: newMessage.trim(),
        messageType: 'text'
      });
    }

    setSending(false);
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message permanently?')) return;

    try {
      await chatAPI.deleteMessage(messageId);

      // Remove from UI immediately
      setMessages(prev =>
        prev.filter(msg => msg.id !== messageId)
      );

      if (socket) {
        socket.emit('delete-message', {
          messageId,
          receiverId: friend.id
        });
      }

    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message');
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (socket && e.target.value.length > 0) {
      socket.emit('typing', { receiverId: friend.id });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop-typing', { receiverId: friend.id });
      }, 2000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('sheet') || fileType.includes('excel')) return '📊';
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📽️';
    if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
    if (fileType.includes('audio')) return '🎵';
    if (fileType.includes('video')) return '🎬';
    return '📎';
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-friend-avatar">
          {friend.username.charAt(0).toUpperCase()}
        </div>
        <div className="chat-friend-info">
          <div className="chat-friend-name">{friend.username}</div>
          <div className="chat-friend-status">
            {isOnline ? '🟢 Online' : '⚫ Offline'}
          </div>
        </div>
      </div>

      <div className="messages-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="spinner"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👋</div>
            <h3 className="empty-state-title">Start the conversation</h3>
            <p className="empty-state-text">
              Send a message to {friend.username}
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const isSent = msg.sender.id === currentUser.id;
              
              return (
                <div
                  key={msg.id || index}
                  className={`message ${isSent ? 'sent' : 'received'}`}
                  style={{ position: 'relative' }}
                >
                  <div className="message-avatar">
                    {isSent 
                      ? currentUser.username.charAt(0).toUpperCase()
                      : friend.username.charAt(0).toUpperCase()
                    }
                  </div>
                  <div className="message-content">
                    <div className="message-bubble" style={{ position: 'relative' }}>
                      {msg.messageType === 'text' && (
                        <p className="message-text">{msg.message}</p>
                      )}
                      
                      {msg.messageType === 'image' && (
                        <a 
                          href={msg.fileUrl} 
                          download={msg.fileName || 'image.jpg'}
                          style={{ textDecoration: 'none' }}
                          title={`Download: ${msg.fileName || 'image.jpg'}`}
                        >
                          {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
                          <img 
                            src={msg.fileUrl} 
                            alt="attachment"
                            className="message-image"
                            style={{ maxWidth: '300px', borderRadius: '8px', cursor: 'pointer' }}
                          />
                        </a>
                      )}
                      
                      {msg.messageType === 'file' && (
                        <a 
                          href={msg.fileUrl} 
                          download={msg.fileName}
                          className="message-file"
                          style={{ textDecoration: 'none', color: 'inherit' }}
                          title={`Download: ${msg.fileName}`}
                        >
                          <div className="file-icon">
                            {getFileIcon(msg.fileType)}
                          </div>
                          <div className="file-info">
                            <div className="file-name">{msg.fileName}</div>
                            <div className="file-size">
                              {formatFileSize(msg.fileSize)}
                            </div>
                          </div>
                          <div style={{ fontSize: '1.5rem' }}>⬇️</div>
                        </a>
                      )}

                      {isSent && (
                        <div className="message-actions">
                          <button
                            className="delete-btn"
                            onClick={() => handleDeleteMessage(msg.id)}
                            title="Delete message permanently"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="message-time">
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}

        {isTyping && (
          <div className="typing-indicator">
            <div className="typing-dots">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
            <span>{friend.username} is typing...</span>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="upload-progress">
          <span>Uploading...</span>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <span>{uploadProgress}%</span>
        </div>
      )}

      <div className="message-input-container">
        <div className="file-upload-container" style={{ marginBottom: '0.5rem' }}>
          <button
            type="button"
            className="file-upload-btn"
            onClick={() => imageInputRef.current?.click()}
            title="Upload image"
            disabled={isUploading}
          >
            🖼️
          </button>
          <input
            ref={imageInputRef}
            type="file"
            className="file-upload-input"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={isUploading}
          />
          
          <button
            type="button"
            className="file-upload-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Upload file"
            disabled={isUploading}
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="file-upload-input"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
        </div>

        <form onSubmit={handleSendMessage} className="message-input-wrapper">
          <textarea
            className="message-input"
            placeholder={`Message ${friend.username}...`}
            value={newMessage}
            onChange={handleTyping}
            onKeyPress={handleKeyPress}
            rows={1}
            disabled={sending || isUploading}
          />
          <button
            type="submit"
            className="send-button"
            disabled={!newMessage.trim() || sending || isUploading}
          >
            {sending ? '⏳' : '📤'} Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatWindow;
