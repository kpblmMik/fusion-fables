import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Input validation helper - exported for testing
export function validateMessage(data) {
    if (!data || typeof data !== "object") return null;
    const { playerName, message } = data;
    if (typeof playerName !== "string" || typeof message !== "string") return null;
    // Sanitize and limit length
    const sanitizedName = playerName.trim().slice(0, 50);
    const sanitizedMessage = message.trim().slice(0, 500);
    if (!sanitizedName || !sanitizedMessage) return null;
    return { playerName: sanitizedName, message: sanitizedMessage };
}

// Story prompts - exported for testing
export const gameBeginnings = [
    "Once upon a time in a magical land,",
    "In the year 3025, on a distant planet,",
    "Amidst the bustling streets of a futuristic city,",
    "Deep in the heart of the enchanted forest,",
    "On a starship traveling through the cosmos,",
    "In a world where time travel was possible,",
    "In a parallel universe where cats ruled the world,",
    "On the moon, where a colony of space-faring penguins held their annual talent show,",
    "In the laboratory of a mad scientist creating musical vegetables,",
    "Within the pages of a living book that told its own stories,",
    "At the edge of the universe, where a lonely asteroid hosted an intergalactic party,",
    "In a steampunk city where clockwork robots served afternoon tea,",
    "At the top of a beanstalk, where a surprisingly modern coffee shop catered to giants and fairies alike,",
    "In a desert where mirages were portals to whimsical dimensions,",
    "Within the dreams of a child with the ability to bring their fantasies to life,",
    "On an island where pirates traded treasures for laughter instead of gold,",
    "In a village where every resident had a superpower, but only used it for mundane tasks,",
    "At the bottom of the ocean, where fish attended an underwater comedy club,",
    "On a cloud where a celestial game of charades entertained the gods,",
    "In a haunted mansion where ghosts hosted a yearly costume party,",
    "On a rainbow bridge connecting realms, where creatures swapped stories during their daily commute,",
    "In a dimension where math equations came to life and threw calculus-themed parties,",
    "At a carnival on Mars, where aliens marveled at Earth-themed roller coasters,",
    "In a secret garden where flowers whispered tales of their past lives,",
    "Within a giant snow globe, where snowmen had animated conversations when shaken,"
];

// Factory function to create a game server - exported for testing
export function createGameServer(options = {}) {
    const app = express();
    const httpServer = createServer(app);

    // Serve static files from public directory (skip in test mode)
    if (!options.testMode) {
        app.use(express.static(join(__dirname, "../public")));
    }

    // Initialize Socket.IO with CORS configuration
    const io = new Server(httpServer, {
        cors: {
            origin: options.corsOrigin || process.env.ALLOWED_ORIGINS?.split(",") || "*",
            methods: ["GET", "POST"]
        }
    });

    // Game state - encapsulated per server instance
    let connectedClients = [];
    let isInGame = false;
    let storedMessages = [];
    let currentTurnIndex = 0;

    function getRandomBeginning() {
        const randomIndex = Math.floor(Math.random() * gameBeginnings.length);
        return gameBeginnings[randomIndex];
    }

    function getPlayerCount() {
        return connectedClients.length;
    }

    // Exported getters for testing
    function getGameState() {
        return {
            connectedClients: [...connectedClients],
            isInGame,
            storedMessages: [...storedMessages],
            currentTurnIndex
        };
    }

    function resetGameState() {
        connectedClients = [];
        isInGame = false;
        storedMessages = [];
        currentTurnIndex = 0;
    }

    io.on("connection", (socket) => {
        console.log("User connected:", socket.id);

        // Add the newly connected client to the array
        connectedClients.push(socket.id);

        // Broadcast the updated player count to all clients
        io.emit("playerCount", getPlayerCount());
        io.emit("connectedClients", connectedClients);

        socket.on("startGame", () => {
            console.log("Received startGame signal");
            if (getPlayerCount() >= 3 && !isInGame) {
                console.log("Starting the game");

                const randomBeginning = getRandomBeginning();
                currentTurnIndex = 0;

                io.emit("systemMessage", "GAME STARTED!");
                io.emit("systemMessage", randomBeginning);
                io.emit("turnUpdate", connectedClients[currentTurnIndex]);
                io.emit("deactivateStartButton");
                isInGame = true;
                io.emit("gameStart");
            } else {
                console.log("Not enough players or the game is already in progress");
                socket.emit("alert", "Not enough players (need 3+) or the game is already in progress.");
            }
        });

        socket.on("endTurn", () => {
            if (isInGame && connectedClients.length > 0) {
                currentTurnIndex = (currentTurnIndex + 1) % connectedClients.length;
                io.emit("turnUpdate", connectedClients[currentTurnIndex]);
            }
        });

        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);

            // Find the index before removing
            const disconnectedIndex = connectedClients.indexOf(socket.id);

            // Remove the disconnected client from the array
            connectedClients = connectedClients.filter((client) => client !== socket.id);

            // If the game is in progress and the disconnected player was before or at current turn
            if (isInGame && connectedClients.length > 0) {
                // Adjust turn index if needed
                if (disconnectedIndex <= currentTurnIndex) {
                    currentTurnIndex = Math.max(0, currentTurnIndex - 1);
                }
                // Make sure currentTurnIndex is valid
                currentTurnIndex = currentTurnIndex % connectedClients.length;
                io.emit("turnUpdate", connectedClients[currentTurnIndex]);
            }

            // End game if not enough players
            if (isInGame && connectedClients.length < 2) {
                isInGame = false;
                io.emit("systemMessage", "Game ended - not enough players remaining");
                io.emit("gameFinish");
                io.emit("activateStartButton");
                storedMessages = [];
            }

            console.log("Player Count:", getPlayerCount());
            // Broadcast the updated player count to all clients
            io.emit("playerCount", getPlayerCount());
            io.emit("connectedClients", connectedClients);
        });

        socket.on("message", (data) => {
            const validated = validateMessage(data);
            if (!validated) {
                console.log("Invalid message received, ignoring");
                return;
            }

            const { playerName, message } = validated;

            if (isInGame) {
                // Store the message for end-game display
                storedMessages.push({ playerName, message });
                console.log("Stored Messages:", storedMessages.length);
            }

            const senderSocketId = socket.id;
            io.emit("message", { playerName, message, senderSocketId });
        });

        socket.on("finishGame", () => {
            if (isInGame) {
                console.log("Finishing the game");
                isInGame = false;

                // Emit a system message and finish game signal
                io.emit("systemMessage", "THE END");
                io.emit("gameFinish");
                io.emit("enableSubmit");

                // Emit a signal with the stored messages
                io.emit("displayStoredMessages", storedMessages);

                // Clear the stored messages for the next game
                storedMessages = [];
                currentTurnIndex = 0;
            }
        });

        // Event listener for deactivating the "Start Game" button on all clients
        socket.on("deactivateStartButton", () => {
            io.emit("deactivateStartButton");
        });

        socket.on("activateStartButton", () => {
            io.emit("activateStartButton");
        });

        // Error handling for socket
        socket.on("error", (err) => {
            console.error("Socket error:", err);
        });
    });

    return {
        app,
        httpServer,
        io,
        getGameState,
        resetGameState,
        getPlayerCount
    };
}

// Only start the server if this is the main module (not imported for testing)
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
    const { httpServer } = createGameServer();
    const port = process.env.PORT || 3000;

    httpServer.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
        console.log("SIGTERM received, shutting down gracefully");
        httpServer.close(() => {
            console.log("Server closed");
            process.exit(0);
        });
    });

    process.on("SIGINT", () => {
        console.log("SIGINT received, shutting down gracefully");
        httpServer.close(() => {
            console.log("Server closed");
            process.exit(0);
        });
    });
}
