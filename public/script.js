document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.getElementById("startButton");

    startButton.addEventListener("click", () => {
        const playerNameInput = document.getElementById("playerName");
        const playerName = playerNameInput.value.trim();

        if (!playerName || playerName.trim() === '') {
            alert("Please enter a valid name before starting the game.");
            return;
        }

        // Store the player name in a cookie
        Cookies.set('playerName', playerName);

        // Redirect to the game page
        window.location.href = `game.html`;
    });
});
