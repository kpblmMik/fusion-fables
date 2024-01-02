import { Server } from "socket.io";
// const Server = require("socket.io").Server;
const port = process.env.PORT || 3000;
const io = new Server({
    cors: {
        origin: "*"
    }
});

io.on("connection", (socket) => {
    console.log("a user connected", socket.id);
    socket.on("message", (message) => {
        console.log("message", message);
        io.emit("message", message);
    })
});

io.listen(port, () => {
    console.log("listening on port " + port);
});