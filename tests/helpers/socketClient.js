import { io } from "socket.io-client";

/**
 * Create a test socket client connected to the server
 * @param {number} port - Server port to connect to
 * @param {object} options - Socket.IO client options
 * @returns {Promise<Socket>} Connected socket client
 */
export function createTestClient(port, options = {}) {
    return new Promise((resolve, reject) => {
        const socket = io(`http://localhost:${port}`, {
            forceNew: true,
            transports: ["polling", "websocket"],
            reconnection: false,
            timeout: 5000,
            ...options
        });

        const timeout = setTimeout(() => {
            socket.disconnect();
            reject(new Error("Connection timeout"));
        }, 8000);

        // Store initial connection events
        socket._initialEvents = {
            playerCount: [],
            connectedClients: []
        };

        const capturePlayerCount = (data) => {
            socket._initialEvents.playerCount.push(data);
        };
        const captureConnectedClients = (data) => {
            socket._initialEvents.connectedClients.push(data);
        };

        socket.on("playerCount", capturePlayerCount);
        socket.on("connectedClients", captureConnectedClients);

        socket.on("connect", () => {
            clearTimeout(timeout);
            // Small delay to allow initial events to arrive
            setTimeout(() => {
                // Stop capturing after initial events
                socket.off("playerCount", capturePlayerCount);
                socket.off("connectedClients", captureConnectedClients);
                resolve(socket);
            }, 50);
        });

        socket.on("connect_error", (err) => {
            clearTimeout(timeout);
            reject(err);
        });
    });
}

/**
 * Wait for a specific event on a socket
 * @param {Socket} socket - Socket client
 * @param {string} event - Event name to wait for
 * @param {number} timeout - Timeout in ms (default: 5000)
 * @returns {Promise<any>} Event data
 */
export function waitForEvent(socket, event, timeout = 5000) {
    return new Promise((resolve, reject) => {
        // Check buffer only for connection events
        if ((event === "playerCount" || event === "connectedClients") &&
            socket._initialEvents &&
            socket._initialEvents[event]?.length > 0) {
            const data = socket._initialEvents[event].shift();
            resolve(data);
            return;
        }

        const timer = setTimeout(() => {
            reject(new Error(`Timeout waiting for event: ${event}`));
        }, timeout);

        socket.once(event, (data) => {
            clearTimeout(timer);
            resolve(data);
        });
    });
}

/**
 * Wait for multiple events to occur
 * @param {Socket} socket - Socket client
 * @param {string[]} events - Array of event names
 * @param {number} timeout - Timeout in ms (default: 5000)
 * @returns {Promise<object>} Object mapping event names to received data
 */
export function waitForEvents(socket, events, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const results = {};
        let remaining = events.length;

        const timer = setTimeout(() => {
            reject(new Error(`Timeout waiting for events: ${events.filter(e => !(e in results)).join(", ")}`));
        }, timeout);

        events.forEach((event) => {
            socket.once(event, (data) => {
                results[event] = data;
                remaining--;
                if (remaining === 0) {
                    clearTimeout(timer);
                    resolve(results);
                }
            });
        });
    });
}

/**
 * Collect all events of a specific type within a time window
 * @param {Socket} socket - Socket client
 * @param {string} event - Event name to collect
 * @param {number} duration - Duration to collect events in ms
 * @returns {Promise<any[]>} Array of collected event data
 */
export function collectEvents(socket, event, duration = 1000) {
    return new Promise((resolve) => {
        const collected = [];

        const handler = (data) => {
            collected.push(data);
        };

        socket.on(event, handler);

        setTimeout(() => {
            socket.off(event, handler);
            resolve(collected);
        }, duration);
    });
}

/**
 * Disconnect a socket client safely
 * @param {Socket} socket - Socket client to disconnect
 * @returns {Promise<void>}
 */
export function disconnectClient(socket) {
    return new Promise((resolve) => {
        if (!socket || !socket.connected) {
            resolve();
            return;
        }

        let resolved = false;
        const done = () => {
            if (!resolved) {
                resolved = true;
                resolve();
            }
        };

        socket.once("disconnect", done);
        socket.disconnect();

        // Fallback timeout in case disconnect event doesn't fire
        setTimeout(done, 200);
    });
}

/**
 * Disconnect multiple socket clients
 * @param {Socket[]} sockets - Array of socket clients
 * @returns {Promise<void>}
 */
export async function disconnectAllClients(sockets) {
    await Promise.all(sockets.map(socket => disconnectClient(socket)));
}
