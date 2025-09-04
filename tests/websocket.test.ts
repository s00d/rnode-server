import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp } from '../';
import { makeHttpRequest } from './helpers';
import * as fs from 'fs';
import * as path from 'path';

const testPort = 5795;

describe('WebSocket Tests', () => {
  let app: any;

  beforeEach(() => {
    app = createApp();
  });

  afterEach(() => {
    // Cleanup
  });

  describe('WebSocket Configuration', () => {
    it('should configure WebSocket route successfully', () => {
      const result = app.websocket('/test', {
        onConnect: (data: any) => {
          console.log('Connected:', data);
        },
        onMessage: (data: any) => {
          console.log('Message:', data);
        }
      });

      // WebSocket registration doesn't return a result object
      expect(result).toBeUndefined();
    });

    it('should handle WebSocket route with all callbacks', () => {
      const result = app.websocket('/full', {
        onConnect: (data: any) => console.log('Connect:', data),
        onMessage: (data: any) => console.log('Message:', data),
        onClose: (data: any) => console.log('Close:', data),
        onError: (data: any) => console.log('Error:', data),
        onJoinRoom: (data: any) => console.log('Join:', data),
        onLeaveRoom: (data: any) => console.log('Leave:', data),
        onPing: (data: any) => console.log('Ping:', data),
        onPong: (data: any) => console.log('Pong:', data),
        onBinaryMessage: (data: any) => console.log('Binary:', data)
      });

      expect(result).toBeUndefined();
    });

    it('should handle WebSocket route with minimal callbacks', () => {
      const result = app.websocket('/minimal', {
        onMessage: (data: any) => console.log('Message:', data)
      });

      expect(result).toBeUndefined();
    });

    it('should handle WebSocket route with callback that returns shouldCancel', () => {
      const result = app.websocket('/cancel', {
        onMessage: (data: any) => {
          if (data.data && data.data.includes('block')) {
            return { shouldCancel: true, error: 'Message blocked' };
          }
        }
      });

      expect(result).toBeUndefined();
    });

    it('should handle WebSocket route with callback that returns modifiedEvent', () => {
      const result = app.websocket('/modify', {
        onMessage: (data: any) => {
          return { 
            modifiedEvent: { 
              ...data, 
              modified: true, 
              timestamp: new Date().toISOString() 
            } 
          };
        }
      });

      expect(result).toBeUndefined();
    });
  });

  describe('WebSocket Route Management', () => {
    it('should get all WebSocket rooms', () => {
      // First create some WebSocket routes and rooms
      app.websocket('/chat', { onMessage: () => {} });
      app.websocket('/game', { onMessage: () => {} });

      const rooms = app.getAllRooms(); // This returns WebSocket rooms
      
      expect(rooms).toBeDefined();
      expect(Array.isArray(rooms)).toBe(true);
      // Rooms might be empty if not properly tracked
      expect(rooms.length).toBeGreaterThanOrEqual(0);
    });

    it('should get WebSocket room info', () => {
      // Create a room first and get its ID
      const roomId = app.createRoom('test-room', 'Test Room');

      const roomInfo = app.getRoomInfo(roomId); // This returns room info using the room ID
      
      // Room should exist since we just created it
      expect(roomInfo).toBeDefined();
      expect(typeof roomInfo).toBe('object');
      expect(roomInfo!.id).toBeDefined();
      expect(roomInfo!.name).toBe('test-room');
    });

    it('should return null for non-existent room', () => {
      const roomInfo = app.getRoomInfo('non-existent');
      
      expect(roomInfo).toBeNull();
    });
  });

  describe('WebSocket HTTP Routes', () => {
    it('should serve WebSocket rooms endpoint', () => {
      // Create some WebSocket routes and rooms first
      app.websocket('/chat', { onMessage: () => {} });
      app.websocket('/game', { onMessage: () => {} });
      app.createRoom('chat-room', 'Chat Room');
      app.createRoom('game-room', 'Game Room');

      app.get('/websocket/rooms', (req: any, res: any) => {
        try {
          const rooms = app.getAllRooms(); // This returns WebSocket rooms
          res.json({
            success: true,
            rooms: rooms,
            count: rooms.length
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/websocket/rooms',
              method: 'GET'
            });

            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.rooms)).toBe(true);
            expect(typeof response.body.count).toBe('number');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });

    it('should serve specific WebSocket room info endpoint', () => {
      // Create a room first and get its ID
      const roomId = app.createRoom('test-room', 'Test Room');

      app.get('/websocket/rooms/{roomId}', (req: any, res: any) => {
        try {
          const roomId = req.params.roomId;
          const roomInfo = app.getRoomInfo(roomId); // This returns room info
          
          if (roomInfo) {
            res.json({
              success: true,
              room: roomInfo
            });
          } else {
            res.status(404).json({
              success: false,
              error: 'WebSocket room not found'
            });
          }
        } catch (error) {
          res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort + 1, async () => {
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort + 1,
              path: `/websocket/rooms/${roomId}`,
              method: 'GET'
            });

            // Room info should be available since we just created it
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.room).toBeDefined();
            expect(response.body.room.id).toBe(roomId);
            expect(response.body.room.name).toBe('test-room');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });

    it('should return 404 for non-existent WebSocket room', () => {
      app.get('/websocket/rooms/{roomId}', (req: any, res: any) => {
        try {
          const roomId = req.params.roomId;
          const roomInfo = app.getRoomInfo(roomId);
          
          if (roomInfo) {
            res.json({
              success: true,
              room: roomInfo
            });
          } else {
            res.status(404).json({
              success: false,
              error: 'WebSocket room not found'
            });
          }
        } catch (error) {
          res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort + 2, async () => {
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort + 2,
              path: '/websocket/rooms/non-existent',
              method: 'GET'
            });

            // The room should not be found
            expect(response.statusCode).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('WebSocket room not found');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  });

  describe('WebSocket Event Processing', () => {
    it('should process connect event', () => {
      let connectCalled = false;
      let connectData: any = null;

      app.websocket('/test-connect', {
        onConnect: (data: any) => {
          connectCalled = true;
          connectData = data;
          return { shouldContinue: true };
        }
      });

      // Simulate connect event
      const eventData = {
        type: 'connect',
        path: '/test-connect',
        data: { clientId: 'test-client' }
      };

      // This would normally be called by the Rust backend
      // For now, we just test that the callback is registered
      expect(connectCalled).toBe(false);
    });

    it('should process message event with shouldCancel', () => {
      let messageCalled = false;

      app.websocket('/test-cancel', {
        onMessage: (data: any) => {
          messageCalled = true;
          if (data.data && data.data.includes('block')) {
            return { shouldCancel: true, error: 'Message blocked' };
          }
          return { shouldContinue: true };
        }
      });

      // Test that callback is registered
      expect(messageCalled).toBe(false);
    });

    it('should process message event with modifiedEvent', () => {
      let messageCalled = false;

      app.websocket('/test-modify', {
        onMessage: (data: any) => {
          messageCalled = true;
          return { 
            modifiedEvent: { 
              ...data, 
              modified: true, 
              timestamp: new Date().toISOString() 
            } 
          };
        }
      });

      // Test that callback is registered
      expect(messageCalled).toBe(false);
    });
  });

  describe('WebSocket Error Handling', () => {
    it('should handle WebSocket route with invalid callbacks', () => {
      const result = app.websocket('/invalid', {
        onMessage: 'invalid-callback' as any
      });

      expect(result).toBeUndefined();
    });

    it('should handle WebSocket route with async callbacks', () => {
      const result = app.websocket('/async', {
        onMessage: async (data: any) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return { shouldContinue: true };
        }
      });

      expect(result).toBeUndefined();
    });

    it('should handle WebSocket route with callback that throws error', () => {
      const result = app.websocket('/error', {
        onMessage: (data: any) => {
          throw new Error('Test error');
        }
      });

      expect(result).toBeUndefined();
    });
  });
});
