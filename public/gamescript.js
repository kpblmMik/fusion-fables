document.addEventListener("DOMContentLoaded", () => {
    const playerName = Cookies.get('playerName');
    if (!playerName) {
        alert("Player name is missing. Redirecting to the main page.");
        window.location.href = "index.html";
    }

    const welcomeMessage = document.getElementById('welcomeMessage');
    welcomeMessage.textContent = `Greetings, ${playerName}!`;

    const socket = io('http://localhost:8080');
    const input = document.getElementById('chat-input');
    const button = document.getElementById('submit');
    const messages = document.getElementById('messages');
    const playerCountElement = document.getElementById('playerCount');
    const startButton = document.getElementById('StartGameButton');
    const finishButton = document.getElementById('FinishGameButton');

    let playerTurn = 0;
    let isInGame = false;

    button.onclick = () => {
        const message = input.value.trim();
        if (message !== "") {
            if (isInGame && playerTurn === socket.id) {
                // Only allow the current player to submit a message during the game
                socket.emit("message", { playerName, message });
                input.value = "";
                // Notify the server that the current player's turn is over
                socket.emit("endTurn");
            } else {
                // If not in game or not the player's turn, treat messages as regular chat
                socket.emit("message", { playerName, message });
                input.value = "";
            }
        }
    };

    startButton.onclick = () => {
        // Emit a signal to the server to start the game
        socket.emit("startGame");
    };

    socket.on("gameStart", () => {
        isInGame = true;
    });

    finishButton.onclick = () => {
        // Emit a signal to the server to finish the game
        socket.emit("finishGame");
    };

    socket.on("deactivateStartButton", () => {
        startButton.disabled = true;
    });

    socket.on("activateStartButton", () => {
        startButton.disabled = false;
    });

    socket.on("message", (data) => {
        const { playerName, message, senderSocketId } = data;
    
        // Check if the message sender is the current player
        const isMessageFromCurrentPlayer = senderSocketId === socket.id;
    
        if (isInGame) {
            if (isMessageFromCurrentPlayer) {
                messages.innerHTML += `<li><strong>${playerName}:</strong> ${message}</li>`;
            } else {
                // Mask the message from other players with stars
                const maskedMessage = Array(message.length + 1).join('*');
                messages.innerHTML += `<li><strong>${playerName}:</strong> ${maskedMessage}</li>`;
            }
        } else {
            // If not in game, display all messages without masking
            messages.innerHTML += `<li><strong>${playerName}:</strong> ${message}</li>`;
        }
    });
    

    // Event listener for receiving player count from the server
    socket.on("playerCount", (count) => {
        playerCountElement.textContent = `Players Online: ${count}`;
    });

    // Event listener for receiving turn information from the server
    socket.on("turnUpdate", (turn) => {
        playerTurn = turn;
        if (turn === socket.id) {
            const alertContainer = document.createElement("div");
            alertContainer.className = "alert alert-info fade show fixed-top";
            alertContainer.innerHTML = "It's your turn!";
            alertContainer.setAttribute("data-bs-dismiss", "alert");
            document.body.appendChild(alertContainer);
            // In-game button/input rules
            input.disabled = false;
            button.disabled = false;
            startButton.disabled = true;
        } else {
            input.disabled = true;
            button.disabled = true;
            startButton.disabled = true;
        }
    });

    socket.on("systemMessage", (message) => {
        messages.innerHTML += `<li class="system-message"><strong>${message}</li></strong>`;
    });

    // Event listener for receiving game finish signal
    socket.on("gameFinish", () => {
        isInGame = false;
        socket.emit("activateStartButton");
        input.disabled = false;
        button.disabled = false;
    });

    // Event listener for deactivating the "Start Game" button on all clients
    socket.on("deactivateStartButton", () => {
        startButton.disabled = true;
    });

    socket.on("enableSubmit", () => {
        button.disabled = false;
    });

    socket.on("alert", (message) => {
        alert(message);
        startButton.disabled = false;
        finishButton.disabled = false;
    });
});
