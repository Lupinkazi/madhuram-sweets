const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadData() {
  const code = fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8');
  const sandbox = { window: {} };
  sandbox.window.window = sandbox.window;
  sandbox.SweetShop = sandbox.window.SweetShop = {};
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.SweetShop.data;
}

test('1. Catalogue Categories Verification', (t) => {
  const data = loadData();
  const expectedCategories = [
    'sweets', 'thali', 'quick-bites', 'biryani', 'chaats',
    'snacks-breakfast', 'soup', 'burgur', 'curry', 'south-indian',
    'lassi', 'beverage', 'extra-additional', 'salad'
  ];

  assert.equal(data.categories.length, 14, 'Should have exactly 14 categories');
  expectedCategories.forEach((catId) => {
    const found = data.categories.find((c) => c.id === catId);
    assert.ok(found, `Category "${catId}" must be present`);
  });

  // Verify subcategories
  const breakfast = data.categories.find((c) => c.id === 'snacks-breakfast');
  assert.ok(breakfast.subcategories.includes('Paratha'), 'Snacks & Breakfast must include Paratha subcategory');

  const southIndian = data.categories.find((c) => c.id === 'south-indian');
  assert.ok(southIndian.subcategories.includes('Utthappam'), 'South Indian must include Utthappam subcategory');
});

test('2. Product Catalogue Completeness & Prices', (t) => {
  const data = loadData();
  assert.equal(data.products.length, 101, 'Should have 101 product items across all categories');

  // Verify Sweets size-based pricing
  const sweetPrices = {
    'Barfi': { perPiece: 45, '200g': null, halfKg: 650, kg: 1300 },
    'Besan Laddu': { perPiece: 60, '200g': null, halfKg: 750, kg: 1500 },
    'Brown Peda': { perPiece: 35, '200g': null, halfKg: 600, kg: 1200 },
    'Chamcham': { perPiece: 55, '200g': null, halfKg: 600, kg: 1200 },
    'Chandrakala / Balusai': { perPiece: 50, '200g': null, halfKg: null, kg: null },
    'Dry Fruits Laddu': { perPiece: 90, '200g': null, halfKg: 1100, kg: 2200 },
    'Dudh Malai': { perPiece: 90, '200g': null, halfKg: null, kg: null },
    'Gud Laddu': { perPiece: 60, '200g': null, halfKg: 750, kg: 1500 },
    'Kaju Katli': { perPiece: 45, '200g': null, halfKg: 1000, kg: 2000 },
    'Kala Jamun': { perPiece: 55, '200g': null, halfKg: 600, kg: 1200 },
    'Lalmohan': { perPiece: 40, '200g': null, halfKg: null, kg: null },
    'Milk Cake / Kalakand': { perPiece: 50, '200g': null, halfKg: 800, kg: 1600 },
    'Motichur Laddu': { perPiece: 50, '200g': null, halfKg: 600, kg: 1200 },
    'Rasbari': { perPiece: 40, '200g': null, halfKg: null, kg: null },
    'Sada Peda': { perPiece: 35, '200g': null, halfKg: 600, kg: 1200 },
    'Jalebi': { perPiece: 35, '200g': 220, halfKg: 550, kg: 1100 }
  };

  for (const [name, expected] of Object.entries(sweetPrices)) {
    const p = data.products.find((prod) => prod.name === name);
    assert.ok(p, `Sweet "${name}" must exist`);
    assert.equal(p.pricing.perPiece, expected.perPiece, `${name} perPiece price mismatch`);
    assert.equal(p.pricing['200g'], expected['200g'], `${name} 200g price mismatch`);
    assert.equal(p.pricing.halfKg, expected.halfKg, `${name} halfKg price mismatch`);
    assert.equal(p.pricing.kg, expected.kg, `${name} kg price mismatch`);
  }

  // Verify Jalebi alsoIn quick-bites
  const jalebi = data.products.find((prod) => prod.name === 'Jalebi');
  assert.ok(jalebi.alsoIn.includes('quick-bites'), 'Jalebi must have alsoIn ["quick-bites"]');

  // Verify Thali items
  const indianThali = data.products.find((prod) => prod.name === 'Indian Thali');
  assert.equal(indianThali.price, 350, 'Indian Thali must be Rs. 350');
  assert.ok(indianThali.description.includes('Rice, Dal Fry'), 'Indian Thali description must match');

  const madhurumThali = data.products.find((prod) => prod.name === 'Madhurum Special Thali');
  assert.equal(madhurumThali.price, 450, 'Madhurum Special Thali must be Rs. 450');
  assert.ok(madhurumThali.description.includes('Rasbari/Lal Mohan'), 'Madhurum Thali description must match');

  // Verify specific dishes from other categories
  const dishes = [
    { name: 'Samosa', price: 35, cat: 'quick-bites' },
    { name: 'Pani Puri (8 pcs)', price: 100, cat: 'quick-bites' },
    { name: 'Veg Hydarabadi Biryani', price: 400, cat: 'biryani' },
    { name: 'Madhuram Special Dahi Puri Chaat', price: 250, cat: 'chaats' },
    { name: 'Aloo Paratha', price: 150, cat: 'snacks-breakfast' },
    { name: 'Chhola Bhatore', price: 240, cat: 'snacks-breakfast' },
    { name: 'Cheese Burgur', price: 250, cat: 'burgur' },
    { name: 'Hot & Sour Soup', price: 220, cat: 'soup' },
    { name: 'Paneer Butter Masala', price: 350, cat: 'curry' },
    { name: 'Mushroom Masala', price: 400, cat: 'curry' },
    { name: 'Masala Dosa', price: 300, cat: 'south-indian' },
    { name: 'Special Lassi', price: 250, cat: 'lassi' },
    { name: 'Milk Shake With Icecream', price: 200, cat: 'beverage' },
    { name: 'Jeera Rice', price: 150, cat: 'extra-additional' },
    { name: 'Fruit Salad', price: 250, cat: 'salad' }
  ];

  dishes.forEach((d) => {
    const found = data.products.find((p) => p.name === d.name);
    assert.ok(found, `Dish "${d.name}" must exist`);
    assert.equal(found.price, d.price, `Dish "${d.name}" price must be ${d.price}`);
    assert.equal(found.category, d.cat, `Dish "${d.name}" category must be ${d.cat}`);
  });
});

test('3. Product Food Photography Images Verification', (t) => {
  const data = loadData();
  data.products.forEach((p) => {
    assert.ok(p.image, `Product "${p.name}" must have an image path`);
    const fullPath = path.join(__dirname, '..', p.image);
    assert.ok(fs.existsSync(fullPath), `Image file for "${p.name}" must exist at ${p.image}`);
    const stat = fs.statSync(fullPath);
    assert.ok(stat.size > 0, `Image file for "${p.name}" must not be empty`);
  });

  // Verify manifest
  const manifestPath = path.join(__dirname, '../assets/images/menu/manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.items.length, data.products.length, 'Manifest must account for all products');
});

test('4. Removal of Obsolete Ghee-Only Terminology', (t) => {
  const htmlFiles = [
    'index.html', 'about.html', 'products.html', 'quality.html',
    'gallery.html', 'order.html', 'contact.html', '404.html'
  ];

  const forbiddenTerms = [
    /ghee-laddoo/i,
    /ghee-dry/i,
    /ghee-syrup/i,
    /ghee sweets/i
  ];

  htmlFiles.forEach((file) => {
    const content = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    forbiddenTerms.forEach((pattern) => {
      assert.ok(
        !pattern.test(content),
        `File "${file}" should not contain retired pattern ${pattern}`
      );
    });

    // Verify primary nav link points to products.html with text "Menu"
    assert.ok(
      content.includes('<a href="products.html">Menu</a>') || content.includes('<a href="products.html" aria-current="page">Menu</a>'),
      `File "${file}" must have "Menu" navigation link to products.html`
    );

    // Verify footer category link
    assert.ok(
      content.includes('products.html?cat=sweets'),
      `File "${file}" must have sweets category link in footer`
    );
  });
});

test('5. Single Source of Truth & Order Flow', (t) => {
  const data = loadData();
  const seenIds = new Set();
  data.products.forEach((p) => {
    assert.ok(!seenIds.has(p.id), `Product id "${p.id}" must be unique`);
    seenIds.add(p.id);
  });

  // Verify signatureOrder
  assert.ok(Array.isArray(data.signatureOrder), 'signatureOrder must be an array');
  assert.ok(data.signatureOrder.length >= 8, 'signatureOrder must have at least 8 items');
  data.signatureOrder.forEach((id) => {
    assert.ok(seenIds.has(id), `Signature product "${id}" must exist in product catalogue`);
  });
});
