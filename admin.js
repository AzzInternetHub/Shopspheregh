const TELEMETRY_ENDPOINT = "https://script.google.com/macros/s/AKfycbyhPV74CWRyQ2BXoGbxt5mwv1bYX5VgkI31QPDi16HuZa6CrZZ5JQZ4tH8BiTCyQF-dwA/exec";

let activeVendor = localStorage.getItem("shopsphere_vendor_name") || "";
let activePasskey = localStorage.getItem("shopsphere_vendor_passkey") || "";
let vendorProducts = [];
let selectedImageMode = "file";

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  if (activeVendor && activePasskey) {
    verifyAndLoadDashboard();
  }
});

// =========================================================================
// LIGHT / DARK MODE TOGGLE SYSTEM
// =========================================================================
function initTheme() {
  const savedTheme = localStorage.getItem("shopsphere_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeButtons(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("shopsphere_theme", newTheme);
  updateThemeButtons(newTheme);
}

function updateThemeButtons(theme) {
  const label = theme === "dark" ? "☀️ Light" : "🌙 Dark";
  const loginBtn = document.getElementById("theme-btn-login");
  const dashBtn = document.getElementById("theme-btn-dash");
  if (loginBtn) loginBtn.innerText = label;
  if (dashBtn) dashBtn.innerText = label;
}

// =========================================================================
// UI HELPERS
// =========================================================================
function setImageMode(mode) {
  selectedImageMode = mode;
  const fileContainer = document.getElementById("file-upload-container");
  const linkContainer = document.getElementById("link-upload-container");
  const tabFile = document.getElementById("tab-file");
  const tabLink = document.getElementById("tab-link");

  if (mode === 'file') {
    fileContainer.classList.remove("hidden");
    linkContainer.classList.add("hidden");
    tabFile.classList.add("active-tab");
    tabLink.classList.remove("active-tab");
    document.getElementById("p-images").value = ""; 
  } else {
    linkContainer.classList.remove("hidden");
    fileContainer.classList.add("hidden");
    tabLink.classList.add("active-tab");
    tabFile.classList.remove("active-tab");
    document.getElementById("p-file-input").value = ""; 
  }
}

function showLoading(msg) {
  document.getElementById("loading-text").innerText = msg || "Processing request...";
  document.getElementById("loading-overlay").classList.remove("hidden");
}

function hideLoading() {
  document.getElementById("loading-overlay").classList.add("hidden");
}

// =========================================================================
// AUTHENTICATION
// =========================================================================
async function loginVendor() {
  const vendor = document.getElementById("vendor-select").value;
  const passkey = document.getElementById("vendor-passkey").value.trim();

  if (!passkey) {
    alert("Please enter passkey");
    return;
  }

  showLoading("Authenticating...");

  try {
    const res = await fetch(`${TELEMETRY_ENDPOINT}?action=vendorLogin&vendor=${encodeURIComponent(vendor)}&passkey=${encodeURIComponent(passkey)}`);
    const data = await res.json();

    if (data.success) {
      activeVendor = vendor;
      activePasskey = passkey;
      localStorage.setItem("shopsphere_vendor_name", vendor);
      localStorage.setItem("shopsphere_vendor_passkey", passkey);
      verifyAndLoadDashboard();
    } else {
      alert("Invalid Passkey for " + vendor);
    }
  } catch (err) {
    alert("Connection error: " + err.message);
  } finally {
    hideLoading();
  }
}

function logoutVendor() {
  localStorage.removeItem("shopsphere_vendor_name");
  localStorage.removeItem("shopsphere_vendor_passkey");
  activeVendor = "";
  activePasskey = "";
  document.getElementById("dashboard-panel").classList.add("hidden");
  document.getElementById("login-card").classList.remove("hidden");
}

async function verifyAndLoadDashboard() {
  document.getElementById("login-card").classList.add("hidden");
  document.getElementById("dashboard-panel").classList.remove("hidden");
  document.getElementById("active-vendor-title").textContent = activeVendor + " Dashboard";

  await fetchVendorInventory();
}

// =========================================================================
// INVENTORY DATA MANAGEMENT
// =========================================================================
async function fetchVendorInventory() {
  const container = document.getElementById("product-list-container");
  container.innerHTML = "<p style='color:var(--text-muted);'>Fetching inventory from Google Sheet...</p>";

  try {
    // Added timestamp cache buster (_t) for instantaneous updates
    const res = await fetch(`${TELEMETRY_ENDPOINT}?action=getVendorProducts&vendor=${encodeURIComponent(activeVendor)}&passkey=${encodeURIComponent(activePasskey)}&_t=${Date.now()}`);
    const data = await res.json();

    if (data.success) {
      vendorProducts = data.products || [];
      renderVendorProducts();
    } else {
      alert("Session expired or unauthorized.");
      logoutVendor();
    }
  } catch (err) {
    container.innerHTML = "<p style='color:var(--danger);'>Failed to load products.</p>";
  }
}

function renderVendorProducts() {
  const container = document.getElementById("product-list-container");
  container.innerHTML = "";

  if (vendorProducts.length === 0) {
    container.innerHTML = "<p style='color:var(--text-muted);'>No products uploaded yet.</p>";
    return;
  }

  vendorProducts.forEach(p => {
    const firstImg = p.images ? p.images.split(",")[0].trim() : "https://via.placeholder.com/50";
    const item = document.createElement("div");
    item.className = "product-item";
    item.innerHTML = `
      <div class="flex-center">
        <img src="${firstImg}" class="product-img" alt="${p.title}">
        <div>
          <strong>[${p.rawId}] ${p.title}</strong>
          <p style="font-size:12px; color:var(--text-muted);">${p.category} | GHS ${p.salePrice} | ${p.status}</p>
        </div>
      </div>
      <div>
        <button class="edit-btn action-btn" onclick="editProduct('${p.rawId}')">Edit</button>
        <button class="danger-btn action-btn" onclick="deleteProduct('${p.rawId}')">Delete</button>
      </div>
    `;
    container.appendChild(item);
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result.split(',')[1];
      resolve({
        fileName: file.name,
        mimeType: file.type,
        base64Data: base64String
      });
    };
    reader.onerror = error => reject(error);
  });
}

// =========================================================================
// SEQUENTIAL PRODUCT ID GENERATOR (PROD-xxx Starting from 004)
// =========================================================================
function generateSequentialProductId() {
  let highestNum = 3; // Starts counter search so minimum generated ID is PROD-004

  vendorProducts.forEach(p => {
    if (p.rawId && typeof p.rawId === 'string') {
      const match = p.rawId.match(/PROD-(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > highestNum) {
          highestNum = num;
        }
      }
    }
  });

  const nextNum = highestNum + 1;
  const paddedNum = String(nextNum).padStart(3, '0');
  return `PROD-${paddedNum}`;
}

async function handleSaveProduct(e) {
  e.preventDefault();
  const saveBtn = document.getElementById("save-btn");
  saveBtn.disabled = true;

  let finalImagesString = "";

  if (selectedImageMode === "file") {
    const fileInput = document.getElementById("p-file-input");
    
    if (!fileInput.files || fileInput.files.length === 0) {
      const existingText = document.getElementById("p-images").value.trim();
      if (!existingText) {
        alert("Please select at least one photo from your device.");
        saveBtn.disabled = false;
        return;
      }
      finalImagesString = existingText;
    } else {
      showLoading("Uploading images to Google Drive...");
      let uploadedUrls = [];

      for (let i = 0; i < fileInput.files.length; i++) {
        try {
          const fileData = await fileToBase64(fileInput.files[i]);
          
          const uploadRes = await fetch(TELEMETRY_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
              action: "uploadImageToDrive",
              vendor: activeVendor,
              passkey: activePasskey,
              ...fileData
            })
          });

          const uploadJson = await uploadRes.json();
          if (uploadJson.success && uploadJson.fileUrl) {
            uploadedUrls.push(uploadJson.fileUrl);
          } else {
            throw new Error(uploadJson.error || "Upload failed");
          }
        } catch (err) {
          alert(`Failed to upload ${fileInput.files[i].name}: ${err.message}`);
          saveBtn.disabled = false;
          hideLoading();
          return;
        }
      }
      finalImagesString = uploadedUrls.join(", ");
    }
  } 
  else if (selectedImageMode === "link") {
    const pastedUrls = document.getElementById("p-images").value.trim();
    if (!pastedUrls) {
      alert("Please enter at least one image URL link.");
      saveBtn.disabled = false;
      return;
    }
    finalImagesString = pastedUrls;
  }

  showLoading("Saving to Google Sheets...");

  const existingRawId = document.getElementById("p-rawId").value;
  // If editing an existing item, keep its rawId. If new, generate PROD-004...
  const rawId = existingRawId ? existingRawId : generateSequentialProductId();
  
  const title = document.getElementById("p-title").value.trim();
  const category = document.getElementById("p-category").value.trim();
  const status = document.getElementById("p-status").value;
  const salePrice = parseFloat(document.getElementById("p-salePrice").value);
  const originalPrice = parseFloat(document.getElementById("p-originalPrice").value) || salePrice;
  const description = document.getElementById("p-description").value.trim();
  const specifications = document.getElementById("p-specifications").value.trim();

  const productPayload = {
    rawId, title, category, status, salePrice, originalPrice, images: finalImagesString, description, specifications
  };

  try {
    const res = await fetch(TELEMETRY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "saveVendorProduct",
        vendor: activeVendor,
        passkey: activePasskey,
        product: productPayload
      })
    });

    const json = await res.json();

    if (json.success) {
      alert(`Product [${rawId}] saved successfully!`);
      document.getElementById("product-form").reset();
      document.getElementById("p-rawId").value = "";
      document.getElementById("form-title").textContent = "Add / Edit Product";
      setImageMode('file');
      
      await fetchVendorInventory();
    } else {
      alert("Save failed: " + (json.error || "Unknown error"));
    }
  } catch (err) {
    alert("Failed to save product: " + err.message);
  } finally {
    saveBtn.disabled = false;
    hideLoading();
  }
}

function editProduct(rawId) {
  const p = vendorProducts.find(item => item.rawId.toString() === rawId.toString());
  if (!p) return;

  document.getElementById("p-rawId").value = p.rawId;
  document.getElementById("p-title").value = p.title;
  document.getElementById("p-category").value = p.category;
  document.getElementById("p-status").value = p.status || "In Stock";
  document.getElementById("p-salePrice").value = p.salePrice;
  document.getElementById("p-originalPrice").value = p.originalPrice;
  document.getElementById("p-images").value = p.images;
  document.getElementById("p-description").value = p.description;
  document.getElementById("p-specifications").value = p.specifications;

  setImageMode('link');
  document.getElementById("form-title").textContent = "Editing: " + p.title + " (" + p.rawId + ")";
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteProduct(rawId) {
  if (!confirm(`Are you sure you want to delete product ${rawId}?`)) return;

  showLoading("Deleting product...");

  try {
    const res = await fetch(TELEMETRY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "deleteVendorProduct",
        vendor: activeVendor,
        passkey: activePasskey,
        rawId: rawId
      })
    });

    const json = await res.json();
    if (json.success) {
      alert("Product deleted.");
      await fetchVendorInventory();
    } else {
      alert("Delete failed: " + (json.error || "Unknown error"));
    }
  } catch (err) {
    alert("Delete failed: " + err.message);
  } finally {
    hideLoading();
  }
}

// =========================================================================
// ORDERS MANAGEMENT
// =========================================================================
function switchMainView(view) {
  const prodSec = document.getElementById("section-products");
  const orderSec = document.getElementById("section-orders");
  const navProd = document.getElementById("nav-products");
  const navOrders = document.getElementById("nav-orders");

  if (view === "products") {
    prodSec.classList.remove("hidden");
    orderSec.classList.add("hidden");
    navProd.classList.add("active-view");
    navOrders.classList.remove("active-view");
  } else {
    orderSec.classList.remove("hidden");
    prodSec.classList.add("hidden");
    navOrders.classList.add("active-view");
    navProd.classList.remove("active-view");
    fetchVendorOrders();
  }
}

async function fetchVendorOrders() {
  const container = document.getElementById("orders-list-container");
  container.innerHTML = "<p style='color:var(--text-muted);'>Syncing orders from Google Sheets...</p>";

  try {
    const res = await fetch(`${TELEMETRY_ENDPOINT}?action=getVendorOrders&vendor=${encodeURIComponent(activeVendor)}&passkey=${encodeURIComponent(activePasskey)}&_t=${Date.now()}`);
    const data = await res.json();

    if (data.success && data.orders && data.orders.length > 0) {
      container.innerHTML = "";
      data.orders.reverse().forEach(ord => {
        const item = document.createElement("div");
        item.className = "order-card";
        item.innerHTML = `
          <div class="order-header">
            <span class="order-ref">Ref: ${ord.orderRef}</span>
            <span class="order-date">${new Date(ord.timestamp).toLocaleDateString()}</span>
          </div>
          <div class="order-detail"><strong>Customer:</strong> ${ord.customerName} (${ord.phone})</div>
          <div class="order-detail"><strong>Delivery:</strong> ${ord.deliveryType} - ${ord.locationDetails}</div>
          <div class="order-detail"><strong>Items:</strong> ${ord.itemizedSummary}</div>
          <div class="order-detail"><strong>Total Paid:</strong> GHS ${ord.totalAmount}</div>
          <span class="order-badge">✓ Paid via Paystack</span>
        `;
        container.appendChild(item);
      });
    } else {
      container.innerHTML = "<p style='color:var(--text-muted);'>No customer orders found yet.</p>";
    }
  } catch (err) {
    container.innerHTML = "<p style='color:var(--danger);'>Failed to retrieve orders log.</p>";
  }
}
