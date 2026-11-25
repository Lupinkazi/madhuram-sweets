/*
 * Catalogue & content data
 * ------------------------------------------------------------------
 * The shop makes ghee sweets only. Products are grouped into ghee groups
 * (categories below); every page renders from here. Group names and
 * membership are a proposal for the client to confirm.
 *
 * Category fields:
 *   id, name, tagline, image, units (default pack options)
 *   art         illustration family for demo images ("ghee")
 *
 * Product fields:
 *   id          unique slug (letters, numbers, hyphens)
 *   name        display name
 *   category    one of the ghee group ids below
 *   description short, factual text ("" shows the group tagline)
 *   image       path to a real photo, e.g. "assets/images/products/gulab-jamun.webp".
 *               "" renders a clearly labelled demo illustration.
 *   price       verified price per first unit (number) or null for "on request"
 *   units       optional override of the group's units
 *   signature   true to feature on the homepage
 *   confirm     true = name/details come from the brief and need client confirmation
 *   demo        true = invented demo entry, remove or replace before launch
 */
window.SweetShop = window.SweetShop || {};

(function () {
  const categories = [
    {
      id: "ghee-laddoo",
      name: "Laddoos",
      tagline: "Round sweets bound with ghee.",
      image: "assets/images/category-ghee-sweets.svg",
      units: ["250 g", "500 g", "1 kg"],
      art: "ghee"
    },
    {
      id: "ghee-dry",
      name: "Barfi, pak & dry sweets",
      tagline: "Fudges, pak and flaky sweets made with ghee.",
      image: "assets/images/category-ghee-sweets.svg",
      units: ["250 g", "500 g", "1 kg"],
      art: "ghee"
    },
    {
      id: "ghee-syrup",
      name: "Syrup sweets",
      tagline: "Ghee-fried sweets finished in syrup.",
      image: "assets/images/category-ghee-sweets.svg",
      units: ["250 g", "500 g", "1 kg"],
      art: "ghee"
    }
  ];

  const p = (id, name, category, description, extra) =>
    Object.assign({ id, name, category, description, image: "", price: null, signature: false, confirm: false, demo: false }, extra || {});

  const products = [
    p("makkhan-bada", "Makkhan Bada", "ghee-syrup", "Flaky fried pastry soaked in sugar syrup."),
    p("magaj-besan-laddoo", "Magaj and Besan Laddoo", "ghee-laddoo", "Roasted gram flour laddoo with melon seeds."),
    p("pinni", "Pinni", "ghee-laddoo", "Punjabi-style wheat flour and ghee sweet with nuts."),
    p("mohan-thal", "Mohan Thal", "ghee-dry", "Gram flour fudge flavoured with cardamom."),
    p("mysore-pak", "Mysore Pak", "ghee-dry", "Rich gram flour and ghee sweet with a porous texture."),
    p("mawa-patisa", "Mawa Patisa", "ghee-dry", "Flaky layered sweet made with mawa."),
    p("chandrakala", "Chandrakala", "ghee-syrup", "Half-moon pastry with a sweet khoya filling."),
    p("sohan-papdi", "Sohan Papdi", "ghee-dry", "Light, flaky squares that melt in the mouth."),
    p("mitha-ghewar", "Mitha Ghewar", "ghee-syrup", "Honeycomb-textured disc soaked in syrup."),
    p("malphuwa", "Malphuwa", "ghee-syrup", "Fried sweet pancakes dipped in syrup."),
    p("motichoor-laddoo", "Motichoor ke Laddoo", "ghee-laddoo", "Tiny boondi pearls bound into soft laddoos."),
    p("kala-jamun", "Kala Jamun", "ghee-syrup", "Deep-fried khoya dumplings with a dark, caramelised outside."),
    p("mithi-faini", "Mithi Faini", "ghee-dry", "Fine, crisp vermicelli-like strands, lightly sweetened."),
    p("karachi-halwa", "Karachi Halwa", "ghee-dry", "Chewy, translucent cornflour halwa with nuts."),
    p("malai-doda", "Malai Doda", "ghee-dry", "Caramelised milk and wheat sweet with nuts."),
    p("mawa-bati", "Mawa Bati", "ghee-syrup", "Khoya dumplings with a dry fruit centre, soaked in syrup."),
    p("gulab-jamun", "Gulab Jamun", "ghee-syrup", "Soft khoya dumplings in rose-scented syrup."),
    p("gond-laddoo", "Gond Laddoo", "ghee-laddoo", "Wheat flour laddoo with edible gum and nuts."),
    p("mawa-jalebi", "Mawa Jalebi", "ghee-syrup", "Khoya-based jalebi spirals soaked in syrup."),
    p("mithi-bundi", "Mithi Bundi", "ghee-laddoo", "Sweet fried gram flour pearls."),
    p("kaju-mysore", "Kaju Mysore", "ghee-dry", "Mysore pak made with cashew.")
  ];


  /* Pack options per item
     Group units above are only the default. Sweets sold one by one (jamun, bada,
     ghewar...) are ordered by the piece or pack. Edit these lists to match what
     the shop really sells. */
  const UNITS = {
    pieces: ["Piece", "Pack of 6", "Pack of 12"]
  };
  const unitRules = {
    pieces: [
      "makkhan-bada", "chandrakala", "mitha-ghewar", "malphuwa", "kala-jamun",
      "mawa-bati", "gulab-jamun"
    ]
  };
  Object.entries(unitRules).forEach(([set, ids]) => ids.forEach((id) => {
    const item = products.find((x) => x.id === id);
    if (!item) throw new Error(`unitRules: unknown product "${id}"`);
    item.units = UNITS[set];
  }));

  /* Order shown in the homepage collection. Add product ids here only after
     the client confirms which items are signature sweets. While empty, the
     homepage shows the first products of the catalogue. */
  const signatureOrder = [];

  /* Gallery: images of the shop, its sweets and its kitchen only. */
  const gallery = [
    { src: "assets/images/Friendly%20Service.png", w: 1448, h: 1086, category: "shop", caption: "Friendly service at the Madhuram counter" },
    { src: "assets/images/our%20story.png", w: 1122, h: 1402, category: "preparation", caption: "Shaping laddus by hand in our kitchen" },
    { src: "assets/images/Traditional%20Recipes.png", w: 2243, h: 701, category: "products", caption: "Traditional recipes and freshly made laddus" },
    { src: "assets/images/Careful%20Preparation.png", w: 1699, h: 926, category: "preparation", caption: "Slow cooking in small batches" },
    { src: "assets/images/Quality%20Ingredients.png", w: 1330, h: 1182, category: "ingredients", caption: "Ghee, gram flour, sugar, milk, cardamom and almonds" }
  ];
  const galleryCategories = [
    { id: "products", name: "Our sweets" },
    { id: "shop", name: "Shop" },
    { id: "preparation", name: "Preparation" },
    { id: "ingredients", name: "Ingredients" }
  ];
  SweetShop.data = { categories, products, signatureOrder, gallery, galleryCategories };
})();
