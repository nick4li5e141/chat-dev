# Chat Application

A real-time chat application built with Node.js and Express, featuring AI-powered responses using a locally run LM Studio server. The application is containerized using Docker for easy deployment and scaling.

## Features

- Real-time chat interface
- AI-powered responses using local LM Studio server
- Server-Sent Events (SSE) for streaming responses
- Docker containerization
- CORS enabled for cross-origin requests
- Environment variable configuration

## Prerequisites

- Node.js (v14 or higher)
- Docker and Docker Compose
- LM Studio installed and running locally

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
PORT=3000
API_URL=http://localhost:1234/v1/chat/completions  # Default LM Studio API endpoint
SYSTEM_PROMPT=Your system prompt here
```

## Installation

### Using Docker (Recommended)

1. Clone the repository
2. Create a `.env` file with your configuration
3. Build and run the container:

```bash
docker compose up --build
```

The application will be available at `http://localhost:3000`

### Manual Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file with your configuration
4. Start the server:

```bash
node node.js
```

## Project Structure

```
.
├── public/           # Static files
├── node.js          # Main application file
├── package.json     # Project dependencies and scripts
├── Dockerfile       # Docker configuration
├── compose.yaml     # Docker Compose configuration
└── .env             # Environment variables (create this)
```

## API Endpoints

### GET /generate-text

Generates AI responses based on user input.

Query Parameters:
- `prompt`: The user's input text

Response: Server-Sent Events stream with AI-generated responses

## Dependencies

- express: ^4.19.2
- cors: ^2.8.5
- dotenv: ^16.4.5
- node-fetch: ^2.7.0

## Docker Configuration

The application is configured to run in a Docker container with the following specifications:

- Port: 3000
- Node.js environment
- Volume mounts for development
- Environment variables support

## Development

To modify the application:

1. Make changes to the source code
2. Rebuild the Docker container:

```bash
docker compose up --build
```

## License

ISC

## Author

Nick Sabeh

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 