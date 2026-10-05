'use strict';
const socketio = require('socket.io');
const OriginalServer = socketio.Server;
class CapturedServer extends OriginalServer {
  constructor(...args){ super(...args); global.__IAM_OMANI_IO__ = this; }
}
socketio.Server = CapturedServer;
require('./server');
if (!global.__IAM_OMANI_IO__) throw new Error('Socket.IO server was not captured');
require('./verification-email-fallback-v2')();
require('./host-owner-server-guard')(global.__IAM_OMANI_IO__);
require('./baloot-server')(global.__IAM_OMANI_IO__);
require('./uno-server')(global.__IAM_OMANI_IO__);
require('./card-games-server')(global.__IAM_OMANI_IO__);
