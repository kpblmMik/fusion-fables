document.addEventListener("DOMContentLoaded", () => {
    // HTML escape function to prevent XSS attacks
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Helper to create safe message elements
    function createMessageElement(name, message, className = '') {
        const li = document.createElement('li');
        li.className = `lead ${className}`.trim();

        const strong = document.createElement('strong');
        strong.textContent = name + ':';

        li.appendChild(strong);
        li.appendChild(document.createTextNode(' ' + message));
        return li;
    }

    // Helper to create system message elements
    function createSystemMessage(message) {
        const li = document.createElement('li');
        li.className = 'system-message lead';

        const strong = document.createElement('strong');
        strong.textContent = message;

        li.appendChild(strong);
        return li;
    }

    const playerName = Cookies.get('playerName');
    if (!playerName) {
        alert("Player name is missing. Redirecting to the main page.");
        window.location.href = "index.html";
    }

    const welcomeMessage = document.getElementById('welcomeMessage');
    welcomeMessage.textContent = `Greetings, ${playerName}!`;

    // Connect to the same host (works for both development and production)
    const socket = io();
    const input = document.getElementById('chat-input');
    const button = document.getElementById('submit');
    const messages = document.getElementById('messages');
    const playerCountElement = document.getElementById('playerCount');
    const startButton = document.getElementById('StartGameButton');
    const finishButton = document.getElementById('FinishGameButton');

    let playerTurn = 0;
    let isInGame = false;
    let connectedClients = [];
    let playerIndex = -1;

    function sendMessage() {
        const message = input.value.trim();
        if (message !== "") {
            if (isInGame && playerTurn === socket.id) {
                // Only allow the current player to submit a message during the game
                socket.emit("message", { playerName, message });
                input.value = "";
                // Notify the server that the current player's turn is over
                socket.emit("endTurn");
            } else if (!isInGame) {
                // If not in game, treat messages as regular chat
                socket.emit("message", { playerName, message });
                input.value = "";
            }
        }
    }

    button.onclick = sendMessage;

    // Allow Enter key to send messages
    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !input.disabled) {
            sendMessage();
        }
    });

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

    // Event listener for receiving connected clients from the server
    socket.on("connectedClients", (clients) => {
        connectedClients = clients;

        playerIndex = connectedClients.indexOf(socket.id);

    });

    socket.on("deactivateStartButton", () => {
        startButton.disabled = true;
    });

    socket.on("activateStartButton", () => {
        startButton.disabled = false;
    });

    function scrollToBottom() {
        const chatContainer = document.getElementById('messages');
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    socket.on("message", (data) => {
        const { playerName, message, senderSocketId } = data;

        // Check if the message sender is the current player
        const isMessageFromCurrentPlayer = senderSocketId === socket.id;

        if (isMessageFromCurrentPlayer) {
            // Display messages from the current player as coming from "You"
            messages.appendChild(createMessageElement('You', message));
        } else if (isInGame) {
            // Calculate the index of the previous player in the connectedClients array
            const previousPlayerIndex = (playerIndex - 1 + connectedClients.length) % connectedClients.length;
            // Check if the message sender is the previous player in the list
            const isMessageFromPreviousPlayer = senderSocketId === connectedClients[previousPlayerIndex];

            if (isMessageFromPreviousPlayer) {
                // Display messages from the previous player without masking
                messages.appendChild(createMessageElement(playerName, message));
            } else {
                // Mask the message from other players with stars
                const maskedMessage = '*'.repeat(message.length);
                messages.appendChild(createMessageElement(playerName, maskedMessage));
            }
        } else {
            // If not in game, display all messages without masking
            messages.appendChild(createMessageElement(playerName, message));
        }
        scrollToBottom();
    });
    

    // Event listener for receiving player count from the server
    socket.on("playerCount", (count) => {
        playerCountElement.textContent = `Players Online: ${count}`;
    });

    // Event listener for receiving turn information from the server

    // Track current alert to prevent memory leaks
    let currentTurnAlert = null;

    socket.on("turnUpdate", (turn) => {
        playerTurn = turn;

        // Remove previous alert if exists
        if (currentTurnAlert) {
            currentTurnAlert.remove();
            currentTurnAlert = null;
        }

        if (turn === socket.id) {
            const alertContainer = document.createElement("div");
            alertContainer.className = "alert alert-info fade show fixed-top";
            alertContainer.textContent = "It's your turn!";
            document.body.appendChild(alertContainer);
            currentTurnAlert = alertContainer;

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

    // Single event listener for submit button to close turn alert
    button.addEventListener("click", () => {
        if (currentTurnAlert) {
            currentTurnAlert.remove();
            currentTurnAlert = null;
        }
    });

    // Event listener for displaying stored messages
    socket.on('displayStoredMessages', (storedMessages) => {
        storedMessages.forEach(({ playerName, message }) => {
            messages.appendChild(createMessageElement(playerName, message));
        });
        scrollToBottom();
    });

    socket.on("systemMessage", (message) => {
        messages.appendChild(createSystemMessage(message));
        scrollToBottom();
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

    // Connection error handling
    socket.on("connect_error", (err) => {
        console.error("Connection error:", err);
        messages.appendChild(createSystemMessage("Connection error - trying to reconnect..."));
        scrollToBottom();
    });

    socket.on("disconnect", (reason) => {
        console.log("Disconnected:", reason);
        messages.appendChild(createSystemMessage("Disconnected from server"));
        scrollToBottom();
    });

    socket.on("connect", () => {
        console.log("Connected to server");
    });
});
