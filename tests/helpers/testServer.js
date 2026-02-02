import { createGameServer } from "../../src/server.js";

/**
 * Start a test server on a specified port
 * @param {number} port - Port to listen on (default: 0 for random available port)
 * @returns {Promise<object>} Server instance with control methods
 */
export function startTestServer(port = 0) {
    return new Promise((resolve, reject) => {
        const server = createGameServer({ testMode: true });

        const onError = (err) => {
            reject(err);
        };

        server.httpServer.once("error", onError);

        server.httpServer.listen(port, () => {
            server.httpServer.removeListener("error", onError);
            const address = server.httpServer.address();
            const actualPort = address.port;

            resolve({
                ...server,
                port: actualPort,
                url: `http://localhost:${actualPort}`,
                close: () => stopTestServer(server)
            });
        });
    });
}

/**
 * Stop a test server
 * @param {object} server - Server instance returned by startTestServer
 * @returns {Promise<void>}
 */
export function stopTestServer(server) {
    return new Promise((resolve) => {
        if (!server) {
            resolve();
            return;
        }

        try {
            // Force disconnect all sockets
            const sockets = server.io.sockets.sockets;
            sockets.forEach((socket) => {
                socket.disconnect(true);
            });
        } catch (e) {
            // Ignore errors during cleanup
        }

        // Use a single cleanup sequence with timeout
        const cleanup = () => {
            try {
                server.io.close();
            } catch (e) {
                // Ignore
            }

            try {
                server.httpServer.closeAllConnections?.();
                server.httpServer.close();
            } catch (e) {
                // Ignore
            }

            resolve();
        };

        // Give sockets time to disconnect, then cleanup
        setTimeout(cleanup, 50);
    });
}

/**
 * Create a test server that automatically cleans up after the test
 * Use with Jest's beforeEach/afterEach hooks
 * @returns {object} Object with setup and teardown methods
 */
export function createTestServerFixture() {
    let server = null;

    return {
        async setup(port = 0) {
            server = await startTestServer(port);
            return server;
        },

        async teardown() {
            if (server) {
                await stopTestServer(server);
                server = null;
            }
        },

        getServer() {
            return server;
        }
    };
}
