/**
 * @jest-environment jsdom
 */

// Recreate the masking logic from gamescript.js for testing
function shouldMaskMessage(options) {
    const {
        senderSocketId,
        currentSocketId,
        isInGame,
        connectedClients,
        playerIndex
    } = options;

    // Own messages are never masked
    if (senderSocketId === currentSocketId) {
        return { masked: false, reason: "own_message" };
    }

    // Not in game - no masking
    if (!isInGame) {
        return { masked: false, reason: "not_in_game" };
    }

    // In game - check if sender is previous player
    const previousPlayerIndex = (playerIndex - 1 + connectedClients.length) % connectedClients.length;
    const isFromPreviousPlayer = senderSocketId === connectedClients[previousPlayerIndex];

    if (isFromPreviousPlayer) {
        return { masked: false, reason: "previous_player" };
    }

    // Mask messages from other players
    return { masked: true, reason: "other_player" };
}

function maskMessage(message) {
    return "*".repeat(message.length);
}

describe("Message Masking Logic", () => {
    const mockClients = ["socket1", "socket2", "socket3", "socket4"];

    describe("own messages", () => {
        it("never masks own messages when in game", () => {
            const result = shouldMaskMessage({
                senderSocketId: "socket1",
                currentSocketId: "socket1",
                isInGame: true,
                connectedClients: mockClients,
                playerIndex: 0
            });

            expect(result.masked).toBe(false);
            expect(result.reason).toBe("own_message");
        });

        it("never masks own messages when not in game", () => {
            const result = shouldMaskMessage({
                senderSocketId: "socket1",
                currentSocketId: "socket1",
                isInGame: false,
                connectedClients: mockClients,
                playerIndex: 0
            });

            expect(result.masked).toBe(false);
            expect(result.reason).toBe("own_message");
        });
    });

    describe("previous player messages", () => {
        it("does not mask messages from previous player", () => {
            // Player at index 1 receiving from player at index 0
            const result = shouldMaskMessage({
                senderSocketId: "socket1",
                currentSocketId: "socket2",
                isInGame: true,
                connectedClients: mockClients,
                playerIndex: 1
            });

            expect(result.masked).toBe(false);
            expect(result.reason).toBe("previous_player");
        });

        it("wraps around for first player seeing last player", () => {
            // Player at index 0 receiving from player at index 3 (last)
            const result = shouldMaskMessage({
                senderSocketId: "socket4",
                currentSocketId: "socket1",
                isInGame: true,
                connectedClients: mockClients,
                playerIndex: 0
            });

            expect(result.masked).toBe(false);
            expect(result.reason).toBe("previous_player");
        });

        it("works with two players", () => {
            const twoClients = ["socket1", "socket2"];

            // Player 2 seeing player 1's message
            const result = shouldMaskMessage({
                senderSocketId: "socket1",
                currentSocketId: "socket2",
                isInGame: true,
                connectedClients: twoClients,
                playerIndex: 1
            });

            expect(result.masked).toBe(false);
            expect(result.reason).toBe("previous_player");
        });
    });

    describe("other players messages during game", () => {
        it("masks messages from players two steps back", () => {
            // Player at index 2 receiving from player at index 0
            const result = shouldMaskMessage({
                senderSocketId: "socket1",
                currentSocketId: "socket3",
                isInGame: true,
                connectedClients: mockClients,
                playerIndex: 2
            });

            expect(result.masked).toBe(true);
            expect(result.reason).toBe("other_player");
        });

        it("masks messages from players ahead", () => {
            // Player at index 0 receiving from player at index 2
            const result = shouldMaskMessage({
                senderSocketId: "socket3",
                currentSocketId: "socket1",
                isInGame: true,
                connectedClients: mockClients,
                playerIndex: 0
            });

            expect(result.masked).toBe(true);
            expect(result.reason).toBe("other_player");
        });

        it("masks messages from non-adjacent players", () => {
            // Player at index 1 receiving from player at index 3
            const result = shouldMaskMessage({
                senderSocketId: "socket4",
                currentSocketId: "socket2",
                isInGame: true,
                connectedClients: mockClients,
                playerIndex: 1
            });

            expect(result.masked).toBe(true);
            expect(result.reason).toBe("other_player");
        });
    });

    describe("when not in game", () => {
        it("does not mask any messages", () => {
            // Any player receiving any other player's message
            const result = shouldMaskMessage({
                senderSocketId: "socket3",
                currentSocketId: "socket1",
                isInGame: false,
                connectedClients: mockClients,
                playerIndex: 0
            });

            expect(result.masked).toBe(false);
            expect(result.reason).toBe("not_in_game");
        });

        it("does not mask non-adjacent player messages when not in game", () => {
            const result = shouldMaskMessage({
                senderSocketId: "socket4",
                currentSocketId: "socket1",
                isInGame: false,
                connectedClients: mockClients,
                playerIndex: 0
            });

            expect(result.masked).toBe(false);
            expect(result.reason).toBe("not_in_game");
        });
    });
});

describe("maskMessage function", () => {
    it("replaces all characters with asterisks", () => {
        const result = maskMessage("Hello");
        expect(result).toBe("*****");
    });

    it("preserves message length", () => {
        const message = "This is a longer message!";
        const result = maskMessage(message);
        expect(result.length).toBe(message.length);
    });

    it("handles empty string", () => {
        const result = maskMessage("");
        expect(result).toBe("");
    });

    it("handles single character", () => {
        const result = maskMessage("A");
        expect(result).toBe("*");
    });

    it("handles spaces", () => {
        const result = maskMessage("Hello World");
        expect(result).toBe("***********");
    });

    it("handles special characters", () => {
        const result = maskMessage("Hello! @#$%");
        expect(result).toBe("***********");
    });

    it("handles unicode characters", () => {
        const result = maskMessage("Hello 世界");
        // Unicode characters are each replaced by one asterisk
        expect(result.length).toBe("Hello 世界".length);
        expect(result).toMatch(/^\*+$/);
    });

    it("handles newlines", () => {
        const result = maskMessage("Line1\nLine2");
        expect(result.length).toBe("Line1\nLine2".length);
    });
});

describe("Integration: masking flow", () => {
    const clients = ["player1", "player2", "player3"];

    function processMessage(message, senderIndex, viewerIndex, isInGame) {
        const maskResult = shouldMaskMessage({
            senderSocketId: clients[senderIndex],
            currentSocketId: clients[viewerIndex],
            isInGame,
            connectedClients: clients,
            playerIndex: viewerIndex
        });

        if (maskResult.masked) {
            return maskMessage(message);
        }
        return message;
    }

    it("player sees their own message unmasked", () => {
        const result = processMessage("My message", 0, 0, true);
        expect(result).toBe("My message");
    });

    it("player sees previous player message unmasked", () => {
        const result = processMessage("Previous message", 0, 1, true);
        expect(result).toBe("Previous message");
    });

    it("player sees other player message masked", () => {
        const result = processMessage("Secret message", 0, 2, true);
        expect(result).toBe("**************");
    });

    it("all messages visible when not in game", () => {
        const results = [
            processMessage("Message 1", 0, 1, false),
            processMessage("Message 2", 0, 2, false),
            processMessage("Message 3", 1, 0, false)
        ];

        expect(results).toEqual(["Message 1", "Message 2", "Message 3"]);
    });

    it("circular visibility in game", () => {
        // Player 0 can see player 2's messages (previous in circular order)
        const result = processMessage("From last player", 2, 0, true);
        expect(result).toBe("From last player");
    });
});
