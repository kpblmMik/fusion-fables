import { startTestServer, stopTestServer } from "../helpers/testServer.js";
import {
    createTestClient,
    waitForEvent,
    disconnectClient,
    disconnectAllClients
} from "../helpers/socketClient.js";

describe("Turn Rotation Integration Tests", () => {
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

    describe("turn increment", () => {
        it("increments turn to next player when endTurn is emitted", async () => {
            const [client1, client2, client3] = await connectClients(3);

            client1.emit("startGame");
            await waitForEvent(client1, "gameStart");

            const firstTurn = await waitForEvent(client1, "turnUpdate");
            expect(firstTurn).toBe(client1.id);

            client1.emit("endTurn");
            const secondTurn = await waitForEvent(client1, "turnUpdate");
            expect(secondTurn).toBe(client2.id);
        });

        it("continues incrementing through all players", async () => {
            const [client1, client2, client3] = await connectClients(3);

            client1.emit("startGame");
            await waitForEvent(client1, "gameStart");

            // Get current state to verify turn order
            const state = server.getGameState();
            const expectedOrder = [
                state.connectedClients[0],
                state.connectedClients[1],
                state.connectedClients[2]
            ];

            const turn1 = await waitForEvent(client1, "turnUpdate");
            expect(turn1).toBe(expectedOrder[0]);

            client1.emit("endTurn");
            const turn2 = await waitForEvent(client1, "turnUpdate");
            expect(turn2).toBe(expectedOrder[1]);

            client1.emit("endTurn");
            const turn3 = await waitForEvent(client1, "turnUpdate");
            expect(turn3).toBe(expectedOrder[2]);
        });
    });

    describe("wrap-around", () => {
        it("wraps from last player back to first", async () => {
            const [client1, client2, client3] = await connectClients(3);

            client1.emit("startGame");
            await waitForEvent(client1, "gameStart");

            const state = server.getGameState();
            const firstPlayerId = state.connectedClients[0];

            await waitForEvent(client1, "turnUpdate"); // 1st
            client1.emit("endTurn");
            await waitForEvent(client1, "turnUpdate"); // 2nd
            client1.emit("endTurn");
            await waitForEvent(client1, "turnUpdate"); // 3rd
            client1.emit("endTurn");

            const wrappedTurn = await waitForEvent(client1, "turnUpdate"); // 4th (wrap)
            expect(wrappedTurn).toBe(firstPlayerId);
        });
    });

    describe("disconnect handling", () => {
        it("adjusts turn when player before current turn disconnects", async () => {
            const [client1, client2, client3] = await connectClients(3);

            client1.emit("startGame");
            await waitForEvent(client1, "gameStart");

            await waitForEvent(client2, "turnUpdate"); // client1's turn
            client1.emit("endTurn");
            await waitForEvent(client2, "turnUpdate"); // client2's turn

            // Clear buffer before disconnect
            if (client2._initialEvents) {
                client2._initialEvents.turnUpdate = [];
            }

            await disconnectClient(client1);
            clients = clients.filter(c => c !== client1);

            const adjustedTurn = await waitForEvent(client2, "turnUpdate");
            expect(adjustedTurn).toBe(client2.id);
        });

        it("ends game when fewer than 2 players remain", async () => {
            const [client1, client2, client3] = await connectClients(3);

            client1.emit("startGame");
            await waitForEvent(client1, "gameStart");

            const gameFinishPromise = waitForEvent(client1, "gameFinish");

            await disconnectClient(client2);
            await disconnectClient(client3);
            clients = [client1];

            await gameFinishPromise;

            const state = server.getGameState();
            expect(state.isInGame).toBe(false);
        });
    });

    describe("turn during non-game state", () => {
        it("does not change turn when not in game", async () => {
            await connectClients(3);

            const initialState = server.getGameState();
            expect(initialState.isInGame).toBe(false);

            clients[0].emit("endTurn");
            await new Promise(resolve => setTimeout(resolve, 100));

            const state = server.getGameState();
            expect(state.currentTurnIndex).toBe(0);
        });
    });
});
