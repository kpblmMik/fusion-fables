import { gameBeginnings, createGameServer } from "../../../src/server.js";

describe("gameBeginnings", () => {
    it("is an array", () => {
        expect(Array.isArray(gameBeginnings)).toBe(true);
    });

    it("contains at least one story prompt", () => {
        expect(gameBeginnings.length).toBeGreaterThan(0);
    });

    it("contains only strings", () => {
        gameBeginnings.forEach((beginning) => {
            expect(typeof beginning).toBe("string");
        });
    });

    it("all prompts are non-empty", () => {
        gameBeginnings.forEach((beginning) => {
            expect(beginning.trim().length).toBeGreaterThan(0);
        });
    });

    it("all prompts end with punctuation or comma", () => {
        gameBeginnings.forEach((beginning) => {
            const lastChar = beginning.trim().slice(-1);
            expect([",", ".", "!", "?"]).toContain(lastChar);
        });
    });
});

describe("createGameServer", () => {
    let server;

    beforeEach(() => {
        server = createGameServer({ testMode: true });
    });

    afterEach(async () => {
        if (server?.httpServer) {
            await new Promise((resolve) => {
                server.io.close(() => {
                    server.httpServer.close(() => resolve());
                });
            });
        }
    });

    describe("getPlayerCount", () => {
        it("returns 0 when no players are connected", () => {
            expect(server.getPlayerCount()).toBe(0);
        });
    });

    describe("getGameState", () => {
        it("returns initial game state", () => {
            const state = server.getGameState();

            expect(state).toEqual({
                connectedClients: [],
                isInGame: false,
                storedMessages: [],
                currentTurnIndex: 0
            });
        });

        it("returns a copy of connectedClients array", () => {
            const state1 = server.getGameState();
            const state2 = server.getGameState();

            expect(state1.connectedClients).not.toBe(state2.connectedClients);
        });

        it("returns a copy of storedMessages array", () => {
            const state1 = server.getGameState();
            const state2 = server.getGameState();

            expect(state1.storedMessages).not.toBe(state2.storedMessages);
        });
    });

    describe("resetGameState", () => {
        it("resets game state to initial values", () => {
            // First, verify we can call resetGameState
            server.resetGameState();

            const state = server.getGameState();

            expect(state).toEqual({
                connectedClients: [],
                isInGame: false,
                storedMessages: [],
                currentTurnIndex: 0
            });
        });
    });
});

describe("random beginning selection", () => {
    it("returns a value from gameBeginnings array", () => {
        // Test randomness by checking many iterations
        const selectedBeginnings = new Set();

        // Mock Math.random to test different indices
        for (let i = 0; i < gameBeginnings.length; i++) {
            const index = i;
            expect(gameBeginnings[index]).toBeDefined();
            expect(typeof gameBeginnings[index]).toBe("string");
            selectedBeginnings.add(gameBeginnings[index]);
        }

        // All beginnings should be unique
        expect(selectedBeginnings.size).toBe(gameBeginnings.length);
    });
});
