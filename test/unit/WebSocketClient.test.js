/**
 * WebSocketClient Unit Tests
 * Covers heartbeat frame handling in _handleMessage: the server-initiated
 * {type:'ping', ts} frame (django-mojo >= 1.32) is answered at once with
 * {type:'pong', ts}, counts as proof of life, and never reaches 'message'
 * listeners; the existing 'pong' absorption and ordinary messages are kept.
 *
 * WebSocketClient.js imports EventEmitter via the @core alias, so it is
 * loaded through the simple-module-loader transform with the real
 * EventEmitter installed first. No real WebSocket is opened: each test
 * attaches a fake socket and marks the client connected.
 */
module.exports = async function(testContext) {
    const { describe, it, expect } = testContext;
    const path = require('path');
    const { moduleLoader, loadModule } = require('../utils/simple-module-loader');

    loadModule('EventEmitter');
    const WebSocketClient = moduleLoader.loadModuleFromFile(
        path.join(__dirname, '../../src/core/services/WebSocketClient.js'),
        'WebSocketClient'
    );

    function connectedClient() {
        const client = new WebSocketClient({ url: 'ws://localhost/ws/realtime/' });
        const sent = [];
        client.socket = { send: (message) => sent.push(message), close: () => {} };
        client.isConnected = true;
        const emitted = [];
        client.on('message', (data) => emitted.push(['message', data]));
        client.on('message:ping', (data) => emitted.push(['message:ping', data]));
        client.on('message:pong', (data) => emitted.push(['message:pong', data]));
        client.on('message:notice', (data) => emitted.push(['message:notice', data]));
        return { client, sent, emitted };
    }

    function frame(data) {
        return { data: JSON.stringify(data) };
    }

    describe('WebSocketClient heartbeat frames', () => {
        it('answers a server ping with a pong echoing ts', () => {
            const { client, sent } = connectedClient();
            client._handleMessage(frame({ type: 'ping', ts: 1759400000 }));
            expect(sent.map((m) => JSON.parse(m))).toEqual([{ type: 'pong', ts: 1759400000 }]);
            client.destroy();
        });

        it('treats a server ping as proof of life by clearing the pending pong timeout', () => {
            const { client } = connectedClient();
            client._startPongTimeout();
            expect(client.pongTimer !== null).toBe(true);
            client._handleMessage(frame({ type: 'ping', ts: 1 }));
            expect(client.pongTimer).toBeNull();
            client.destroy();
        });

        it('never emits a server ping to message listeners', () => {
            const { client, emitted } = connectedClient();
            client._handleMessage(frame({ type: 'ping', ts: 2 }));
            expect(emitted).toEqual([]);
            client.destroy();
        });

        it('does not throw when a ping arrives after the socket dropped', () => {
            const { client, sent } = connectedClient();
            client.isConnected = false;
            client._handleMessage(frame({ type: 'ping', ts: 3 }));
            expect(sent).toEqual([]);
            client.destroy();
        });

        it('still absorbs a pong without replying or emitting', () => {
            const { client, sent, emitted } = connectedClient();
            client._startPongTimeout();
            client._handleMessage(frame({ type: 'pong' }));
            expect(client.pongTimer).toBeNull();
            expect(sent).toEqual([]);
            expect(emitted).toEqual([]);
            client.destroy();
        });

        it('still emits ordinary typed messages', () => {
            const { client, sent, emitted } = connectedClient();
            client._handleMessage(frame({ type: 'notice', text: 'hi' }));
            expect(sent).toEqual([]);
            expect(emitted).toEqual([
                ['message:notice', { type: 'notice', text: 'hi' }],
                ['message', { type: 'notice', text: 'hi' }]
            ]);
            client.destroy();
        });
    });
};
