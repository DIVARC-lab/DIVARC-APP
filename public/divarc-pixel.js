/* DIVARC Pixel v1 — tracker JS pour annonceurs externes.
 *
 * Usage côté annonceur :
 *   <script>
 *     !function(d,p,s){var a=d.createElement(s);a.async=1;a.src=p;
 *     d.head.appendChild(a)}(document,'https://divarc.app/divarc-pixel.js','script');
 *   </script>
 *   <script>
 *     dvarc('init', 'PIXEL_ID');
 *     dvarc('track', 'PageView');
 *   </script>
 *
 * Standard events :
 *   PageView, ViewContent, Search, AddToCart, AddToWishlist,
 *   InitiateCheckout, AddPaymentInfo, Purchase, Lead,
 *   CompleteRegistration
 *
 * Custom events :
 *   dvarc('trackCustom', 'EventName', { value: 99.99, currency: 'EUR' });
 *
 * Conformité RGPD :
 *   - Snippet à charger APRÈS consentement utilisateur
 *   - Cookies first-party uniquement, durée 90j max
 *   - IP anonymisée côté serveur (drop dernier octet)
 *   - dvarc('disable') pour opt-out runtime
 */
(function () {
  "use strict";

  if (window.dvarc && window.dvarc.q) return; // déjà loaded

  var PIXEL_ENDPOINT = "https://divarc.app/api/ads/events";
  var COOKIE_NAME = "_dvarc_id";
  var COOKIE_TTL_DAYS = 90;

  function getCookie(name) {
    var v = document.cookie.match(
      new RegExp("(?:^|; )" + name + "=([^;]*)"),
    );
    return v ? decodeURIComponent(v[1]) : null;
  }

  function setCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 24 * 3600 * 1000);
    document.cookie =
      name +
      "=" +
      encodeURIComponent(value) +
      ";expires=" +
      d.toUTCString() +
      ";path=/;SameSite=Lax";
  }

  function uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getOrCreateAnonId() {
    var id = getCookie(COOKIE_NAME);
    if (!id) {
      id = uuid();
      setCookie(COOKIE_NAME, id, COOKIE_TTL_DAYS);
    }
    return id;
  }

  /* État partagé. */
  var state = {
    pixelId: null,
    enabled: true,
    debug: false,
  };

  function send(eventName, customData) {
    if (!state.enabled || !state.pixelId) return;

    var payload = {
      event_name: eventName,
      event_id: uuid(),
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: location.href,
      action_source: "website",
      pixel_id: state.pixelId,
      anon_id: getOrCreateAnonId(),
      user_data: {
        client_user_agent: navigator.userAgent,
        client_language: navigator.language,
      },
      custom_data: customData || {},
    };

    /* sendBeacon prioritaire (gère unload), fallback fetch keepalive. */
    var body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      var blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(PIXEL_ENDPOINT, blob);
    } else {
      fetch(PIXEL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
        keepalive: true,
        credentials: "omit",
      }).catch(function () {});
    }

    if (state.debug) console.log("[dvarc]", eventName, customData);
  }

  /* API publique. */
  function dvarc() {
    var args = Array.prototype.slice.call(arguments);
    var cmd = args[0];

    switch (cmd) {
      case "init":
        state.pixelId = args[1];
        break;
      case "track":
        send(args[1], args[2]);
        break;
      case "trackCustom":
        send(args[1], args[2]);
        break;
      case "disable":
        state.enabled = false;
        break;
      case "enable":
        state.enabled = true;
        break;
      case "debug":
        state.debug = !!args[1];
        break;
    }
  }
  dvarc.q = []; // queue compat

  /* Drain queue si snippet appelait dvarc avant load. */
  if (window.dvarc && Array.isArray(window.dvarc.q)) {
    for (var i = 0; i < window.dvarc.q.length; i++) {
      dvarc.apply(null, window.dvarc.q[i]);
    }
  }
  window.dvarc = dvarc;

  /* Auto PageView si pas désactivé. */
  if (state.pixelId) {
    send("PageView", {});
  }
})();
