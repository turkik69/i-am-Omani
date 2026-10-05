'use strict';

module.exports = function installHostOwnerGuard(io) {
  io.on('connection', socket => {
    for (const event of ['player:requestJoin', 'player:join']) {
      const handlers = socket.listeners(event);
      if (!handlers.length) continue;
      socket.removeAllListeners(event);
      socket.on(event, async (payload = {}, ack = () => {}) => {
        const code = String(payload?.code || '').trim();
        if (socket.data?.role === 'host' && String(socket.data?.roomCode || '') === code) {
          return ack({ ok: false, error: 'أنت مشرف هذه المسابقة بالفعل — افتح لوحة الإدارة بدل طلب الانضمام' });
        }
        let index = 0;
        const run = () => {
          const handler = handlers[index++];
          if (!handler) return;
          return handler.call(socket, payload, ack);
        };
        return run();
      });
    }
  });
};
