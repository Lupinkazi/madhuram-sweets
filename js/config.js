/*
 * Brand & business configuration
 * ------------------------------------------------------------------
 * EVERY value below is DEMO content. Replace it with the client's
 * verified details before launch. Empty strings hide the related UI
 * (for example, an empty whatsapp number hides every WhatsApp button).
 */
window.SweetShop = window.SweetShop || {};

SweetShop.config = {
  /* Set to true only after the client has verified the information
     below. Structured data (JSON-LD) is published only when true. */
  verified: false,

  /* Development helper: outlines every element marked data-placeholder. */
  highlightPlaceholders: false,

  siteUrl: "https://www.example.com", // used for sitemap / structured data

  brand: {
    name: "Madhuram Sweets & Snacks",  // DEMO
    shortName: "Madhuram",             // DEMO
    tagline: "100% Veg",                 // DEMO
    foundedYear: null                   // e.g. 1982 — only after confirmation
  },

  contact: {
    phoneDisplay: "9768617279",
    phoneHref: "+9779768617279",       // primary number, digits with country code
    phones: [                           // shown stacked in footer and contact page
      { display: "9768617279", href: "+9779768617279" },
      { display: "9747459190", href: "+9779747459190" },
      { display: "9849640983", href: "+9779849640983" }
    ],
    whatsapp: "9779768617279",         // digits only; "" hides WhatsApp
    email: "msweetssnacks@gmail.com",
    address: "Dhungedhara, Kathmandu",
    mapCenter: "27.7235857,85.2934309", // lat,lng of the Madhuram shop building on Jamacho Marg, Dhungedhara (the map pin sits here)
    mapQuery: "Madhuram Sweets & Snacks, Jamacho Marg, Dhungedhara, Kathmandu, Nepal", // "" hides the map. The Google Maps key lives server-side (GOOGLE_MAPS_API_KEY), not here.
  },

  hours: [
    { days: "Every day", time: "6:00 am – 10:00 pm" }
  ],
  hoursSummary: "Open daily · 6 am – 10 pm", // DEMO

  social: {                              // DEMO links; "" hides an icon
    tiktok: "https://www.tiktok.com/@madhuram.sweets.snacks?_r=1&_t=ZS-9Bh22UWzZyf",
    instagram: "",
    facebook: "https://www.facebook.com/share/1FujsYoREj/",
    youtube: "https://youtube.com/@madhuramsweetssnacks?si=dKyvBO59kV66QeXw"
  },

  ordering: {
    /*
     * Delivery channel per form:
     *  order   – "whatsapp": opens WhatsApp with the order pre-filled (WhatsApp only).
     *  contact – "gmail": opens a Gmail compose window to contact.email (Gmail only).
     */
    channels: { order: "whatsapp", contact: "gmail" },
    currency: "NPR",
    showPrices: true // prices come from the printed menu (js/data.js)
  }
};

