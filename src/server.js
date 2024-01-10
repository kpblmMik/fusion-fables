import { Server } from "socket.io";

const io = new Server({
    cors: {
        origin: "*"
    }
});

const gameBeginnings = [
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
]


let playerCount = 0; // Track the number of connected players
let connectedClients = []; // Maintain an array of connected clients
let isInGame = false;
let storedMessages = [];

function getRandomBeginning() {
    const randomIndex = Math.floor(Math.random() * gameBeginnings.length);
    return gameBeginnings[randomIndex];
}


io.on("connection", (socket) => {
    console.log("a user connected", socket.id);

    playerCount++;
    console.log("Player Count:", playerCount);

    // Add the newly connected client to the array
    connectedClients.push(socket.id);

    // Broadcast the updated player count to all clients
    io.emit("playerCount", playerCount);
    io.emit("connectedClients", connectedClients);

    socket.on("startGame", () => {
        console.log("Received startGame signal");
        if (playerCount >= 3 && !isInGame) {
            console.log("Starting the game");
    
            const randomBeginning = getRandomBeginning();
    
            io.emit("systemMessage", "GAME STARTED!");
            io.emit("systemMessage", randomBeginning);
            io.emit("turnUpdate", connectedClients[0]);
            io.emit("deactivateStartButton");
            isInGame = true;
            io.emit("gameStart");
        } else {
            console.log("Not enough players or the game is already in progress");
            socket.emit("alert", "Not enough players or the game is already in progress.");
        }
    });

    socket.on("endTurn", () => {
        if (isInGame) {
            const playerIndex = connectedClients.findIndex((client) => client === socket.id);
            const nextPlayerIndex = (playerIndex + 1) % playerCount;
            io.emit("turnUpdate", connectedClients[nextPlayerIndex]);
        }
    });

    
    socket.on("disconnect", () => {
        console.log("user disconnected");
        
        // Remove the disconnected client from the array
        connectedClients = connectedClients.filter((client) => client !== socket.id);
        
        playerCount--;
        
        // If a player leaves during their turn, update the turn to the next player
        if (socket.id === connectedClients[0] && isInGame) {
            io.emit("turnUpdate", connectedClients[1]);
        }
        
        console.log("Player Count:", playerCount);
        // Broadcast the updated player count to all clients
        io.emit("playerCount", playerCount);
        io.emit("connectedClients", connectedClients);
        
    });
    
    socket.on("message", (data) => {
        const { playerName, message } = data;
        if (isInGame) {
            // Append the message to the array
            const newMessage = { playerName, message };
            storedMessages.push(newMessage);
            console.log('Stored Messages:', storedMessages);
        }
        const senderSocketId = socket.id;
        io.emit("message", { playerName, message, senderSocketId });
    });
    
    socket.on('finishGame', () => {
        if (isInGame) {
            console.log("Finishing the game");
            isInGame = false;
    
            // Emit a system message and finish game signal
            io.emit("systemMessage", "THE END");
            io.emit("gameFinish");
            io.emit("enableSubmit");
    
            // Emit a signal with the stored messages
            io.emit('displayStoredMessages', storedMessages);
    
            // Clear the stored messages for the next game
            storedMessages = [];
        }
    });

    // Event listener for deactivating the "Start Game" button on all clients
    socket.on("deactivateStartButton", () => {
        io.emit("deactivateStartButton");
    });

    socket.on("activateStartButton", () => {
        io.emit("activateStartButton");
    });
    // Event listener for displaying an alert on the client
    socket.on("alert", (message) => {
        socket.emit("alert", message);
    });
});

const port = process.env.PORT || 8000;
io.listen(port, () => {
    console.log("listening on port " + port);
});
