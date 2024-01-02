document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.getElementById("startButton");

    startButton.addEventListener("click", () => {
        // Get the player name from the input field
        const playerNameInput = document.getElementById("playerName");
        const playerName = playerNameInput.value.trim();

        // Validate the player name
        if (!playerName || playerName.trim() === '') {
            alert("Please enter a valid name before starting the game.");
            return;
        }

        // Redirect to the game page with the player name as a query parameter
        window.open(`game.html?name=${encodeURIComponent(playerName)}`, "_blank");
    });
});
