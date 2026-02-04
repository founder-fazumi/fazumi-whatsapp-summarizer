'use strict';

// Minimal stub so the worker can boot.
// Return {handled:true} if you consumed the message as a command.
async function processCommand({ textBody, waNumber, user }) {
  const t = (textBody || '').trim().toUpperCase();

  if (t === 'START') return { handled: true, action: 'start' };
  if (t === 'PAUSE' || t === 'STOP') return { handled: true, action: 'pause' };
  if (t === 'STATUS') return { handled: true, action: 'status' };

  return { handled: false };
}

module.exports = { processCommand };
