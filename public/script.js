document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.getElementById("startButton");
    const playerNameInput = document.getElementById("playerName");

    function startGame() {
        const playerName = playerNameInput.value.trim();

        if (!playerName) {
            alert("Please enter a valid name before starting the game.");
            return;
        }

        // Store the player name in a cookie with security options
        Cookies.set('playerName', playerName, { sameSite: 'Strict' });

        // Redirect to the game page
        window.location.href = "game.html";
    }

    startButton.addEventListener("click", startGame);

    // Allow Enter key to start the game
    playerNameInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            startGame();
        }
    });
});
