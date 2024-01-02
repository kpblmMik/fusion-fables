const socket = io('http://localhost:8080');
const input = document.getElementById('chat-input');
const button = document.getElementById('submit');
const messages = document.getElementById('messages');
const playerName = getParameterByName('name'); // Custom function to get the player name from the query parameter

socket.on("connect", () => {
    console.log(socket.id);
    if (playerName) {
        console.log("Player Name:", playerName);
    } else {
        // Handle the case where the player name is missing
        alert("Player name is missing. Redirecting to the main page.");
        window.location.href = "index.html";
    }
});

button.onclick = () => {
    const message = input.value.trim();
    if (message !== "") {
        console.log("INPUT VALUE:", message);

        // Emit the message along with the player name to the server
        socket.emit("message", { playerName, message });

        input.value = "";
    }
};

socket.on("message", (data) => {
    console.log('Message:', data);

    // Display the message with the player name
    messages.innerHTML += `<li>${data.playerName}: ${data.message}</li>`;
});

// Function to extract query parameters by name
function getParameterByName(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}
