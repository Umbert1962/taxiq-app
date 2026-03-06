self.addEventListener('push', function(event) {
  var data = { title: 'TaxiQ', body: 'Nowe powiadomienie' };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {}

  var notifData = data.data || {};
  var isRideRequest = notifData.type === 'ride_request' || notifData.type === 'NEW_RIDE_REQUEST';
  var isPhoneOrder = notifData.type === 'phone_order';

  var options = {
    body: data.body || '',
    icon: '/favicon.png',
    badge: '/favicon.png',
    data: notifData,
    tag: isRideRequest ? 'taxiq-ride-request-' + (notifData.rideId || Date.now()) : isPhoneOrder ? 'taxiq-phone-order-' + (notifData.rideId || Date.now()) : (data.tag || 'taxiq-notification-' + Date.now()),
    renotify: true,
    requireInteraction: true,
    vibrate: isRideRequest ? [500, 200, 500, 200, 500, 200, 500] : isPhoneOrder ? [400, 150, 400, 150, 400] : [300, 100, 300, 100, 300],
    actions: isRideRequest
      ? [
          { action: 'accept', title: 'Akceptuj' },
          { action: 'dismiss', title: 'Odrzuć' }
        ]
      : isPhoneOrder
      ? [
          { action: 'open', title: 'Zobacz zlecenia' },
          { action: 'dismiss', title: 'Później' }
        ]
      : [
          { action: 'open', title: 'Otwórz' },
          { action: 'dismiss', title: 'Odrzuć' }
        ],
    silent: false
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'TaxiQ', options).then(function() {
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
        for (var i = 0; i < clientList.length; i++) {
          if (clientList[i].url.includes('/driver')) {
            if (isRideRequest) {
              clientList[i].postMessage({
                type: 'NEW_RIDE_REQUEST',
                rideId: notifData.rideId,
                pickup: notifData.pickup,
                destination: notifData.destination,
                price: notifData.price
              });
            } else if (isPhoneOrder) {
              clientList[i].postMessage({
                type: 'PHONE_ORDER_AVAILABLE',
                rideId: notifData.rideId
              });
            }
          }
        }
      });
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  var notifData = event.notification.data || {};
  var isRideRequest = notifData.type === 'ride_request' || notifData.type === 'NEW_RIDE_REQUEST';
  var isPhoneOrder = notifData.type === 'phone_order';
  var rideId = notifData.rideId;
  var url = '/driver/dashboard';

  if (isPhoneOrder) {
    url = '/driver/dashboard?tab=available';
  } else if (rideId) {
    url = '/driver/dashboard?ride=' + rideId;
    if (event.action === 'accept') {
      url += '&action=accept';
    }
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes('/driver') && 'focus' in client) {
          if (isPhoneOrder) {
            client.postMessage({ type: 'PHONE_ORDER_AVAILABLE', rideId: rideId });
          } else {
            client.postMessage({
              type: isRideRequest && event.action === 'accept' ? 'ACCEPT_RIDE' : 'OPEN_RIDE',
              rideId: rideId
            });
          }
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('install', function() {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});
