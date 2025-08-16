# Contributing to Video Call Application

Thank you for considering contributing to our Video Call application! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

Please be respectful and considerate of others when contributing to this project. We aim to foster an inclusive and welcoming community.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with the following information:
- A clear, descriptive title
- Steps to reproduce the bug
- Expected behavior
- Actual behavior
- Screenshots if applicable
- Environment details (browser, OS, etc.)

### Suggesting Features

We welcome feature suggestions! Please create an issue with:

- A clear, descriptive title
- Detailed description of the proposed feature
- Explanation of why this feature would be beneficial
- Any implementation ideas you have

### Pull Requests

1. Fork the repository
2. Create a new branch from `sfu`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes
4. Run tests and ensure your code follows our style guidelines
5. Commit your changes with clear, descriptive commit messages
6. Push to your fork
7. Submit a pull request to the `sfu` branch

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/xuantruongg03/video-call-group.git
   cd groupchat-video-call
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file with the necessary variables (see README.md)

4. Start the development server:
   ```bash
   npm run dev
   ```

## Coding Standards

- Use TypeScript for type safety
- Follow the existing code style and architecture
- Write meaningful comments for complex logic
- Use descriptive variable and function names
- Keep components focused on a single responsibility

### Component Structure

When creating new components:
- Use functional components with hooks
- Place components in the appropriate directory based on their purpose
- Include proper TypeScript types/interfaces
- Follow the existing naming conventions

## Git Workflow

- Create feature branches from `sfu`
- Use descriptive branch names (e.g., `feature/add-mute-indicator`)
- Make focused, small commits with clear messages
- Keep pull requests concise and focused on a single feature or fix

## Testing

Before submitting a pull request:
- Test your changes across different browsers
- Verify that your code works on both desktop and mobile devices
- Ensure that existing functionality is not broken

## Documentation

Please update documentation when:
- Adding new features
- Changing existing functionality
- Fixing bugs that required workarounds

## Questions?

If you have any questions about contributing, please reach out to the project maintainers.

Thank you for contributing to make this video call application better!