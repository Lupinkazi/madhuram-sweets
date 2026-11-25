/*
 * Catalogue & content data: the single source of truth for every page
 * (menu, homepage, order picker, search, structured data, sitemap script).
 * Source: the five printed Madhuram Sweets & Snacks menu pages. Names are
 * kept as printed. All prices are in Nepalese rupees (Rs.). A size that the
 * menu leaves blank is simply absent: it is never shown or selectable.
 *
 * Category fields:
 *   id, name, tagline, group ("menu" | "extra"), subcategories[] (optional)
 *
 * Product fields:
 *   id            unique slug (letters, numbers, hyphens); also the image file name
 *   name          display name as printed on the menu
 *   category      category id below
 *   subcategory   optional subcategory name inside its category (e.g. "Paratha")
 *   alsoIn        optional other category ids where the same record is listed
 *   description   only text printed on the menu ("" shows nothing)
 *   note          optional printed note shown with the product
 *   price         number (Rs.) for single-price dishes
 *   pricing       sweets only: { perPiece, "200g", halfKg, kg }; null = not offered
 *   image         path to the photograph, "" until the photo file exists
 *   imagePath     where the photograph must be saved (see assets/images/menu)
 *   altText       alt text for the photograph
 *   featured      true to show on the homepage
 *   available     false hides the product from every active list
 *   displayOrder  position in the menu (set automatically from the order below)
 *   tags          search keywords
 */
window.SweetShop = window.SweetShop || {};

(function () {
  const categories = [
    { id: "sweets", name: "Sweets", tagline: "Priced per piece, 200 g, half kg or kg.", group: "menu" },
    { id: "thali", name: "Thali", tagline: "Additional charges for extra.", group: "menu" },
    { id: "quick-bites", name: "Quick Bites", tagline: "Snacks and fried favourites.", group: "menu" },
    { id: "biryani", name: "Biryani", tagline: "Veg and paneer biryani.", group: "menu" },
    { id: "chaats", name: "Chaats", tagline: "Street-style chaats.", group: "menu" },
    { id: "snacks-breakfast", name: "Snacks & Breakfast", tagline: "Parathas, puri and more.", group: "menu", subcategories: ["Paratha"] },
    { id: "soup", name: "Soup", tagline: "Hot soups.", group: "menu" },
    { id: "burger", name: "Burger", tagline: "Veg and cheese burgers.", group: "menu" },
    { id: "curry", name: "Curry", tagline: "Paneer, dal and vegetable curries.", group: "menu" },
    { id: "south-indian", name: "South Indian", tagline: "Dosa and utthappam.", group: "menu", subcategories: ["Utthappam"] },
    { id: "lassi", name: "Lassi", tagline: "Lassi and chhas.", group: "menu" },
    { id: "beverage", name: "Beverage", tagline: "Hot and cold drinks.", group: "menu" },
    { id: "extra-additional", name: "Extra Additional", tagline: "Add-ons to go with your meal.", group: "extra" },
    { id: "salad", name: "Salad", tagline: "Fresh salads.", group: "menu" }
  ];

  /* Sweet pack sizes in display order: key in `pricing` -> label used in the order list. */
  const SWEET_SIZES = [
    ["perPiece", "Per piece"],
    ["200g", "200 g"],
    ["halfKg", "Half kg"],
    ["kg", "1 kg"]
  ];
  const SINGLE_UNIT = "Each";

  const slug = (name) => name.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  let order = 0;
  const make = (category, name, extra) => {
    const id = (extra && extra.id) || slug(name);
    return Object.assign({
      id, name, category, subcategory: "", alsoIn: [], description: "", note: "",
      price: null, pricing: null,
      image: `assets/images/menu/${category}/${id}.jpg`,
      imagePath: `assets/images/menu/${category}/${id}.jpg`,
      altText: `${name}, ${categories.find((c) => c.id === category).name.toLowerCase()} from Madhuram Sweets & Snacks`,
      featured: false, available: true, displayOrder: ++order, tags: []
    }, extra || {});
  };
  const dish = (category, name, price, extra) => make(category, name, Object.assign({ price }, extra || {}));
  const sweet = (name, perPiece, halfKg, kg, extra) =>
    make("sweets", name, Object.assign({ pricing: { perPiece, "200g": null, halfKg, kg } }, extra || {}));

  const products = [
    /* A. Sweets */
    sweet("Barfi", 45, 650, 1300, { featured: true, image: "assets/images/Sweets/Barfi.png" }),
    sweet("Besan Laddu", 60, 750, 1500, { featured: true, image: "assets/images/Sweets/Besan Laddu.png" }),
    sweet("Brown Peda", 35, 600, 1200, { image: "assets/images/Sweets/Brown Peda.png" }),
    sweet("Chamcham", 55, 600, 1200, { image: "assets/images/Sweets/Chamcham.png" }),
    sweet("Chandrakala / Balusai", 50, null, null, { image: "assets/images/Sweets/Chandrakala_Balusai.png" }),
    sweet("Dry Fruits Laddu", 90, 1100, 2200, { image: "assets/images/Sweets/Dry Fruits Laddu.png" }),
    sweet("Dudh Malai", 90, null, null, { image: "assets/images/Sweets/Dhudh Malai.png" }),
    sweet("Gud Laddu", 60, 750, 1500, { image: "assets/images/Sweets/Gud Laddu.png" }),
    sweet("Kaju Katli", 45, 1000, 2000, { featured: true, image: "assets/images/Sweets/Kaju Katli.png" }),
    sweet("Kala Jamun", 55, 600, 1200, { image: "assets/images/Sweets/Kala Jamun.png" }),
    sweet("Lalmohan", 40, null, null, { image: "assets/images/Sweets/Lalmohan.png" }),
    sweet("Milk Cake / Kalakand", 50, 800, 1600, { image: "assets/images/Sweets/Milk Cake_Kalakand.png" }),
    sweet("Motichur Laddu", 50, 600, 1200, { image: "assets/images/Sweets/Motichur Laddu.png" }),
    sweet("Rasbari", 40, null, null, { image: "assets/images/Sweets/Rasbari.png" }),
    sweet("Sada Peda", 35, 600, 1200, { image: "assets/images/Sweets/Sada Peda.png" }),
    /* One canonical Jalebi record: Sweets size pricing, also listed under Quick Bites. */
    make("sweets", "Jalebi", {
      pricing: { perPiece: 35, "200g": 220, halfKg: 550, kg: 1100 },
      alsoIn: ["quick-bites"],
      image: "assets/images/Sweets/Jalebi.png",
      altText: "A heaped brass tray of freshly fried jalebi spirals",
      featured: true
    }),

    /* B. Thali */
    dish("thali", "Indian Thali", 350, {
      description: "Rice, Dal Fry, Paneer Curry, 2 pcs Roti, Chhole, Papad, Salad, Achar.",
      note: "Additional charges for extra.", featured: true,
      image: "assets/images/Thali/Indian Thali.png"
    }),
    dish("thali", "Madhurum Special Thali", 450, {
      description: "Rice, Dal Fry, Paneer Curry, 2 pcs Butter Roti, Chhole, Papad, Salad, Achar, Rasbari/Lal Mohan, Curd.",
      note: "Additional charges for extra.", featured: true,
      image: "assets/images/Thali/Madhuram Special Thali.png"
    }),

    /* C. Quick Bites (Jalebi is listed from the Sweets record above) */
    dish("quick-bites", "Aaloo Jeera", 150, { image: "assets/images/Quick Bites/Aaloo Jeera.png" }),
    dish("quick-bites", "Chips Chilly", 180, { image: "assets/images/Quick Bites/chips chilly.png" }),
    dish("quick-bites", "French Fry", 150, { image: "assets/images/Quick Bites/French fry.png" }),
    dish("quick-bites", "Paneer Chilly (8 pcs)", 250, { image: "assets/images/Quick Bites/Paneer Chilly (8 pcs).png" }),
    dish("quick-bites", "Kachori", 40, { image: "assets/images/Quick Bites/Kachori.png" }),
    dish("quick-bites", "Katti Roll Mix", 200, { image: "assets/images/Quick Bites/Katti Roll Mix.png" }),
    dish("quick-bites", "Onion Pakoda", 170, { image: "assets/images/Quick Bites/Onion Pakoda.png" }),
    dish("quick-bites", "Panner Pakoda", 250, { image: "assets/images/Quick Bites/Paneer pakoda.png" }),
    dish("quick-bites", "Pani Puri (8 pcs)", 100, { image: "assets/images/Quick Bites/Pani Puri (8 pcs).png" }),
    dish("quick-bites", "Samosa", 35, { featured: true, image: "assets/images/Quick Bites/samosa.png" }),
    dish("quick-bites", "Sandwitch Veg", 150, { image: "assets/images/Quick Bites/Sandwich Veg.png" }),
    dish("quick-bites", "Springroll Veg", 200, { image: "assets/images/Quick Bites/Spring Roll Veg.png" }),
    dish("quick-bites", "Sandwitch Cheese", 200, { image: "assets/images/Quick Bites/Sandwich Cheese.png" }),
    dish("quick-bites", "Veg Pakoda", 150, { image: "assets/images/Quick Bites/Veg Pakoda.png" }),

    /* D. Biryani */
    dish("biryani", "Mix Veg Biryani", 350, { image: "assets/images/Biryani/Mix Veg Biryani.png" }),
    dish("biryani", "Paneer Biryani", 300, { image: "assets/images/Biryani/Paneer Biryani.png" }),
    dish("biryani", "Veg Biryani", 250, { image: "assets/images/Biryani/Veg biryani.png" }),
    dish("biryani", "Veg Hydarabadi Biryani", 400, { image: "assets/images/Biryani/Veg Hyderabadi Biryani.png" }),

    /* E. Chaats */
    dish("chaats", "Aloo Tikki Chaat", 220, { image: "assets/images/Chaats/Aloo Tikki Chaat.png" }),
    dish("chaats", "Kachori Chaat", 210, { image: "assets/images/Chaats/Kachori Chaat.png" }),
    dish("chaats", "Madhuram Special Dahi Puri Chaat", 250, { featured: true, image: "assets/images/Chaats/Madhuram Special Dahi Puri Chaat.png" }),
    dish("chaats", "Mix Chaat", 250, { image: "assets/images/Chaats/Mix Chaat.png" }),
    dish("chaats", "Papadi Chaat", 210, { image: "assets/images/Chaats/Papdi Chaat.png" }),
    dish("chaats", "Samosa Chaat", 200, { image: "assets/images/Chaats/Samosa Chaat.png" }),

    /* F. Snacks & Breakfast */
    dish("snacks-breakfast", "Aloo Paratha", 150, { subcategory: "Paratha", image: "assets/images/Snacks & Breakfast/Aloo Paratha.png" }),
    dish("snacks-breakfast", "Paneer Paratha", 200, { subcategory: "Paratha", image: "assets/images/Snacks & Breakfast/Paneer Paratha.png" }),
    dish("snacks-breakfast", "Chhola Bhatore", 240, { image: "assets/images/Snacks & Breakfast/Chhola Bhatore.png" }),
    dish("snacks-breakfast", "Jeri Puri Tarkari (Puri 4 pcs, Jeri 2 Pcs)", 190, { id: "jeri-puri-tarkari", image: "assets/images/Snacks & Breakfast/Jeri Puri Tarkari.png" }),
    dish("snacks-breakfast", "Jeri Swari", 180, { image: "assets/images/Snacks & Breakfast/Jeri Swari.png" }),
    dish("snacks-breakfast", "Puri Tarkari (Puri 4 pcs)", 140, { id: "puri-tarkari", image: "assets/images/Snacks & Breakfast/Puri Tarkari.png" }),
    dish("snacks-breakfast", "Roti Tarkari", 140, { image: "assets/images/Snacks & Breakfast/Roti Tarkari.png" }),

    /* G. Soup */
    dish("soup", "Hot & Sour Soup", 220, { image: "assets/images/Soup/Hot & Sour Soup.png" }),
    dish("soup", "Mix Veg Soup", 150, { image: "assets/images/Soup/Mix Veg Soup.png" }),
    dish("soup", "Mushroom Soup", 200, { image: "assets/images/Soup/Mushroom Soup.png" }),
    dish("soup", "Veg Garlic Soup", 200, { image: "assets/images/Soup/Veg Garlic Soup.png" }),

    /* H. Burgur */
    dish("burger", "Cheese Burger", 250, { image: "assets/images/Burger/Cheese Burger.png" }),
    dish("burger", "Veg Burger", 150, { image: "assets/images/Burger/Veg burger.png" }),

    /* I. Curry */
    dish("curry", "Aloo Matar", 220, { image: "assets/images/Curry/Aloo Matar.png" }),
    dish("curry", "Chana Masala", 220, { image: "assets/images/Curry/Chana Masala.png" }),
    dish("curry", "Daal Butter Fry", 200, { image: "assets/images/Curry/Daal Butter Fry.png" }),
    dish("curry", "Daal Tadka", 200, { image: "assets/images/Curry/Daal Tadka.png" }),
    dish("curry", "Kadai Paneer", 350, { image: "assets/images/Curry/Kadai Paneer.png" }),
    dish("curry", "Matar Paneer", 300, { image: "assets/images/Curry/Matar Paneer.png" }),
    dish("curry", "Mix Veg Curry", 250, { image: "assets/images/Curry/Mix Veg Curry.png" }),
    dish("curry", "Mushroom Masala", 400, { image: "assets/images/Curry/Mushroom Masala.png" }),
    dish("curry", "Paneer Butter Masala", 350, { featured: true, image: "assets/images/Curry/Paneer Butter Masala.png" }),
    dish("curry", "Sahi Paneer", 300, { image: "assets/images/Curry/Sahi Paneer.png" }),

    /* J. South Indian */
    dish("south-indian", "Butter Masala Dosa", 350, { image: "assets/images/South Indian/Butter Masala Dosa.png" }),
    dish("south-indian", "Masala Dosa", 300, { featured: true, image: "assets/images/South Indian/Masala Dosa.png" }),
    dish("south-indian", "Paneer Masala Dosa", 370, { image: "assets/images/South Indian/Paneer Masala Dosa.png" }),
    dish("south-indian", "Paneer Plain Dosa", 300, { image: "assets/images/South Indian/Paneer Plain Dosa.png" }),
    dish("south-indian", "Plain Dosa", 250, { image: "assets/images/South Indian/Plain Dosa.png" }),
    dish("south-indian", "Rawa Masala Dosa", 350, { image: "assets/images/South Indian/Rawa Masala dosa.png" }),
    dish("south-indian", "Rawa Plain Dosa", 300, { image: "assets/images/South Indian/Rawa Plain dosa.png" }),
    dish("south-indian", "Mix Utthappam", 300, { subcategory: "Utthappam", image: "assets/images/South Indian/Mix Utthappam.png" }),
    dish("south-indian", "Veg Utthappam", 250, { subcategory: "Utthappam", image: "assets/images/South Indian/Veg Utthappam.png" }),

    /* K. Lassi */
    dish("lassi", "Banana Lassi", 200, { image: "assets/images/Lassi/Banana Lassi.png" }),
    dish("lassi", "Chhas", 120, { image: "assets/images/Lassi/Chhas.png" }),
    dish("lassi", "Plain Lassi", 150, { image: "assets/images/Lassi/Plain Lassi.png" }),
    dish("lassi", "Kesar Lassi", 220, { image: "assets/images/Lassi/Kesar Lassi.png" }),
    dish("lassi", "Special Lassi", 250, { image: "assets/images/Lassi/Special Lassi.png" }),

    /* L. Beverage */
    dish("beverage", "Black Tea", 30, { image: "assets/images/Beverage/Black Tea.png" }),
    dish("beverage", "Black Coffee", 80, { image: "assets/images/Beverage/Black Coffee.png" }),
    dish("beverage", "Coke / Fanta / Sprite", 80, { image: "assets/images/Beverage/Coke, Fanta, Sprite.png" }),
    dish("beverage", "Hot Lemon", 100, { image: "assets/images/Beverage/Hot Lemon.png" }),
    dish("beverage", "Hot Lemon With Honey", 150, { image: "assets/images/Beverage/Hot Lemon with Honey.png" }),
    dish("beverage", "Hot Chocolate", 180, { image: "assets/images/Beverage/Hot Chocolate.png" }),
    dish("beverage", "Lemon Tea", 35, { image: "assets/images/Beverage/Lemon Tea.png" }),
    dish("beverage", "Milk Coffee", 140, { image: "assets/images/Beverage/Milk Coffee.png" }),
    dish("beverage", "Milk", 60, { image: "assets/images/Beverage/Milk.png" }),
    dish("beverage", "Milk Tea", 45, { image: "assets/images/Beverage/Milk Tea.png" }),
    dish("beverage", "Mint (Mojito)", 120, { image: "assets/images/Beverage/Mint (Mojito).png" }),
    dish("beverage", "Milk Shake With Icecream", 200, { note: "Vanilla, Strawberry 21st Love.", image: "assets/images/Beverage/Milk Shake With Ice Cream.png" }),

    /* M. Extra Additional */
    dish("extra-additional", "Bhatore", 70, { image: "assets/images/Extra Additional/Bahtore.png" }),
    dish("extra-additional", "Chhola", 80, { image: "assets/images/Extra Additional/chhola.png" }),
    dish("extra-additional", "Puri", 30, { image: "assets/images/Extra Additional/puri.png" }),
    dish("extra-additional", "Raita", 100, { image: "assets/images/Extra Additional/Raita.png" }),
    dish("extra-additional", "Rice", 120, { image: "assets/images/Extra Additional/Rice.png" }),
    dish("extra-additional", "Roti", 30, { image: "assets/images/Extra Additional/Roti.png" }),
    dish("extra-additional", "Jeera Rice", 150, { image: "assets/images/Extra Additional/Jeera Rice.png" }),
    dish("extra-additional", "Sambar", 60, { image: "assets/images/Extra Additional/Sambar.png" }),

    /* N. Salad */
    dish("salad", "Fruit Salad", 250, { image: "assets/images/Salad/Fruit Salad.png" }),
    dish("salad", "Green Salad", 150, { image: "assets/images/Salad/Green Salad.png" })
  ];

  /* ---------- Derived fields & integrity checks ---------- */
  const seen = new Set();
  products.forEach((item) => {
    const cat = categories.find((c) => c.id === item.category);
    if (!cat) throw new Error(`product "${item.id}": unknown category "${item.category}"`);
    if (seen.has(item.id)) throw new Error(`duplicate product id "${item.id}"`);
    seen.add(item.id);
    if (item.subcategory && !(cat.subcategories || []).includes(item.subcategory)) throw new Error(`product "${item.id}": unknown subcategory`);
    (item.alsoIn || []).forEach((c) => { if (!categories.some((x) => x.id === c)) throw new Error(`product "${item.id}": unknown alsoIn "${c}"`); });
    const prices = item.pricing ? SWEET_SIZES.map(([k]) => item.pricing[k]).filter((v) => v !== null && v !== undefined) : [item.price];
    if (!prices.length || prices.some((v) => !Number.isFinite(v) || v <= 0)) throw new Error(`product "${item.id}": missing or non-positive price`);
    // Sweets: offered sizes in menu order. Other dishes: one unit.
    item.units = item.pricing ? SWEET_SIZES.filter(([k]) => Number.isFinite(item.pricing[k])).map(([, label]) => label) : [SINGLE_UNIT];
    item.tags = [cat.name, item.subcategory, ...(item.alsoIn || []).map((c) => categories.find((x) => x.id === c).name), ...item.tags].filter(Boolean);
  });

  /* Homepage featured order. Chosen by the site build, not printed on the menu:
     change `featured` above (or this list) to promote other items. */
  const signatureOrder = ["kaju-katli", "jalebi", "besan-laddu", "indian-thali", "madhurum-special-thali", "samosa", "madhuram-special-dahi-puri-chaat", "masala-dosa"];
  signatureOrder.forEach((id) => { if (!seen.has(id)) throw new Error(`signatureOrder: unknown product "${id}"`); });

  /* Gallery: images of the shop, its sweets and its kitchen only. */
  const gallery = [
    { src: "assets/images/Friendly Service.png", w: 1448, h: 1086, category: "shop", caption: "Friendly service at the Madhuram counter" },
    { src: "assets/images/our story.png", w: 1122, h: 1402, category: "preparation", caption: "Shaping laddus by hand in our kitchen" },
    { src: "assets/images/Traditional Recipes.png", w: 2243, h: 701, category: "products", caption: "Traditional recipes and freshly made laddus" },
    { src: "assets/images/Careful preparation.png", w: 1699, h: 926, category: "preparation", caption: "Slow cooking in small batches" },
    { src: "assets/images/Quality Ingredients.png", w: 1330, h: 1182, category: "ingredients", caption: "Ghee, gram flour, sugar, milk, cardamom and almonds" }
  ];
  const galleryCategories = [
    { id: "products", name: "Our sweets" },
    { id: "shop", name: "Shop" },
    { id: "preparation", name: "Preparation" },
    { id: "ingredients", name: "Ingredients" }
  ];
  window.SweetShop.data = { categories, products, signatureOrder, gallery, galleryCategories, SWEET_SIZES, SINGLE_UNIT };
})();
