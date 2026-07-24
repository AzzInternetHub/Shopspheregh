/**
 * ShopSphere Web Engine
 * Developed by Azz Internet Hub
 */

const TELEMETRY_ENDPOINT = "https://script.google.com/macros/s/AKfycbyhPV74CWRyQ2BXoGbxt5mwv1bYX5VgkI31QPDi16HuZa6CrZZ5JQZ4tH8BiTCyQF-dwA/exec";
const PAYSTACK_PUBLIC_KEY = "pk_live_8c56d91cee6884d988dd8355981e0134ab72b94b";

let storeDatabase = { products: [], categories: [], settings: {} };
let customerCart = [];

document.addEventListener("DOMContentLoaded", () => {
  initializeStorefront();
  attachEventListeners();
});

async function initializeStorefront() {
  const container = document.getElementById("products-container");
  let hasRendered = false;

  // 1. Instant Cache Load (0ms delay)
  const cached = localStorage.getItem("shopsphere_cache");
  if (cached) {
    try {
      storeDatabase = JSON.parse(cached);
      if (storeDatabase.products && storeDatabase.products.length > 0) {
        renderCategories();
        renderProducts(storeDatabase.products);
        hasRendered = true;
      }
    } catch (e) {
      console.warn("Local cache read error", e);
    }
  }

  // 2. Fast background sync (5s max timeout)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`${TELEMETRY_ENDPOINT}?action=getStoreData`, {
      method: "GET",
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const json = await res.json();

    if (json.success && json.data) {
      storeDatabase = json.data;
      localStorage.setItem("shopsphere_cache", JSON.stringify(json.data));
      renderCategories();
      renderProducts(storeDatabase.products);

      if (storeDatabase.settings && storeDatabase.settings.company_motto) {
        const mottoElem = document.getElementById("branding-motto");
        if (mottoElem) mottoElem.textContent = storeDatabase.settings.company_motto;
      }
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("Storefront Sync Error:", err);
    if (!hasRendered && container) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 2rem;">
          <p style="color: #64748b; margin-bottom: 1rem;">Server took too long to respond.</p>
          <button onclick="initializeStorefront()" style="padding: 0.6rem 1.2rem; background: #0f172a; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
            Retry Connection
          </button>
        </div>`;
    }
  }
}

function renderCategories() {
  const container = document.getElementById("categories-container");
  if (!container || !storeDatabase.categories) return;

  if (storeDatabase.categories.length === 0) {
    container.innerHTML = `<p style="color: #64748b; padding: 0.5rem;">No categories currently listed.</p>`;
    return;
  }

  container.innerHTML = storeDatabase.categories.map(c => `
    <div class="category-card" onclick="filterCategory('${c.name}')" style="cursor: pointer;">
      <img src="${c.image || 'https://via.placeholder.com/150'}" alt="${c.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/150';">
      <span>${c.name}</span>
    </div>
  `).join('');
}

function renderProducts(list) {
  const container = document.getElementById("products-container");
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML = `<div class="no-products" style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #64748b;">No products available.</div>`;
    return;
  }

  container.innerHTML = list.map(p => {
    const firstImg = (p.images && p.images.trim() !== "") ? p.images.split(",")[0].trim() : 'https://via.placeholder.com/300';
    return `
      <div class="product-card">
        <div class="product-img-box" onclick="openProductModal('${p.id}')">
          <img src="${firstImg}" alt="${p.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300';">
        </div>
        <div class="product-details">
          <span class="vendor-tag">${p.vendorName || 'Official'}</span>
          <h4 onclick="openProductModal('${p.id}')">${p.title}</h4>
          <div class="price-row">
            <span class="sale-price">GHS ${parseFloat(p.salePrice || 0).toFixed(2)}</span>
            ${p.originalPrice > p.salePrice ? `<span class="old-price">GHS ${parseFloat(p.originalPrice).toFixed(2)}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.filterCategory = function(catName) {
  const filtered = storeDatabase.products.filter(p => p.category && p.category.toLowerCase() === catName.toLowerCase());
  const resetBtn = document.getElementById("reset-category-btn");
  if (resetBtn) resetBtn.classList.remove("hidden");
  
  const catalogTitle = document.getElementById("catalog-title");
  if (catalogTitle) catalogTitle.textContent = `Category: ${catName}`;
  
  renderProducts(filtered);

  // Smooth scroll directly to products section
  const targetSection = document.getElementById("product-showcase");
  if (targetSection) {
    targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

window.resetCategoryFilter = function() {
  const resetBtn = document.getElementById("reset-category-btn");
  if (resetBtn) resetBtn.classList.add("hidden");

  const catalogTitle = document.getElementById("catalog-title");
  if (catalogTitle) catalogTitle.textContent = "Featured Masterpieces";

  renderProducts(storeDatabase.products);
};

window.openProductModal = function(id) {
  const p = storeDatabase.products.find(item => item.id === id);
  if (!p) return;

  const modal = document.getElementById("product-modal");
  const content = document.getElementById("modal-product-content");
  const images = (p.images && p.images.trim() !== "") ? p.images.split(",").map(i => i.trim()) : ["https://via.placeholder.com/400"];

  content.innerHTML = `
    <div class="modal-gallery">
      <img id="main-modal-img" src="${images[0]}" style="width:100%; border-radius:12px; object-fit:cover;" onerror="this.src='https://via.placeholder.com/400';">
      <div class="thumb-list" style="display:flex; gap:0.5rem; margin-top:0.5rem; overflow-x:auto;">
        ${images.map(img => `<img src="${img}" style="width:60px; height:60px; border-radius:6px; cursor:pointer; object-fit:cover;" onclick="document.getElementById('main-modal-img').src='${img}'" onerror="this.src='https://via.placeholder.com/100';">`).join('')}
      </div>
    </div>
    <div class="modal-info" style="margin-top: 1rem;">
      <h3>${p.title}</h3>
      <p class="modal-vendor" style="font-size:0.85rem; color:#64748b;">Merchant: ${p.vendorName || 'Official'}</p>
      <p class="modal-price" style="font-size:1.25rem; font-weight:700; color:#0f172a; margin:0.5rem 0;">GHS ${parseFloat(p.salePrice || 0).toFixed(2)}</p>
      <p class="modal-desc" style="font-size:0.9rem; line-height:1.5; color:#334155;">${p.description || 'No additional details provided.'}</p>
      <button class="primary-pay-btn" style="margin-top:1rem;" onclick="addToCart('${p.id}')">Add to Shopping Bag</button>
    </div>
  `;
  modal.classList.remove("hidden");
};

window.addToCart = function(id) {
  const p = storeDatabase.products.find(item => item.id === id);
  if (!p) return;

  const existing = customerCart.find(c => c.product.id === id);
  if (existing) {
    existing.quantity += 1;
  } else {
    customerCart.push({ product: p, quantity: 1 });
  }

  updateCartUI();
  
  const productModal = document.getElementById("product-modal");
  if (productModal) productModal.classList.add("hidden");
};

function updateCartUI() {
  const wrapper = document.getElementById("cart-items-wrapper");
  const badge = document.getElementById("cart-counter");
  const subtotalElem = document.getElementById("cart-subtotal");
  const totalElem = document.getElementById("cart-grand-total");
  const checkoutBtn = document.getElementById("execute-checkout-btn");

  let total = 0;
  let count = 0;

  if (!wrapper) return;

  if (customerCart.length === 0) {
    wrapper.innerHTML = `<p style="padding: 1.5rem; text-align: center; color: #64748b;">Your selection bag is empty.</p>`;
    if (badge) badge.textContent = "0";
    if (subtotalElem) subtotalElem.textContent = "GHS 0.00";
    if (totalElem) totalElem.textContent = "GHS 0.00";
    if (checkoutBtn) checkoutBtn.disabled = true;
    return;
  }

  wrapper.innerHTML = customerCart.map(item => {
    const itemTotal = item.product.salePrice * item.quantity;
    total += itemTotal;
    count += item.quantity;

    return `
      <div class="cart-row" style="display:flex; justify-content:space-between; align-items:center; padding: 0.8rem 0; border-bottom: 1px solid #f1f5f9;">
        <div>
          <h5 style="margin:0;">${item.product.title}</h5>
          <small style="color:#64748b;">GHS ${parseFloat(item.product.salePrice).toFixed(2)} x ${item.quantity}</small>
        </div>
        <button style="background:none; border:none; color:#ef4444; font-size:0.85rem; cursor:pointer;" onclick="removeFromCart('${item.product.id}')">Remove</button>
      </div>
    `;
  }).join('');

  if (badge) badge.textContent = count;
  if (subtotalElem) subtotalElem.textContent = `GHS ${total.toFixed(2)}`;
  if (totalElem) totalElem.textContent = `GHS ${total.toFixed(2)}`;
  if (checkoutBtn) checkoutBtn.disabled = false;
}

window.removeFromCart = function(id) {
  customerCart = customerCart.filter(item => item.product.id !== id);
  updateCartUI();
};

function initializePaystackCheckout() {
  if (customerCart.length === 0) {
    alert("Please add items to your cart before proceeding.");
    return;
  }

  const name = document.getElementById("checkout-name").value.trim();
  const email = document.getElementById("checkout-email").value.trim();
  const phone = document.getElementById("checkout-phone").value.trim();
  const deliveryType = document.getElementById("checkout-delivery-type").value;
  const location = document.getElementById("checkout-location").value.trim();

  if (!name || !email || !phone || !location) {
    alert("Please fill in all required customer and delivery details.");
    return;
  }

  const sampleProduct = customerCart[0].product;
  let totalAmount = customerCart.reduce((sum, item) => sum + (item.product.salePrice * item.quantity), 0);

  // Paystack setup options
  const paystackOptions = {
    key: PAYSTACK_PUBLIC_KEY,
    email: email,
    amount: Math.round(totalAmount * 100),
    currency: "GHS",
    metadata: {
      custom_fields: [
        { display_name: "Customer Name", variable_name: "customer_name", value: name },
        { display_name: "Phone Number", variable_name: "phone_number", value: phone },
        { display_name: "Delivery Zone", variable_name: "delivery_zone", value: deliveryType },
        { display_name: "Location Details", variable_name: "location_details", value: location },
        { display_name: "Vendor", variable_name: "vendor", value: sampleProduct.vendorName || "Official" }
      ]
    },
    callback: function(response) {
      // 1. Send Order Payload to Backend
      fetch(TELEMETRY_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
          action: "createOrder",
          order: {
            vendorTracked: sampleProduct.vendorName || "ShopSphere Official",
            paystackRef: response.reference,
            customerName: name,
            phone: phone,
            locationDetails: location,
            deliveryType: deliveryType,
            itemizedSummary: customerCart.map(i => `${i.product.title} (x${i.quantity})`).join(", "),
            totalAmount: totalAmount
          }
        })
      });

      // 2. Determine Vendor WhatsApp Number
      const vendorPhone = sampleProduct.vendorPhone || storeDatabase.settings.support_whatsapp || "233598160732";
      const cleanPhone = vendorPhone.replace(/[^0-9]/g, "");

      // 3. Format Prefilled WhatsApp Message
      const itemsList = customerCart.map(i => `• ${i.product.title} (Qty: ${i.quantity})`).join("\n");
      const messageText = 
`*NEW ORDER PLACED ON SHOPSPHERE* 🛒

*Order Ref:* ${response.reference}
*Merchant:* ${sampleProduct.vendorName || "ShopSphere Official"}

*Customer Details:*
• *Name:* ${name}
• *Phone:* ${phone}
• *Delivery Zone:* ${deliveryType}
• *Location:* ${location}

*Items Ordered:*
${itemsList}

*Total Paid:* GHS ${totalAmount.toFixed(2)}

_Payment verified via Paystack._`;

      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

      // 4. Reset Cart and Redirect Automatically to WhatsApp
      customerCart = [];
      updateCartUI();
      const cartDrawer = document.getElementById("cart-drawer");
      if (cartDrawer) cartDrawer.classList.add("hidden");

      window.location.href = whatsappUrl;
    },
    onClose: function() {
      alert("Payment canceled.");
    }
  };

  // Safe routing for ACCT_ vs SPL_ codes
  if (
    sampleProduct.paystackSplitCode && 
    sampleProduct.paystackSplitCode !== "MAIN" && 
    sampleProduct.paystackSplitCode.trim() !== ""
  ) {
    const code = sampleProduct.paystackSplitCode.trim();
    if (code.startsWith("ACCT_")) {
      paystackOptions.subaccount = code;
    } else if (code.startsWith("SPL_")) {
      paystackOptions.split_code = code;
    }
  }

  const handler = PaystackPop.setup(paystackOptions);
  handler.openIframe();
}

function attachEventListeners() {
  const toggleCartBtn = document.getElementById("toggle-cart-btn");
  if (toggleCartBtn) {
    toggleCartBtn.onclick = () => {
      const cartDrawer = document.getElementById("cart-drawer");
      if (cartDrawer) cartDrawer.classList.remove("hidden");
    };
  }

  const closeCartBtn = document.getElementById("close-cart-btn");
  if (closeCartBtn) {
    closeCartBtn.onclick = () => {
      const cartDrawer = document.getElementById("cart-drawer");
      if (cartDrawer) cartDrawer.classList.add("hidden");
    };
  }

  const closeModalBtn = document.getElementById("close-modal");
  if (closeModalBtn) {
    closeModalBtn.onclick = () => {
      const productModal = document.getElementById("product-modal");
      if (productModal) productModal.classList.add("hidden");
    };
  }

  const executeCheckoutBtn = document.getElementById("execute-checkout-btn");
  if (executeCheckoutBtn) {
    executeCheckoutBtn.onclick = initializePaystackCheckout;
  }

  const globalSearch = document.getElementById("global-search");
  if (globalSearch) {
    globalSearch.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase().trim();
      if (!term) {
        renderProducts(storeDatabase.products);
        return;
      }
      const matches = storeDatabase.products.filter(p => 
        (p.title && p.title.toLowerCase().includes(term)) || 
        (p.category && p.category.toLowerCase().includes(term)) || 
        (p.vendorName && p.vendorName.toLowerCase().includes(term))
      );
      renderProducts(matches);
    });
  }
}
