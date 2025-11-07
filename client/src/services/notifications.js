export const showNotification = (title, options = {}) => {
  // Check if browser supports notifications
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return;
  }

  // Check if user has granted permission
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '☁️',
      badge: '☁️',
      tag: 'sky-talk',
      requireInteraction: false,
      ...options
    });
  } else if (Notification.permission !== 'denied') {
    // Ask for permission
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, {
          icon: '☁️',
          badge: '☁️',
          tag: 'sky-talk',
          requireInteraction: false,
          ...options
        });
      }
    });
  }
};

export const playNotificationSound = () => {
  // Create a simple beep sound
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = 800; // Hz
  oscillator.type = 'sine';

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
};
