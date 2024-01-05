import { Server } from "socket.io";

const io = new Server({
    cors: {
        origin: "*"
    }
});

let playerCount = 0; // Track the number of connected players
let connectedClients = []; // Maintain an array of connected clients
let isInGame = false;

io.on("connection", (socket) => {
    console.log("a user connected", socket.id);

    playerCount++;
    console.log("Player Count:", playerCount);

    // Add the newly connected client to the array
    connectedClients.push(socket.id);

    // Broadcast the updated player count to all clients
    io.emit("playerCount", playerCount);

    socket.on("startGame", () => {
        console.log("Received startGame signal");
        if (playerCount >= 3 && !isInGame) {
            console.log("Starting the game");
            io.emit("turnUpdate", connectedClients[0]);
            io.emit("deactivateStartButton");
            isInGame = true;
            // Notify all clients that the game has started
            io.emit("gameStart");
        } else {
            console.log("Not enough players or game is already in progress");
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

    socket.on("finishGame", () => {
        if (isInGame) {
            console.log("Finishing the game");
            isInGame = false;
            io.emit("gameFinish");
            // Notify all clients that the game has finished
            io.emit("enableSubmit");
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
    });

    socket.on("message", (message) => {
        console.log("message", message);
        io.emit("message", message);
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

const port = process.env.PORT || 3000;
io.listen(port, () => {
    console.log("listening on port " + port);
});
