import { startTestServer, stopTestServer } from "../helpers/testServer.js";
import {
    createTestClient,
    waitForEvent,
    disconnectClient,
    disconnectAllClients
} from "../helpers/socketClient.js";

describe("Connection Integration Tests", () => {
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
        // Disconnect all clients after each test
        await disconnectAllClients(clients);
        clients = [];
        // Reset server game state
        server.resetGameState();
        // Small delay for cleanup
        await new Promise(resolve => setTimeout(resolve, 50));
    });

    describe("playerCount updates", () => {
        it("emits playerCount of 1 when first client connects", async () => {
            const client = await createTestClient(server.port);
            clients.push(client);

            const count = await waitForEvent(client, "playerCount");
            expect(count).toBe(1);
        });

        it("increments playerCount when additional clients connect", async () => {
            const client1 = await createTestClient(server.port);
            clients.push(client1);
            await waitForEvent(client1, "playerCount");

            const client2 = await createTestClient(server.port);
            clients.push(client2);

            const count = await waitForEvent(client1, "playerCount");
            expect(count).toBe(2);
        });

        it("decrements playerCount when client disconnects", async () => {
            const client1 = await createTestClient(server.port);
            const client2 = await createTestClient(server.port);
            clients.push(client1, client2);

            await waitForEvent(client1, "connectedClients");
            await waitForEvent(client2, "connectedClients");

            // Disconnect client2
            await disconnectClient(client2);
            clients = clients.filter(c => c !== client2);

            const count = await waitForEvent(client1, "playerCount");
            expect(count).toBe(1);
        });
    });

    describe("connectedClients array", () => {
        it("includes socket ID on connect", async () => {
            const client = await createTestClient(server.port);
            clients.push(client);

            const connectedClients = await waitForEvent(client, "connectedClients");

            expect(connectedClients).toContain(client.id);
            expect(connectedClients.length).toBe(1);
        });

        it("includes all connected socket IDs", async () => {
            const client1 = await createTestClient(server.port);
            clients.push(client1);
            await waitForEvent(client1, "connectedClients");

            const client2 = await createTestClient(server.port);
            clients.push(client2);

            const connectedClients = await waitForEvent(client1, "connectedClients");

            expect(connectedClients).toContain(client1.id);
            expect(connectedClients).toContain(client2.id);
            expect(connectedClients.length).toBe(2);
        });

        it("removes socket ID on disconnect", async () => {
            const client1 = await createTestClient(server.port);
            const client2 = await createTestClient(server.port);
            clients.push(client1, client2);

            // Consume initial events
            await waitForEvent(client1, "connectedClients");
            await waitForEvent(client2, "connectedClients");
            // Clear any buffered events on client1
            if (client1._initialEvents) {
                client1._initialEvents.connectedClients = [];
            }

            const client2Id = client2.id;

            await disconnectClient(client2);
            clients = clients.filter(c => c !== client2);

            const connectedClients = await waitForEvent(client1, "connectedClients");

            expect(connectedClients).not.toContain(client2Id);
            expect(connectedClients).toContain(client1.id);
            expect(connectedClients.length).toBe(1);
        });
    });

    describe("game disconnect handling", () => {
        it("ends game when fewer than 2 players remain during game", async () => {
            const client1 = await createTestClient(server.port);
            const client2 = await createTestClient(server.port);
            const client3 = await createTestClient(server.port);
            clients.push(client1, client2, client3);

            await waitForEvent(client3, "connectedClients");

            client1.emit("startGame");
            await waitForEvent(client1, "gameStart");

            // Set up listener before disconnecting
            const gameFinishPromise = waitForEvent(client1, "gameFinish");

            // Disconnect two players
            await disconnectClient(client2);
            await disconnectClient(client3);
            clients = [client1];

            await gameFinishPromise;

            const state = server.getGameState();
            expect(state.isInGame).toBe(false);
        });
    });
});
