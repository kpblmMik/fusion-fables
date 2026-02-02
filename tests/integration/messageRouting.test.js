import { startTestServer, stopTestServer } from "../helpers/testServer.js";
import {
    createTestClient,
    waitForEvent,
    disconnectAllClients
} from "../helpers/socketClient.js";

describe("Message Routing Integration Tests", () => {
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

    describe("message broadcast", () => {
        it("broadcasts message to all connected clients", async () => {
            const [client1, client2, client3] = await connectClients(3);

            const promises = [
                waitForEvent(client1, "message"),
                waitForEvent(client2, "message"),
                waitForEvent(client3, "message")
            ];

            client1.emit("message", {
                playerName: "Alice",
                message: "Hello everyone!"
            });

            const [msg1, msg2, msg3] = await Promise.all(promises);

            expect(msg1.playerName).toBe("Alice");
            expect(msg2.playerName).toBe("Alice");
            expect(msg3.playerName).toBe("Alice");
            expect(msg1.message).toBe("Hello everyone!");
        });

        it("includes senderSocketId in broadcast", async () => {
            const [client1, client2] = await connectClients(2);

            const msgPromise = waitForEvent(client2, "message");
            client1.emit("message", { playerName: "Alice", message: "Test" });

            const msg = await msgPromise;
            expect(msg.senderSocketId).toBe(client1.id);
        });

        it("sender receives their own message", async () => {
            const [client1] = await connectClients(1);

            const msgPromise = waitForEvent(client1, "message");
            client1.emit("message", { playerName: "Alice", message: "Echo test" });

            const msg = await msgPromise;
            expect(msg.message).toBe("Echo test");
            expect(msg.senderSocketId).toBe(client1.id);
        });
    });

    describe("message storage during game", () => {
        it("stores messages during game", async () => {
            await connectClients(3);

            clients[0].emit("startGame");
            await waitForEvent(clients[0], "gameStart");

            clients[0].emit("message", { playerName: "Player1", message: "First story part" });
            await waitForEvent(clients[0], "message");

            const state = server.getGameState();
            expect(state.storedMessages.length).toBe(1);
            expect(state.storedMessages[0].playerName).toBe("Player1");
        });

        it("does not store messages when not in game", async () => {
            const [client1] = await connectClients(1);

            client1.emit("message", { playerName: "Alice", message: "Not in game" });
            await waitForEvent(client1, "message");

            const state = server.getGameState();
            expect(state.storedMessages.length).toBe(0);
        });
    });

    describe("message validation", () => {
        it("ignores messages with missing playerName", async () => {
            const [client1] = await connectClients(1);

            let messageReceived = false;
            client1.on("message", () => { messageReceived = true; });

            client1.emit("message", { message: "No name" });

            await new Promise(resolve => setTimeout(resolve, 200));
            expect(messageReceived).toBe(false);
        });

        it("ignores messages with missing message field", async () => {
            const [client1] = await connectClients(1);

            let messageReceived = false;
            client1.on("message", () => { messageReceived = true; });

            client1.emit("message", { playerName: "Alice" });

            await new Promise(resolve => setTimeout(resolve, 200));
            expect(messageReceived).toBe(false);
        });

        it("sanitizes and broadcasts valid messages", async () => {
            const [client1, client2] = await connectClients(2);

            const msgPromise = waitForEvent(client2, "message");
            client1.emit("message", { playerName: "  Alice  ", message: "  Hello  " });

            const msg = await msgPromise;
            expect(msg.playerName).toBe("Alice");
            expect(msg.message).toBe("Hello");
        });

        it("truncates long playerName", async () => {
            const [client1, client2] = await connectClients(2);

            const longName = "A".repeat(100);
            const msgPromise = waitForEvent(client2, "message");
            client1.emit("message", { playerName: longName, message: "Test" });

            const msg = await msgPromise;
            expect(msg.playerName.length).toBe(50);
        });

        it("truncates long message", async () => {
            const [client1, client2] = await connectClients(2);

            const longMessage = "B".repeat(1000);
            const msgPromise = waitForEvent(client2, "message");
            client1.emit("message", { playerName: "Alice", message: longMessage });

            const msg = await msgPromise;
            expect(msg.message.length).toBe(500);
        });
    });

    describe("stored messages on game finish", () => {
        it("emits displayStoredMessages with all game messages", async () => {
            await connectClients(3);

            clients[0].emit("startGame");
            await waitForEvent(clients[0], "gameStart");
            await waitForEvent(clients[0], "turnUpdate");

            // Clear message buffer
            if (clients[0]._initialEvents) clients[0]._initialEvents.message = [];

            const msg1Promise = waitForEvent(clients[0], "message");
            clients[0].emit("message", { playerName: "P1", message: "One" });
            await msg1Promise;

            clients[0].emit("endTurn");
            await waitForEvent(clients[0], "turnUpdate");

            const msg2Promise = waitForEvent(clients[0], "message");
            clients[1].emit("message", { playerName: "P2", message: "Two" });
            await msg2Promise;

            const storedMessagesPromise = waitForEvent(clients[0], "displayStoredMessages");
            clients[0].emit("finishGame");
            const storedMessages = await storedMessagesPromise;

            expect(storedMessages).toEqual([
                { playerName: "P1", message: "One" },
                { playerName: "P2", message: "Two" }
            ]);
        });
    });

    describe("system messages", () => {
        it("broadcasts system message to all clients on game start", async () => {
            const [client1, client2, client3] = await connectClients(3);

            const promises = [
                waitForEvent(client1, "systemMessage"),
                waitForEvent(client2, "systemMessage"),
                waitForEvent(client3, "systemMessage")
            ];

            client1.emit("startGame");
            const [msg1, msg2, msg3] = await Promise.all(promises);

            expect(msg1).toBe("GAME STARTED!");
            expect(msg2).toBe("GAME STARTED!");
            expect(msg3).toBe("GAME STARTED!");
        });
    });
});
