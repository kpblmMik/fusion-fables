document.addEventListener("DOMContentLoaded", () => {
    // Retrieve the player name from the cookie
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
    const playerCountContainer = document.getElementById('playerCountContainer');
    const playerCountElement = document.getElementById('playerCount');

    // Event listener for the Submit button
    button.onclick = () => {
        const message = input.value.trim();
        if (message !== "") {
            // Emit the message along with the player name to the server
            socket.emit("message", { playerName, message });
            input.value = "";
        }
    };

    // Event listener for receiving messages from the server
    socket.on("message", (data) => {
        console.log('Message:', data);
        messages.innerHTML += `<li>${data.playerName}: ${data.message}</li>`;
    });
    // Event listener for receiving player count from the server
    socket.on("playerCount", (count) => {
        playerCountElement.textContent = `Players Online: ${count}`;
    });
});
