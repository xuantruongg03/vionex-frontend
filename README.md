<p align="center">
  <img src="https://res.cloudinary.com/dcweof28t/image/upload/v1750399380/image_products/favicon_vo2jtz.png" alt="Vionex Logo" width="200"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/WebRTC-333333?style=for-the-badge&logo=webrtc&logoColor=white" alt="WebRTC"/>
  <img src="https://img.shields.io/badge/Tailwind-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind"/>
  <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.io"/>
</p>

# 🎥 Vionex Frontend

Modern, enterprise-grade video conferencing client with AI-powered features and real-time collaboration tools.

## 🚀 Overview

**Vionex Frontend** is a cutting-edge React application that provides a comprehensive video conferencing experience. Built with modern web technologies, it delivers seamless real-time communication with advanced features like AI transcription, semantic search, and interactive collaboration tools.

### ✨ Key Features

- **HD Video Conferencing**: Crystal-clear video calls with WebRTC SFU architecture
- **AI-Powered Transcription**: Real-time speech-to-text display during meetings
- **Semantic Search**: Search through meeting transcripts intelligently
- **Organization Support**: Multi-tenant interface with organization management
- **Real-time Chat**: Instant messaging within meeting rooms
- **Interactive Whiteboard**: Collaborative drawing and annotation tools
- **Screen Sharing**: Desktop and application sharing capabilities
- **Voting & Polls**: Real-time polling and quiz management
- **Translation Cabin**: Multi-language translation support
- **Responsive Design**: Seamless experience across all devices

## 🛠️ Technology Stack

### **Frontend Framework**
- **React 18+**: Modern component-based UI framework
- **TypeScript**: Type-safe development experience
- **Vite**: Lightning-fast build tool and dev server
- **Tailwind CSS**: Utility-first styling framework

### **UI & Components**
- **shadcn/ui**: Beautiful, accessible component library
- **Framer Motion**: Smooth animations and transitions
- **Lucide React**: Modern icon library
- **Excalidraw**: Collaborative whiteboard integration

### **State Management & Data**
- **Redux Toolkit**: Predictable state management
- **React Query**: Server state management
- **Zustand**: Lightweight state management

### **Real-time Communication**
- **WebRTC**: Peer-to-peer media streaming
- **Socket.IO**: Real-time bidirectional communication
- **MediaSoup Client**: Professional SFU integration

### **AI & Advanced Features**
- **Web Audio API**: Advanced audio processing
- **Speech Recognition API**: Voice commands
- **WebRTC VAD**: Voice activity detection
- **Real-time Transcription**: AI-powered speech-to-text

### **Development Tools**
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting
- **TypeScript**: Static type checking
- **Docker**: Containerized development

## 📋 Quick Start

### Prerequisites
- **Node.js** 18.0+ ([Download](https://nodejs.org/))
- **npm**, **yarn**, or **bun** package manager
- **Git** for version control

### Installation

```bash
# Clone the repository
git clone https://github.com/xuantruongg03/groupchat-video-call.git
cd groupchat-video-call

# Install dependencies
npm install
# or
bun install

# Create environment file
cp .env.example .env
```

### Environment Configuration

Create a `.env` file in the root directory:

```env
# Backend API
VITE_SERVER_URL=http://localhost:3000

# Cloudinary (for file uploads)
VITE_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-upload-preset

# Google OAuth (optional)
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### Development

```bash
# Start development server
npm run dev
# or
bun dev

# Open http://localhost:5173 in your browser
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to your hosting platform
```

### Docker Development

```bash
# Build and run with Docker
docker build -t vionex-frontend .
docker run -p 5173:5173 vionex-frontend

# Or use Docker Compose
docker-compose up -d
```

## 📁 Project Architecture

```
src/
├── components/              # 🧩 Reusable React components
│   ├── ui/                 # shadcn/ui base components
│   ├── VideoGrid.tsx       # Main video conferencing interface
│   ├── ChatSidebar.tsx     # Real-time messaging component
│   ├── ParticipantsList.tsx# Participant management
│   ├── WhiteBoard.tsx      # Collaborative whiteboard
│   └── VideoControls.tsx   # Media control interface
├── hooks/                  # 🪝 Custom React hooks
│   ├── useWebRTC.ts       # WebRTC connection management
│   ├── useSocket.ts       # Socket.IO integration
│   └── useTranscription.ts# AI transcription hooks
├── interfaces/             # 📝 TypeScript type definitions
├── pages/                  # 📄 Application pages/routes
│   ├── LoginPage.tsx      # Authentication page
│   ├── DashboardPage.tsx  # User dashboard
│   └── MeetingPage.tsx    # Main meeting interface
├── redux/                  # 🗄️ State management
│   ├── slices/            # Redux Toolkit slices
│   └── store.ts           # Store configuration
├── services/               # 🔌 API integrations
│   ├── api.ts             # Backend API client
│   ├── webrtc.ts          # WebRTC service
│   └── socket.ts          # Socket.IO service
├── utils/                  # 🛠️ Utility functions
└── configs/                # ⚙️ Configuration files
```

### 🎯 Key Features & Components

#### **Video Conferencing**
- **VideoGrid**: Adaptive video layout with speaker focus
- **VideoControls**: Camera, microphone, screen sharing controls
- **ParticipantsList**: Participant management with permissions

#### **Real-time Communication**
- **ChatSidebar**: Instant messaging with file sharing
- **Socket Integration**: Real-time event handling
- **Notification System**: In-app notifications and alerts

#### **AI-Powered Features**
- **TranscriptionDisplay**: Live speech-to-text transcription
- **SemanticSearch**: Intelligent transcript search
- **ChatbotInterface**: AI assistant integration

#### **Interactive Tools**
- **WhiteBoard**: Collaborative drawing with Excalidraw
- **QuizSidebar**: Interactive quiz creation and management
- **VotingDialog**: Real-time polling and voting system
- **TranslationCabin**: Multi-language translation interface

#### **Organization Management**
- **OrganizationSelector**: Multi-tenant organization switching
- **UserManagement**: User roles and permissions
- **MeetingHistory**: Organization-scoped meeting history

## 🚀 Backend Integration

This frontend connects to the **Vionex Backend** microservices architecture:

```
Frontend (React) ←→ API Gateway ←→ Microservices
                                    ├── Auth Service
                                    ├── Room Service  
                                    ├── SFU Service
                                    ├── Chat Service
                                    ├── Audio Service (AI)
                                    ├── Semantic Service
                                    ├── Chatbot Service (AI)
                                    └── Interaction Service
```

### 🔗 API Endpoints Used
- **Authentication**: `/api/auth/*` - User login, organization management
- **Rooms**: `/api/rooms/*` - Meeting room operations
- **WebSocket**: `/socket.io` - Real-time communication
- **Chat**: Real-time messaging via WebSocket
- **Media**: WebRTC signaling through SFU service
- **AI Features**: Transcription, semantic search, chatbot integration

### 📡 Real-time Features
- **WebRTC**: Direct peer-to-peer media streaming
- **Socket.IO**: Chat, notifications, room events
- **gRPC Streaming**: AI transcription and responses
- **WebSocket**: Organization-aware real-time updates

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Organization Isolation**: Multi-tenant data separation
- **WebRTC Security**: DTLS encryption for media streams
- **API Security**: Request validation and rate limiting
- **CORS Protection**: Cross-origin request security

## 🎨 UI/UX Features

- **Responsive Design**: Mobile-first responsive layout
- **Dark/Light Mode**: Theme switching capability
- **Accessibility**: WCAG compliant components
- **Animations**: Smooth transitions with Framer Motion
- **Loading States**: Skeleton loaders and progress indicators
- **Error Handling**: Graceful error boundaries and feedback

## 📱 Device Support

- **Desktop**: Full feature set with advanced controls
- **Tablet**: Touch-optimized interface with gesture support
- **Mobile**: Streamlined mobile experience
- **PWA Ready**: Progressive Web App capabilities
- **Cross-browser**: Chrome, Firefox, Safari, Edge support

## 🤝 Contributing

We welcome contributions to improve Vionex Frontend!

### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Make** your changes with proper TypeScript types
4. **Test** your changes thoroughly
5. **Commit** with conventional commits: `git commit -m 'feat: add amazing feature'`
6. **Push** to your branch: `git push origin feature/amazing-feature`
7. **Submit** a Pull Request with detailed description

### Code Standards
- **TypeScript**: Follow strict type checking
- **ESLint**: Use provided configuration
- **Prettier**: Auto-format code before commits
- **Testing**: Add tests for new features
- **Documentation**: Update README for new features

### Development Setup
```bash
# Install dependencies
npm install

# Run linting
npm run lint

# Run type checking
npm run type-check

# Run tests
npm run test

# Start development server
npm run dev
```

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### What you can do:
- ✅ Use for personal and commercial projects
- ✅ Modify and distribute
- ✅ Private use
- ✅ Include in proprietary software

### What you must do:
- 📝 Include the original license
- 📝 Include copyright notice

## 🔗 Related Projects

- **[Vionex Backend](https://github.com/xuantruongg03/vionex-backend)** - Microservices backend with AI features
- **[Vionex API Documentation](https://github.com/xuantruongg03/vionex-docs)** - API documentation and guides

## 📞 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/xuantruongg03/groupchat-video-call/issues)
- **Discussions**: [GitHub Discussions](https://github.com/xuantruongg03/groupchat-video-call/discussions)
- **Email**: xuantruongg03@gmail.com
- **Documentation**: [Wiki](https://github.com/xuantruongg03/groupchat-video-call/wiki)

---

<p align="center">
  <strong>Built with ❤️ by the Vionex Team</strong><br>
  <em>Empowering seamless communication through modern web technologies</em>
</p>
