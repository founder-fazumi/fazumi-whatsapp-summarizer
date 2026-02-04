'use strict';

// Minimal stub so the worker can boot.
// If you don't support media yet, just say "not handled".
async function handleInboundMedia() {
  return { handled: false };
}

module.exports = { handleInboundMedia };
