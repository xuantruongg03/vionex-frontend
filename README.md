# Vionex - Enterprise Video Conferencing Platform

<p align="center">
  <img src="https://res.cloudinary.com/dcweof28t/image/upload/v1750399380/image_products/favicon_vo2jtz.png" alt="Vionex Logo" width="400"/>
</p>

<p align="center">
  <strong>A cutting-edge, scalable video conferencing solution built with modern web technologies</strong>
</p>

<p align="center">
  <a href="https://vionex-frontend.vercel.app/" target="_blank">🚀 Live Demo</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-21+-green.svg" alt="Node.js"></a>
  <a href="https://reactjs.org/"><img src="https://img.shields.io/badge/React-18+-blue.svg" alt="React"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5+-blue.svg" alt="TypeScript"></a>
  <a href="https://webrtc.org/"><img src="https://img.shields.io/badge/WebRTC-Latest-orange.svg" alt="WebRTC"></a>
  <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-5+-purple.svg" alt="Vite"></a>
</p>

---

## Overview

Vionex is a professional-grade, real-time video conferencing platform designed for modern enterprises. Built with React, TypeScript, and WebRTC, it delivers high-quality video communication with advanced features like screen sharing, real-time chat, and intelligent media routing through our Selective Forwarding Unit (SFU) architecture.

## Key Features

### Advanced Video Conferencing

-   **Multi-participant Support**: Handle unlimited participants with efficient SFU architecture
-   **HD Video Quality**: Adaptive bitrate streaming for optimal quality
-   **Screen Sharing**: Professional screen sharing capabilities
-   **Picture-in-Picture**: Advanced layout management

### Enterprise Security

-   **Room Protection**: Password-protected meeting rooms
-   **Secure Connections**: End-to-end encrypted communications
-   **Access Control**: Granular permission management

### Collaboration Tools

-   **Real-time Chat**: Integrated messaging system with file sharing
-   **Interactive Whiteboard**: Collaborative drawing with permission controls
-   **File Sharing**: Support for images, documents, and PDFs
-   **Recording**: Meeting recording capabilities (coming soon)

### Professional Controls

-   **Media Management**: Granular audio/video controls
-   **User Management**: Pin speakers, manage participants
-   **Responsive Design**: Seamless experience across all devices
-   **Voice Activity Detection**: Intelligent speaker highlighting

### Educational & Enterprise Features

-   **Interactive Quizzes**: Create and conduct real-time quizzes with multiple question types
-   **Secret Voting**: Anonymous voting system for decision making
-   **Behavior Monitoring**: Advanced attention tracking for educational settings
-   **Translation Cabin**: Real-time language translation capabilities
-   **Network Monitoring**: Connection quality analysis and diagnostics

## Technology Stack

### Frontend Architecture

-   **React 18+** - Modern component-based UI framework
-   **TypeScript 5+** - Type-safe development experience
-   **Vite** - Lightning-fast build tool and dev server
-   **Tailwind CSS** - Utility-first styling framework
-   **shadcn/ui** - Beautiful, accessible component library
-   **Framer Motion** - Smooth animations and transitions
-   **Redux Toolkit** - Predictable state management

### Real-time Communication

-   **WebRTC** - Peer-to-peer media streaming
-   **MediaSoup Client** - Professional SFU implementation
-   **Socket.IO** - Real-time bidirectional communication
-   **PeerJS** - Simplified WebRTC abstraction

### Advanced Features

-   **Excalidraw** - Collaborative whiteboard drawing
-   **Web Audio API** - Advanced audio processing
-   **WebRTC VAD** - Voice activity detection

### Development & Deployment

-   **Docker** - Containerized deployment
-   **Nginx** - High-performance web server
-   **ESLint** - Code quality enforcement
-   **Prettier** - Code formatting

## Quick Features Demo

🎯 **Try these features in our live demo**: [https://vionex-frontend.vercel.app/](https://vionex-frontend.vercel.app/)

-   **Video Conferencing**: HD video calls with unlimited participants
-   **Screen Sharing**: Share your screen with crystal clear quality  
-   **Interactive Whiteboard**: Collaborate in real-time with drawing tools
-   **Live Chat**: Send messages and share files instantly
-   **Quiz System**: Create interactive quizzes for education/training
-   **Secret Voting**: Make decisions with anonymous voting
-   **Translation**: Real-time language translation

## Quick Start

### Prerequisites

Ensure you have the following installed:

-   **Node.js** 21+ ([Download](https://nodejs.org/))
-   **npm** or **bun** package manager
-   **Git** for version control

### Installation

1. **Clone the repository**

    ```bash
    git clone https://github.com/xuantruongg03/video-call-group.git
    cd video-call-group
    ```

2. **Install dependencies**

    ```bash
    # Using npm
    npm install

    # Using bun (recommended for faster installs)
    bun install
    ```

3. **Environment Configuration**

    Create a `.env` file in the root directory:

    ```env
    # Backend API Configuration
    VITE_SERVER_URL=https://your-backend-url/api/v1

    # SFU Server Configuration
    VITE_SFU_URL=wss://your-sfu-server:3002

    # Optional: Development settings
    VITE_APP_ENV=development
    ```

4. **Start Development Server**

    ```bash
    # Using npm
    npm run dev

    # Using bun
    bun run dev
    ```

    The application will be available at `http://localhost:5173`

### Production Build

Generate optimized production assets:

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

## 🐳 Docker Deployment

### Quick Deployment

```bash
# Build the Docker image
docker build -t vionex-frontend:latest .

# Run the container
docker run -d \
  --name vionex-frontend \
  -p 80:80 \
  -e VITE_SERVER_URL=https://your-backend-url/api/v1 \
  -e VITE_SFU_URL=wss://your-sfu-server:3002 \
  vionex-frontend:latest
```

### Docker Compose (Recommended)

```yaml
version: "3.8"
services:
    vionex-frontend:
        build: .
        ports:
            - "80:80"
        environment:
            - VITE_SERVER_URL=https://your-backend-url/api/v1
            - VITE_SFU_URL=wss://your-sfu-server:3002
        restart: unless-stopped
```

### Production Considerations

The included Nginx configuration is optimized for:

-   Serving React SPA with proper routing
-   WebRTC traffic handling
-   Security headers
-   Gzip compression
-   Static asset caching

## Project Architecture

```
src/
├── components/           # Reusable React components
│   ├── ui/              # shadcn/ui components
│   ├── Dialogs/         # Modal components
│   ├── Layout/          # Layout components
│   └── VideoGrid.tsx    # Main video grid component
├── hooks/               # Custom React hooks
├── interfaces/          # TypeScript type definitions
├── pages/               # Application pages/routes
├── redux/               # State management (Redux Toolkit)
├── services/            # API and external service integrations
├── utils/               # Utility functions and helpers
└── configs/             # Application configuration files
```

### Key Components

-   **VideoGrid**: Main video conferencing interface with adaptive layouts
-   **ChatSidebar**: Real-time messaging component with file sharing
-   **ParticipantsList**: Meeting participant management
-   **VideoControls**: Comprehensive media control interface
-   **WhiteBoard**: Collaborative whiteboard with permission system
-   **QuizSidebar**: Interactive quiz creation and management
-   **SecretVotingDialog**: Anonymous voting system
-   **TranslationCabinSidebar**: Real-time translation interface
-   **NetworkMonitorDialog**: Connection quality monitoring
-   **BehaviorMonitoring**: Attention and engagement tracking

## Contributing

We welcome contributions from the community! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting pull requests.

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add some amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Standards

-   Follow TypeScript best practices
-   Use Prettier for code formatting
-   Ensure ESLint passes
-   Write meaningful commit messages
-   Add tests for new features

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for complete details.

## Related Projects

-   **[Vionex Backend](https://github.com/xuantruongg03/vionex-backend-monorepo)** - Microservices backend architecture
-   **API Documentation** - OpenAPI/Swagger documentation (coming soon)

## Support

-   **Issues**: [GitHub Issues](https://github.com/xuantruongg03/video-call-group/issues)
-   **Documentation**: [Wiki](https://github.com/xuantruongg03/video-call-group/wiki) (coming soon)
-   **Community**: [Discussions](https://github.com/xuantruongg03/video-call-group/discussions)

---

<p align="center">
  <strong>Built with ❤️ by the xuantruongg003</strong>
</p>
