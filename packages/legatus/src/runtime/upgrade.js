import { LegatusClient } from './core/client.js';
import { sharedTransport } from './core/shared-transport.js';
import { InboxView } from './components/inbox.js';

// Preserve existing custom elements, stores and editor state while changing transport.
const api = globalThis.Legatus;
if (api && api.version !== '1.4.0' && api.client?.endpoint === 'https://legatus.quizzman.com') {
  const client = api.client;
  const enabled = !client._closed;
  client.disconnect();
  document.removeEventListener('visibilitychange', client._onVis);
  for (const [event, listener] of [['online', client._onOnline], ['offline', client._onOffline], ['pagehide', client._onPageHide], ['freeze', client._onPageHide]]) {
    if (listener) window.removeEventListener(event, listener);
  }
  client._lifecycleBound = false;
  Object.setPrototypeOf(client, LegatusClient.prototype);
  client.shared = sharedTransport(client.endpoint);
  api.version = '1.4.0';
  if (enabled) void client.connect().then(() => api.refresh()).catch(() => {});
}

// Patch the controller prototype retained by old custom-element constructors.
for (const element of document.querySelectorAll('legatus-bell, legatus-center')) {
  if (element._inbox) {
    Object.assign(Object.getPrototypeOf(element._inbox), {
      older: InboxView.prototype.older,
      paint: InboxView.prototype.paint,
    });
    element._inbox.onChange();
  }
}
