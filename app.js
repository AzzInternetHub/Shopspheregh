/**
 * ShopSphere Core Application Scripting Architecture
 * Multi-Vendor Multi-Sheet Platform Engine
 * Developed by: Azz Internet Hub
 */

const TELEMETRY_ENDPOINT = "https://script.google.com/macros/s/AKfycbyhPV74CWRyQ2BXoGbxt5mwv1bYX5VgkI31QPDi16HuZa6CrZZ5JQZ4tH8BiTCyQF-dwA/exec";
const PAYSTACK_PUBLIC_KEY = "pk_live_8c56d91cee6884d988dd8355981e0134ab72b94b";

let storeDatabase = { products: [], categories: [], settings: {} };
let customerCart = [];
let activeGalleryIndices = {};
let currentSelectedCategory = null;

document.addEventListener("DOMContentLoaded", () => {
  // Explicitly purge any existing stale client-side cache from previous setups
  try {
    localStorage.removeItem("shopsphere_local_cache");
    localStorage.clear();
  } catch (e) {
    console.warn("Storage clear notice:", e);
  }

  initializeApplicationEngine();
  attachUIEventListeners();
});

async function initializeApplicationEngine() {
  try {
    fetch(`${TELEMETRY_ENDPOINT}?action=logVisitor`).catch(() => {});
    
    showStorefrontSkeletons();

    // Direct Live Fetch with dynamic timestamp to strictly prevent HTTP/Browser caching
    const response = await fetch(`${TELEMETRY_ENDPOINT}?action=getStoreData&_t=${Date.now()}`);
    const payload = await response.json();
    
    if (payload.success && payload.data) {
      storeDatabase = payload.data;
      
      renderAppBranding();
      renderStorefrontCategories();
      renderProductGrid(storeDatabase.products);
    } else {
      throw new Error("Invalid payload structure received");
    }
  } catch (error) {
    console.error("Communications error with Apps Script Engine:", error);
    
    const container = document.getElementById("products-container");
    if (container) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem;">
          <p style="color: #64748b; font-weight: 500; margin-bottom: 1rem;">Unable to connect to live inventory. Please check your connection.</p>
          <button onclick="initializeApplicationEngine()" style="padding: 0.6rem 1.2rem; background: #0f172a; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
            Retry
          </button>
        </div>
      `;
    }
  }
}

function showStorefrontSkeletons() {
  const container = document.getElementById("products-container");
  if(!container) return;
  
  let skeletonHTML = "";
  for(let i = 0; i < 4; i++) {
    skeletonHTML += `
      <div class="skeleton-card">
        <div class="skeleton-media"></div>
        <div class="skeleton-text">
          <div class="skeleton-line" style="width: 35%;"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>
      </div>
    `;
  }
  container.innerHTML = skeletonHTML;
}

function renderAppBranding() {
  const mottoElement = document.getElementById("branding-motto");
  if(storeDatabase.settings.company_motto && mottoElement) {
    mottoElement.textContent = storeDatabase.settings.company_motto;
  }
}

function renderStorefrontCategories() {
  const container = document.getElementById("categories-container");
  if(!container) return;
  container.innerHTML = "";

  storeDatabase.categories.forEach(cat => {
    const card = document.createElement("div");
    card.className = `category-luxury-card ${currentSelectedCategory === cat.name ? 'active-cat' : ''}`;
    card.onclick = () => filterCatalogByCategory(cat.name);
    card.innerHTML = `
      <img src="${cat.image}" class="category-card-img" alt="${cat.name}" loading="lazy">
      <div class="category-card-info">
        <h4>${cat.name}</h4>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderProductGrid(productsList) {
  const container = document.getElementById("products-container");
  if(!container) return;
  container.innerHTML = "";

  if(!productsList || productsList.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: #64748b; font-weight: 500;">No products match your current selection.</p>`;
    return;
  }

  productsList.forEach(product => {
    const imageArray = product.images.split(",");
    const primaryImage = imageArray[0] ? imageArray[0].trim() : "https://via.placeholder.com/400";
    
    const discountTag = product.originalPrice > product.salePrice 
      ? `<span class="sale-price-bold">GHS ${parseFloat(product.salePrice).toFixed(2)}</span>
         <span class="retail-price-slashed">GHS ${parseFloat(product.originalPrice).toFixed(2)}</span>`
      : `<span class="sale-price-bold">GHS ${parseFloat(product.salePrice).toFixed(2)}</span>`;

    const vendorDisplay = product.vendorName && product.vendorName.toLowerCase() !== "main"
      ? `<span class="vendor-card-tag"><span class="material-icons-outlined" style="font-size:12px;">storefront</span> ${product.vendorName}</span>`
      : `<span class="vendor-card-tag official-tag"><span class="material-icons-outlined" style="font-size:12px;">verified</span> Official</span>`;

    const card = document.createElement("div");
    card.className = "product-showcase-card";
    card.innerHTML = `
      <div class="card-media-frame" onclick="triggerProductLightbox('${product.id}')">
        <img src="${primaryImage}" alt="${product.title}" loading="lazy" onload="this.classList.add('loaded')">
      </div>
      <div class="card-details-panel">
        <div class="item-badge-row">
          ${vendorDisplay}
        </div>
        <h4 class="item-title-txt" onclick="triggerProductLightbox('${product.id}')" style="cursor:pointer">${product.title}</h4>
        <div class="price-matrix-line">
          ${discountTag}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function filterCatalogByCategory(categoryName) {
  currentSelectedCategory = categoryName;
  const resetBtn = document.getElementById("reset-category-btn");
  const titleElem = document.getElementById("catalog-title");
  
  if(resetBtn) resetBtn.classList.remove("hidden");
  if(titleElem) titleElem.textContent = `${categoryName} Collection`;
  
  const matching = storeDatabase.products.filter(p => p.category.toLowerCase() === categoryName.toLowerCase());
  renderStorefrontCategories();
  renderProductGrid(matching);
  
  document.getElementById("product-showcase").scrollIntoView({ behavior: 'smooth' });
}

function resetCategoryFilter() {
  currentSelectedCategory = null;
  const resetBtn = document.getElementById("reset-category-btn");
  const titleElem = document.getElementById("catalog-title");
  
  if(resetBtn) resetBtn.classList.add("hidden");
  if(titleElem) titleElem.textContent = "Featured Masterpieces";
  
  renderStorefrontCategories();
  renderProductGrid(storeDatabase.products);
}

window.triggerProductLightbox = function(productId) {
  const item = storeDatabase.products.find(p => p.id === productId);
  if(!item) return;

  const modal = document.getElementById("product-modal");
  const modalContent = document.getElementById("modal-product-content");
  const images = item.images.split(",").map(url => url.trim());
  
  activeGalleryIndices[item.id] = 0;

  const internalVendorLabel = item.vendorName && item.vendorName.toLowerCase() !== "main" ? item.vendorName : "ShopSphere Official";

  modalContent.innerHTML = `
    <div class="gallery-composite-stage">
      <div class="hero-viewscreen" onclick="openFullscreenImageViewer('${images[0]}')">
        <img id="lightbox-main-view" src="${images[0]}" alt="${item.title}">
        <div class="gallery-counter-tag"><span id="gallery-current-idx">1</span>/${images.length}</div>
        <div class="expand-badge"><span class="material-icons-outlined" style="font-size:14px;">open_in_full</span> Tap to Expand</div>
      </div>
      <div class="thumbnails-strip">
        ${images.map((img, i) => `
          <img src="${img}" class="thumb-frame-item ${i===0?'active-thumb':''}" 
               onclick="updateLightboxActiveView('${item.id}', ${i}, '${img}')" alt="Thumbnail">
        `).join('')}
      </div>
    </div>
    <div class="product-editorial-panel">
      <h2 class="editorial-title" style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem;">${item.title}</h2>
      <p class="editorial-brand" style="font-size: 0.9rem; color: #64748b; margin-bottom: 1rem;">Seller: <strong>${internalVendorLabel}</strong></p>
      <div class="editorial-pricing" style="margin-bottom: 1rem;">
        <span class="sale-price-bold" style="font-size: 1.5rem;">GHS ${parseFloat(item.salePrice).toFixed(2)}</span>
      </div>
      <hr class="divider-line">
      <div class="editorial-desc" style="margin: 1rem 0;">
        <h5 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 0.3rem;">Overview</h5>
        <p style="font-size: 0.9rem; color: #475569; line-height: 1.5;">${item.description}</p>
      </div>
      <div class="editorial-specs" style="margin-bottom: 1.5rem;">
        <h5 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 0.3rem;">Specifications</h5>
        <p style="font-size: 0.9rem; color: #475569;">${item.specifications || 'Standard Grade Certification'}</p>
      </div>
      <button class="primary-pay-btn" onclick="addItemToSelectionCart('${item.id}')">
        <span class="material-icons-outlined">shopping_bag</span>
        <span>Add Selections to Bag</span>
      </button>
    </div>
  `;

  modal.classList.remove("hidden");
};

window.updateLightboxActiveView = function(productId, index, url) {
  activeGalleryIndices[productId] = index;
  const mainView = document.getElementById("lightbox-main-view");
  mainView.src = url;
  document.getElementById("gallery-current-idx").textContent = index + 1;
  
  const viewscreen = document.querySelector(".hero-viewscreen");
  if(viewscreen) viewscreen.onclick = () => openFullscreenImageViewer(url);

  const thumbs = document.querySelectorAll(".thumb-frame-item");
  thumbs.forEach((t, i) => {
    if(i === index) t.classList.add("active-thumb");
    else t.classList.remove("active-thumb");
  });
};

window.openFullscreenImageViewer = function(imgUrl) {
  const fsModal = document.getElementById("fullscreen-image-modal");
  const fsImg = document.getElementById("fullscreen-active-img");
  if(!fsModal || !fsImg) return;

  fsImg.src = imgUrl;
  fsModal.classList.remove("hidden");
};

function closeFullscreenImageViewer() {
  const fsModal = document.getElementById("fullscreen-image-modal");
  if(fsModal) fsModal.classList.add("hidden");
}

window.addItemToSelectionCart = function(productId) {
  const product = storeDatabase.products.find(p => p.id === productId);
  if(!product) return;

  const existingInstance = customerCart.find(item => item.product.id === productId);
  if (existingInstance) {
    existingInstance.quantity += 1;
  } else {
    customerCart.push({ product, quantity: 1 });
  }
  
  synchronizeCartState();
  document.getElementById("product-modal").classList.add("hidden");
  document.getElementById("cart-drawer").classList.remove("hidden");
};

function synchronizeCartState() {
  const counter = document.getElementById("cart-counter");
  const wrapper = document.getElementById("cart-items-wrapper");
  const splitNotice = document.getElementById("vendor-split-notice");
  const checkoutBtn = document.getElementById("execute-checkout-btn");
  
  let totalCount = 0;
  let subtotal = 0;
  let detectedSplits = new Set();
  let vendorNamesInCart = new Set();
  
  wrapper.innerHTML = "";
  
  if (customerCart.length === 0) {
    wrapper.innerHTML = `<p style="text-align: center; color: #94a3b8; padding: 2rem 0;">Your selection bag is currently empty.</p>`;
  }

  customerCart.forEach(entry => {
    totalCount += entry.quantity;
    subtotal += entry.product.salePrice * entry.quantity;
    
    const splitCode = (entry.product.paystackSplitCode && entry.product.paystackSplitCode.toString().trim() !== "") 
      ? entry.product.paystackSplitCode.toString().replace(/[\r\n\s\t]+/g, '') 
      : "MAIN";
    
    const vendorDisplayName = (entry.product.vendorName && entry.product.vendorName.trim() !== "")
      ? entry.product.vendorName.trim()
      : "ShopSphere Official";

    detectedSplits.add(splitCode.toUpperCase());
    vendorNamesInCart.add(vendorDisplayName);
    
    const row = document.createElement("div");
    row.className = "cart-item-row";
    row.innerHTML = `
      <div class="cart-row-details">
        <h6>${entry.product.title}</h6>
        <p style="font-size:11px; color:#64748b; margin: 2px 0;">Seller: ${vendorDisplayName}</p>
        <p>GHS ${parseFloat(entry.product.salePrice).toFixed(2)} each</p>
      </div>
      <div style="display: flex; align-items: center; gap: 0.6rem;">
        <div class="cart-qty-controls">
          <button class="qty-stepper-btn" onclick="modifyQuantityStep('${entry.product.id}', -1)">
            <span class="material-icons-outlined" style="font-size: 16px;">remove</span>
          </button>
          <span class="cart-qty-value">${entry.quantity}</span>
          <button class="qty-stepper-btn" onclick="modifyQuantityStep('${entry.product.id}', 1)">
            <span class="material-icons-outlined" style="font-size: 16px;">add</span>
          </button>
        </div>
        <button class="cart-purge-icon-btn" onclick="purgeCartEntry('${entry.product.id}')" title="Remove Item">
          <span class="material-icons-outlined" style="font-size: 18px;">delete_outline</span>
        </button>
      </div>
    `;
    wrapper.appendChild(row);
  });
  
  counter.textContent = totalCount;
  document.getElementById("cart-subtotal").textContent = `GHS ${subtotal.toFixed(2)}`;
  
  const deliveryType = document.getElementById("checkout-delivery-type").value;
  if (deliveryType === "Dungu") {
    document.getElementById("cart-delivery-cost").textContent = "FREE (UDS Dungu)";
    document.getElementById("cart-grand-total").textContent = `GHS ${subtotal.toFixed(2)}`;
  } else {
    document.getElementById("cart-delivery-cost").textContent = "Communicated Shortly";
    document.getElementById("cart-grand-total").textContent = `GHS ${subtotal.toFixed(2)} + Fee`;
  }

  if (detectedSplits.size > 1) {
    splitNotice.innerHTML = `
      <span class="material-icons-outlined" style="font-size:16px;">warning</span>
      <span>Multiple sellers detected (${Array.from(vendorNamesInCart).join(", ")}). Please checkout items from one seller at a time.</span>
    `;
    splitNotice.classList.remove("hidden");
    checkoutBtn.disabled = true;
    checkoutBtn.style.opacity = "0.4";
    checkoutBtn.style.cursor = "not-allowed";
  } else {
    splitNotice.classList.add("hidden");
    checkoutBtn.disabled = false;
    checkoutBtn.style.opacity = "1";
    checkoutBtn.style.cursor = "pointer";
  }
}

window.modifyQuantityStep = function(productId, step) {
  const item = customerCart.find(entry => entry.product.id === productId);
  if(!item) return;
  
  item.quantity += step;
  if(item.quantity <= 0) {
    purgeCartEntry(productId);
  } else {
    synchronizeCartState();
  }
};

window.purgeCartEntry = function(productId) {
  customerCart = customerCart.filter(entry => entry.product.id !== productId);
  synchronizeCartState();
};

function attachUIEventListeners() {
  document.getElementById("toggle-cart-btn").onclick = () => document.getElementById("cart-drawer").classList.remove("hidden");
  document.getElementById("close-cart-btn").onclick = () => document.getElementById("cart-drawer").classList.add("hidden");
  document.getElementById("close-modal").onclick = () => document.getElementById("product-modal").classList.add("hidden");
  
  const resetBtn = document.getElementById("reset-category-btn");
  if(resetBtn) resetBtn.onclick = resetCategoryFilter;

  const fsModal = document.getElementById("fullscreen-image-modal");
  const fsCloseBtn = document.getElementById("close-fullscreen-img");
  if(fsModal) fsModal.onclick = closeFullscreenImageViewer;
  if(fsCloseBtn) fsCloseBtn.onclick = closeFullscreenImageViewer;

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeFullscreenImageViewer();
      document.getElementById("product-modal").classList.add("hidden");
      document.getElementById("cart-drawer").classList.add("hidden");
    }
  });

  document.getElementById("checkout-delivery-type").onchange = () => synchronizeCartState();

  document.getElementById("global-search").addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    if(query === "") {
      renderProductGrid(storeDatabase.products);
      return;
    }
    const filtered = storeDatabase.products.filter(p => 
      p.title.toLowerCase().includes(query) || 
      p.category.toLowerCase().includes(query)
    );
    renderProductGrid(filtered);
  });

  document.getElementById("execute-checkout-btn").onclick = () => initPaystackTransaction();
}

function initPaystackTransaction() {
  const name = document.getElementById("checkout-name").value.trim();
  const email = document.getElementById("checkout-email").value.trim();
  const phone = document.getElementById("checkout-phone").value.trim();
  const location = document.getElementById("checkout-location").value.trim();

  if(!name || !email || !phone || !location) {
    alert("Please fill out all checkout details to ensure smooth delivery.");
    return;
  }

  if(!email.includes("@") || !email.includes(".")) {
    alert("Please enter a valid working email address.");
    return;
  }

  if(customerCart.length === 0) {
    alert("Your shopping cart bag is empty.");
    return;
  }

  let subtotal = customerCart.reduce((acc, entry) => acc + (entry.product.salePrice * entry.quantity), 0);

  const activeProduct = customerCart[0].product;
  const targetSplitCode = (activeProduct.paystackSplitCode && activeProduct.paystackSplitCode.toString().trim() !== "") 
    ? activeProduct.paystackSplitCode.toString().replace(/[\r\n\s\t]+/g, '') 
    : "MAIN";

  const paystackPayload = {
    key: PAYSTACK_PUBLIC_KEY,
    email: email,
    amount: Math.round(subtotal * 100),
    currency: "GHS",
    metadata: {
      custom_fields: [
        { display_name: "Customer Name", variable_name: "customer_name", value: name },
        { display_name: "WhatsApp Number", variable_name: "whatsapp_number", value: phone },
        { display_name: "Location Details", variable_name: "location_details", value: location },
        { display_name: "Vendor Name", variable_name: "vendor_name", value: activeProduct.vendorName || "Main Official" }
      ]
    },
    callback: function(response) {
      finalizeSystemOrder(response.reference, name, email, phone, subtotal);
    },
    onClose: function() {
      alert("Payment process was canceled.");
    }
  };

  if (targetSplitCode.toUpperCase() !== "MAIN") {
    paystackPayload.split_code = targetSplitCode;
  }

  const handler = PaystackPop.setup(paystackPayload);
  handler.openIframe();
}

async function finalizeSystemOrder(paystackRef, name, email, phone, itemSubtotal) {
  const deliveryType = document.getElementById("checkout-delivery-type").value;
  const location = document.getElementById("checkout-location").value.trim();
  const descriptiveCartSummary = customerCart.map(e => `${e.product.title} (Qty: ${e.quantity})`).join(", ");
  
  const activeProduct = customerCart[0].product;
  const finalVendorName = activeProduct.vendorName || "ShopSphere Official";

  const checkSplit = (activeProduct.paystackSplitCode && activeProduct.paystackSplitCode.toString().trim() !== "")
    ? activeProduct.paystackSplitCode.toString().replace(/[\r\n\s\t]+/g, '').toUpperCase()
    : "MAIN";
    
  const receiptPaymentLabel = (checkSplit !== "MAIN") ? "Processed via Split" : "Direct Merchant Payment";

  const orderPayload = {
    action: "createOrder",
    order: {
      customerName: name,
      customerEmail: email,
      phone: phone,
      deliveryType: deliveryType === "Dungu" ? "UDS Dungu Campus" : "Outside Campus / Different Town",
      locationDetails: location,
      totalAmount: itemSubtotal,
      paystackRef: paystackRef,
      vendorTracked: finalVendorName,
      itemizedSummary: descriptiveCartSummary, 
      cartItems: customerCart.map(e => ({ id: e.product.id, title: e.product.title, qty: e.quantity }))
    }
  };

  try {
    const targetPhone = activeProduct.vendorPhone || storeDatabase.settings.support_whatsapp || "233598160732";
    
    let messageText = `*New ShopSphere Order Confirmed!* 🛒\n\n`;
    messageText += `*Customer Name:* ${name}\n`;
    messageText += `*Phone Number:* ${phone}\n`;
    messageText += `*Paystack Ref:* ${paystackRef}\n`;
    messageText += `*Seller:* ${finalVendorName}\n`;
    
    if (deliveryType === 'Dungu') {
      messageText += `*Delivery Mode:* Within UDS Dungu Campus (FREE Delivery) 🎉\n`;
    } else {
      messageText += `*Delivery Mode:* Outside Campus / Different Town (Pending Notice) ⚠️\n`;
    }
    
    messageText += `*Address Info:* ${location}\n\n`;
    messageText += `*📦 ITEMS ORDERED:*\n`;
    customerCart.forEach((entry, idx) => {
      let lineTotal = entry.product.salePrice * entry.quantity;
      messageText += `${idx + 1}. ${entry.product.title} x${entry.quantity} -> GHS ${lineTotal.toFixed(2)}\n`;
    });
    
    messageText += `\n*Paid Amount (${receiptPaymentLabel}):* GHS ${itemSubtotal.toFixed(2)}\n`;
    if (deliveryType !== 'Dungu') {
      messageText += `*Final Balance:* GHS ${itemSubtotal.toFixed(2)} + [Delivery Fee pending verification]\n`;
    }
    messageText += `\nThank you for shopping on ShopSphere!`;

    await fetch(TELEMETRY_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload)
    });

    customerCart = [];
    synchronizeCartState();
    document.getElementById("cart-drawer").classList.add("hidden");

    window.location.href = `https://wa.me/${targetPhone}?text=${encodeURIComponent(messageText)}`;
    
  } catch (error) {
    console.error("Order logging crash: ", error);
    alert("Transaction completed successfully! Logging error encountered. Contact platform support with Ref: " + paystackRef);
  }
}

// Unregister Service Worker if active to prevent persistent offline caching
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (let registration of registrations) {
      registration.unregister();
    }
  });
}
