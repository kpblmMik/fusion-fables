import { gameBeginnings } from "../../src/server.js";
import { startTestServer, stopTestServer } from "../helpers/testServer.js";
import {
    createTestClient,
    waitForEvent,
    disconnectClient,
    disconnectAllClients
} from "../helpers/socketClient.js";

describe("Game Flow Integration Tests", () => {
    let server;
    let clients = [];

    beforeAll(async () => {
        server = await startTestServer();
    });

    afterAll(async () => {
        await disconnectAllClients(clients);
        if (server) {
            await stopTestServer(server);
        }
    });

    afterEach(async () => {
        await disconnectAllClients(clients);
        clients = [];
        server.resetGameState();
        await new Promise(resolve => setTimeout(resolve, 50));
    });

    async function connectClients(count) {
        const newClients = [];
        for (let i = 0; i < count; i++) {
            const client = await createTestClient(server.port);
            newClients.push(client);
            await waitForEvent(client, "connectedClients");
        }
        clients.push(...newClients);
        return newClients;
    }

    describe("game start requirements", () => {
        it("cannot start with fewer than 3 players", async () => {
            const [client1, client2] = await connectClients(2);

            client1.emit("startGame");

            const alert = await waitForEvent(client1, "alert");
            expect(alert).toContain("Not enough players");
        });

        it("can start with exactly 3 players", async () => {
            await connectClients(3);

            clients[0].emit("startGame");

            // gameStart event has no payload, just wait for it
            await waitForEvent(clients[0], "gameStart");
            expect(server.getGameState().isInGame).toBe(true);
        });

        it("cannot start a second game while one is in progress", async () => {
            await connectClients(3);

            clients[0].emit("startGame");
            await waitForEvent(clients[0], "gameStart");

            clients[1].emit("startGame");

            const alert = await waitForEvent(clients[1], "alert");
            expect(alert).toContain("already in progress");
        });
    });

    describe("game start events", () => {
        it("emits random story prompt from gameBeginnings", async () => {
            await connectClients(3);

            const systemMessages = [];
            clients[0].on("systemMessage", (msg) => systemMessages.push(msg));

            clients[0].emit("startGame");
            await waitForEvent(clients[0], "gameStart");

            // Wait for system messages to arrive
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(systemMessages[0]).toBe("GAME STARTED!");
            expect(gameBeginnings).toContain(systemMessages[1]);
        });

        it("sets first player turn on game start", async () => {
            const [client1] = await connectClients(3);

            client1.emit("startGame");
            await waitForEvent(client1, "gameStart");

            const turn = await waitForEvent(client1, "turnUpdate");
            expect(turn).toBe(client1.id);
        });
    });

    describe("game finish", () => {
        it("emits THE END system message", async () => {
            await connectClients(3);

            clients[0].emit("startGame");
            await waitForEvent(clients[0], "gameStart");

            // Clear buffered system messages from game start
            if (clients[0]._initialEvents) {
                clients[0]._initialEvents.systemMessage = [];
            }

            const systemMessagePromise = waitForEvent(clients[0], "systemMessage");
            clients[0].emit("finishGame");

            const systemMessage = await systemMessagePromise;
            expect(systemMessage).toBe("THE END");
        });

        it("emits gameFinish to all clients", async () => {
            const [client1, client2, client3] = await connectClients(3);

            client1.emit("startGame");
            await waitForEvent(client1, "gameStart");

            const promises = [
                waitForEvent(client1, "gameFinish"),
                waitForEvent(client2, "gameFinish"),
                waitForEvent(client3, "gameFinish")
            ];

            client1.emit("finishGame");
            await Promise.all(promises);

            expect(server.getGameState().isInGame).toBe(false);
        });

        it("reveals all stored messages on finish", async () => {
            await connectClients(3);

            clients[0].emit("startGame");
            await waitForEvent(clients[0], "gameStart");
            await waitForEvent(clients[0], "turnUpdate");

            clients[0].emit("message", { playerName: "Player1", message: "First message" });
            await waitForEvent(clients[0], "message");

            clients[0].emit("endTurn");
            await waitForEvent(clients[0], "turnUpdate");

            clients[1].emit("message", { playerName: "Player2", message: "Second message" });
            await waitForEvent(clients[0], "message");

            const storedMessagesPromise = waitForEvent(clients[0], "displayStoredMessages");
            clients[0].emit("finishGame");
            const storedMessages = await storedMessagesPromise;

            expect(storedMessages.length).toBe(2);
            expect(storedMessages[0]).toEqual({ playerName: "Player1", message: "First message" });
            expect(storedMessages[1]).toEqual({ playerName: "Player2", message: "Second message" });
        });

        it("clears stored messages after finish", async () => {
            await connectClients(3);

            clients[0].emit("startGame");
            await waitForEvent(clients[0], "gameStart");

            clients[0].emit("message", { playerName: "Player1", message: "Test" });
            await waitForEvent(clients[0], "message");

            clients[0].emit("finishGame");
            await waitForEvent(clients[0], "gameFinish");

            const state = server.getGameState();
            expect(state.storedMessages.length).toBe(0);
        });
    });

    describe("state transitions", () => {
        it("transitions from not in game to in game on start", async () => {
            await connectClients(3);

            expect(server.getGameState().isInGame).toBe(false);

            clients[0].emit("startGame");
            await waitForEvent(clients[0], "gameStart");

            expect(server.getGameState().isInGame).toBe(true);
        });

        it("transitions from in game to not in game on finish", async () => {
            await connectClients(3);

            clients[0].emit("startGame");
            await waitForEvent(clients[0], "gameStart");

            expect(server.getGameState().isInGame).toBe(true);

            clients[0].emit("finishGame");
            await waitForEvent(clients[0], "gameFinish");

            expect(server.getGameState().isInGame).toBe(false);
        });

        it("can start a new game after previous game finished", async () => {
            await connectClients(3);

            clients[0].emit("startGame");
            await waitForEvent(clients[0], "gameStart");

            clients[0].emit("finishGame");
            await waitForEvent(clients[0], "gameFinish");

            // Clear buffered gameStart from first game
            if (clients[0]._initialEvents) {
                clients[0]._initialEvents.gameStart = [];
            }

            clients[0].emit("startGame");
            await waitForEvent(clients[0], "gameStart");

            expect(server.getGameState().isInGame).toBe(true);
        });
    });
});
