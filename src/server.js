import { Server } from "socket.io";

const io = new Server({
    cors: {
        origin: "*"
    }
});

let playerCount = 0; // Track the number of connected players

io.on("connection", (socket) => {
    console.log("a user connected", socket.id);
    
    playerCount++; // Increment player count on each connection
    console.log("Player Count:", playerCount);
    io.emit("playerCount", playerCount);

    socket.on("disconnect", () => {
        console.log("user disconnected");
        playerCount--; // Decrement player count on each disconnection
        console.log("Player Count:", playerCount);
        io.emit("playerCount", playerCount);
    });

    socket.on("message", (message) => {
        console.log("message", message);
        io.emit("message", message);
    });
});

const port = process.env.PORT || 3000;
io.listen(port, () => {
    console.log("listening on port " + port);
});