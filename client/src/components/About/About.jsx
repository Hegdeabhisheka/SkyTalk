import React from 'react';
import '../../styles/about.css';

function About() {
  return (
    <div className="fade-in">
      <div className="content-header">
        <h1 className="content-title">ℹ️ About Sky Talk</h1>
        <p className="content-subtitle">Real-time messaging, secure & private</p>
      </div>

      {/* Project Information */}
      <div className="about-section glass-card slide-in-up">
        <div className="about-header">
          <div className="about-icon">☁️</div>
          <h2 className="about-section-title">About This Project</h2>
        </div>
        
        <div className="about-content">
          <p className="about-text">
            <strong>Sky Talk</strong> is a modern, real-time chat application built with the MERN stack 
            (MongoDB, Express.js, React, Node.js). It provides a secure platform for private messaging 
            with friends through an intuitive and beautiful interface.
          </p>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🔐</div>
              <h3 className="feature-title">Secure Authentication</h3>
              <p className="feature-description">
                OTP-based login system with email verification for enhanced security
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3 className="feature-title">Friend System</h3>
              <p className="feature-description">
                Send and accept friend requests - chat only with approved connections
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3 className="feature-title">Real-time Messaging</h3>
              <p className="feature-description">
                Instant message delivery with Socket.io WebSocket technology
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📁</div>
              <h3 className="feature-title">File Sharing</h3>
              <p className="feature-description">
                Share files securely with friends through Cloudinary integration
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🎨</div>
              <h3 className="feature-title">Modern UI/UX</h3>
              <p className="feature-description">
                Beautiful glassmorphism design with smooth animations and transitions
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3 className="feature-title">Fully Responsive</h3>
              <p className="feature-description">
                Seamless experience across desktop, tablet, and mobile devices
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Technology Stack */}
      <div className="about-section glass-card slide-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="about-header">
          <div className="about-icon">⚙️</div>
          <h2 className="about-section-title">Technology Stack</h2>
        </div>
        
        <div className="tech-stack">
          <div className="tech-category">
            <h3 className="tech-category-title">Frontend</h3>
            <div className="tech-tags">
              <span className="tech-tag">React.js</span>
              <span className="tech-tag">Pure CSS3</span>
              <span className="tech-tag">Axios</span>
              <span className="tech-tag">React Router</span>
              <span className="tech-tag">Socket.io Client</span>
            </div>
          </div>

          <div className="tech-category">
            <h3 className="tech-category-title">Backend</h3>
            <div className="tech-tags">
              <span className="tech-tag">Node.js</span>
              <span className="tech-tag">Express.js</span>
              <span className="tech-tag">MongoDB</span>
              <span className="tech-tag">Socket.io</span>
              <span className="tech-tag">JWT</span>
            </div>
          </div>

          <div className="tech-category">
            <h3 className="tech-category-title">Services & Tools</h3>
            <div className="tech-tags">
              <span className="tech-tag">Nodemailer</span>
              <span className="tech-tag">Cloudinary</span>
              <span className="tech-tag">Bcrypt.js</span>
              <span className="tech-tag">Mongoose</span>
              <span className="tech-tag">CORS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Developer Information */}
      <div className="about-section glass-card developer-card slide-in-up" style={{ animationDelay: '0.2s' }}>
        <div className="developer-header">
          <div className="developer-avatar">
            <span className="avatar-text">AH</span>
            <div className="avatar-ring"></div>
          </div>
          <div className="developer-info">
            <h2 className="developer-name">Abhisheka C Hegde</h2>
            <p className="developer-title">Full Stack Developer</p>
          </div>
        </div>

        <div className="developer-content">
          <p className="developer-bio">
            Passionate full-stack developer specializing in MERN stack applications with a focus on 
            creating beautiful, intuitive, and performant web experiences. Currently pursuing studies 
            in embedded systems while building innovative web applications.
          </p>

          <div className="developer-interests">
            <h3 className="interests-title">Interests & Expertise</h3>
            <div className="interests-grid">
              <div className="interest-item">
                <span className="interest-icon">💻</span>
                <span className="interest-text">Web Development (React, Express, Node.js)</span>
              </div>
              <div className="interest-item">
                <span className="interest-icon">🔌</span>
                <span className="interest-text">Embedded Systems & IoT</span>
              </div>
              <div className="interest-item">
                <span className="interest-icon">📊</span>
                <span className="interest-text">Investment & Stock Market Analysis</span>
              </div>
              <div className="interest-item">
                <span className="interest-icon">🎨</span>
                <span className="interest-text">Kerala Tribal Culture & Theyyam Traditions</span>
              </div>
              <div className="interest-item">
                <span className="interest-icon">🎭</span>
                <span className="interest-text">Face Painting & Traditional Art</span>
              </div>
              <div className="interest-item">
                <span className="interest-icon">🚀</span>
                <span className="interest-text">Building Innovative Tech Solutions</span>
              </div>
            </div>
          </div>

          <div className="developer-contact">
            <h3 className="contact-title">Get In Touch</h3>
            <div className="contact-links">
              <a href="mailto:hegdeabhisheka@gmail.com" className="contact-link">
                <span className="contact-icon">📧</span>
                <span className="contact-text">hegdeabhisheka@gmail.com</span>
              </a>
              <div className="contact-link">
                <span className="contact-icon">🌐</span>
                <span className="contact-text">Sky Talk - Connect & Chat Securely</span>
              </div>
            </div>
          </div>

          <div className="developer-projects">
            <h3 className="projects-title">Notable Projects</h3>
            <div className="projects-list">
              <div className="project-item">
                <div className="project-name">
                  <span className="project-icon">📦</span>
                  VyaparPro
                </div>
                <p className="project-description">
                  MERN-stack inventory management system with CRUD operations, analytics, 
                  role-based access, and comprehensive reporting features
                </p>
              </div>
              <div className="project-item">
                <div className="project-name">
                  <span className="project-icon">☁️</span>
                  Sky Talk
                </div>
                <p className="project-description">
                  Real-time chat application with OTP authentication, friend system, 
                  file sharing, and modern glassmorphism UI design
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="about-footer">
        <div className="footer-content">
          <p className="footer-text">
            Built with 💙 using MERN Stack
          </p>
          <p className="footer-copyright">
            © 2025 Sky Talk. All rights reserved. | Developed by Abhisheka C Hegde
          </p>
        </div>
      </div>
    </div>
  );
}

export default About;
