import { startTestServer, stopTestServer } from "../helpers/testServer.js";
import {
    createTestClient,
    waitForEvent,
    disconnectClient,
    disconnectAllClients
} from "../helpers/socketClient.js";

describe("Turn Management Integration Tests", () => {
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

    describe("turn broadcast", () => {
        it("broadcasts turnUpdate to all clients", async () => {
            const [client1, client2, client3] = await connectClients(3);

            client1.emit("startGame");
            await waitForEvent(client1, "gameStart");

            const [turn1, turn2, turn3] = await Promise.all([
                waitForEvent(client1, "turnUpdate"),
                waitForEvent(client2, "turnUpdate"),
                waitForEvent(client3, "turnUpdate")
            ]);

            expect(turn1).toBe(turn2);
            expect(turn2).toBe(turn3);
            expect(turn1).toBe(client1.id);
        });

        it("all clients receive consistent turn updates after rotation", async () => {
            const [client1, client2, client3] = await connectClients(3);

            client1.emit("startGame");
            await waitForEvent(client1, "gameStart");

            // Consume initial turn updates
            await waitForEvent(client1, "turnUpdate");
            await waitForEvent(client2, "turnUpdate");
            await waitForEvent(client3, "turnUpdate");

            // Clear any remaining buffered turnUpdate events
            [client1, client2, client3].forEach(c => {
                if (c._initialEvents) c._initialEvents.turnUpdate = [];
            });

            client1.emit("endTurn");

            const [t1, t2, t3] = await Promise.all([
                waitForEvent(client1, "turnUpdate"),
                waitForEvent(client2, "turnUpdate"),
                waitForEvent(client3, "turnUpdate")
            ]);

            expect(t1).toBe(t2);
            expect(t2).toBe(t3);
            expect(t1).toBe(client2.id);
        });
    });

    describe("turn state consistency", () => {
        it("currentTurnIndex stays within bounds after rotations", async () => {
            const [client1] = await connectClients(3);

            client1.emit("startGame");
            await waitForEvent(client1, "gameStart");

            for (let i = 0; i < 5; i++) {
                await waitForEvent(client1, "turnUpdate");
                const state = server.getGameState();
                expect(state.currentTurnIndex).toBeGreaterThanOrEqual(0);
                expect(state.currentTurnIndex).toBeLessThan(state.connectedClients.length);
                client1.emit("endTurn");
            }
        });

        it("turn is always a valid connected client", async () => {
            const [client1] = await connectClients(3);

            client1.emit("startGame");
            await waitForEvent(client1, "gameStart");

            for (let i = 0; i < 4; i++) {
                const turn = await waitForEvent(client1, "turnUpdate");
                const state = server.getGameState();
                expect(state.connectedClients).toContain(turn);
                client1.emit("endTurn");
            }
        });
    });

    describe("turn behavior when not in game", () => {
        it("ignores endTurn when not in game", async () => {
            await connectClients(3);

            clients[0].emit("endTurn");
            await new Promise(resolve => setTimeout(resolve, 100));

            const state = server.getGameState();
            expect(state.isInGame).toBe(false);
            expect(state.currentTurnIndex).toBe(0);
        });

        it("does not emit turnUpdate when not in game", async () => {
            const [client1] = await connectClients(3);

            // Clear any buffered turnUpdate events
            if (client1._initialEvents) {
                client1._initialEvents.turnUpdate = [];
            }

            let turnUpdateReceived = false;
            client1.on("turnUpdate", () => {
                turnUpdateReceived = true;
            });

            client1.emit("endTurn");
            await new Promise(resolve => setTimeout(resolve, 200));

            expect(turnUpdateReceived).toBe(false);
        });
    });
});
