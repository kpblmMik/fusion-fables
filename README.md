# Fusion Fables

A collaborative multiplayer storytelling game where players take turns contributing sentences to build a shared narrative. Each player can only see the previous player's contribution while others' messages are masked with asterisks.

## Features

- Real-time multiplayer using Socket.IO
- Turn-based storytelling with message masking
- Pre-game chat lobby
- 25 creative story prompts
- Responsive design with Bootstrap

## Requirements

- Node.js 18+
- npm

## Local Development

```bash
# Clone the repository
git clone https://github.com/kpblmMik/fusion-fables.git
cd fusion-fables

# Install dependencies
npm install

# Start the server
npm start
```

The server runs at `http://localhost:3000`

## Testing the Game

1. Start the server with `npm start`
2. Open `http://localhost:3000` in your browser
3. Enter your player name and click "Start" (or press Enter)
4. Open 2 more browser tabs/windows to `http://localhost:3000`
5. Enter different names for each player
6. Once 3+ players are connected, click "Start Game"
7. Take turns contributing sentences - you'll see "It's your turn!" when it's your turn
8. Click "Finish Game" to end the story and reveal all messages

## Deployment on Amazon Linux 2023

```bash
# Install Git
sudo dnf install git

# Clone the repository
git clone https://github.com/kpblmMik/fusion-fables.git

# Update system packages
sudo dnf update

# Install Node.js
sudo dnf install nodejs

# Navigate into the project directory
cd fusion-fables

# Install dependencies
npm install

# Start the application
npm start
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `ALLOWED_ORIGINS` | * | Comma-separated list of allowed CORS origins |

## Game Rules

1. Each player contributes one sentence per turn to build a story
2. You can only see the last sentence from the previous player
3. Other players' contributions are masked with asterisks
4. Any player can decide when to finish the story
5. Players can chat freely before and after the game
