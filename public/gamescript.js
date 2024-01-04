document.addEventListener("DOMContentLoaded", () => {
    // Retrieve the player name from the cookie
    const playerName = Cookies.get('playerName');

    // Check if the player name is available
    if (!playerName) {
        alert("Player name is missing. Redirecting to the main page.");
        window.location.href = "index.html";
    }

    // Update the welcome message
    const welcomeMessage = document.getElementById('welcomeMessage');
    welcomeMessage.textContent = `Greetings, ${playerName}!`;

    // Initialize socket connection
    const socket = io('http://localhost:8080');

    // DOM elements
    const input = document.getElementById('chat-input');
    const button = document.getElementById('submit');
    const messages = document.getElementById('messages');

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

        // Display the message with the player name
        messages.innerHTML += `<li>${data.playerName}: ${data.message}</li>`;
    });
});
