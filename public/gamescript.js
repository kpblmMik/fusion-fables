const socket = io('http://localhost:8080');
const input = document.getElementById('chat-input');
const button = document.getElementById('submit');
const messages = document.getElementById('messages');

socket.on("connect", () => {
    console.log(socket.id);
});

button.onclick = () => {
    console.log("INPUT VALUE:", input.value);
    socket.emit("message", input.value);
    input.value = "";
};

socket.on("message", (msg) => {
    console.log('Message:', msg);
    messages.innerHTML += `<li>${msg}</li>`;
});