import { useState, useEffect, useContext, createContext, useCallback, useRef } from "react";
import { db } from "./firebase";
import {
  collection, onSnapshot, addDoc, serverTimestamp,
  query, orderBy, doc, getDoc
} from "firebase/firestore";

// ─── CONTEXT ─────────────────────────────────────────────────────────────────
const AppContext = createContext();

// ─── FALLBACK DATA (shown while Firebase loads) ───────────────────────────────
const FALLBACK_CATEGORIES = [
  { id: "fruits", name: "Fruits", emoji: "🍎", color: "#FF6B6B", bg: "#FFF0F0" },
  { id: "vegetables", name: "Vegetables", emoji: "🥦", color: "#51CF66", bg: "#F0FFF4" },
  { id: "dairy", name: "Dairy", emoji: "🥛", color: "#339AF0", bg: "#F0F7FF" },
  { id: "snacks", name: "Snacks", emoji: "🍿", color: "#FF922B", bg: "#FFF5EB" },
  { id: "beverages", name: "Beverages", emoji: "🧃", color: "#CC5DE8", bg: "#F9F0FF" },
  { id: "bakery", name: "Bakery", emoji: "🍞", color: "#F59F00", bg: "#FFFBEB" },
  { id: "meat", name: "Meat", emoji: "🍗", color: "#E64980", bg: "#FFF0F6" },
  { id: "frozen", name: "Frozen", emoji: "🧊", color: "#1098AD", bg: "#E3FAFC" },
];

const FALLBACK_PRODUCTS = [
  { id: "p1", category: "fruits", name: "Fresh Apples", unit: "kg", price: 120, image: "🍎", badge: "Organic", available: true },
  { id: "p2", category: "fruits", name: "Ripe Bananas", unit: "dozen", price: 45, image: "🍌", badge: "Fresh", available: true },
  { id: "p3", category: "fruits", name: "Sweet Mangoes", unit: "kg", price: 180, image: "🥭", badge: "Seasonal", available: true },
  { id: "p4", category: "fruits", name: "Watermelon", unit: "piece", price: 60, image: "🍉", badge: null, available: true },
  { id: "p5", category: "vegetables", name: "Broccoli", unit: "kg", price: 70, image: "🥦", badge: "Organic", available: true },
  { id: "p6", category: "vegetables", name: "Carrots", unit: "kg", price: 40, image: "🥕", badge: null, available: true },
  { id: "p7", category: "vegetables", name: "Tomatoes", unit: "kg", price: 35, image: "🍅", badge: "Fresh", available: true },
  { id: "p8", category: "vegetables", name: "Spinach", unit: "bunch", price: 25, image: "🥬", badge: "Organic", available: true },
  { id: "p9", category: "dairy", name: "Full Cream Milk", unit: "litre", price: 60, image: "🥛", badge: "Daily Fresh", available: true },
  { id: "p10", category: "dairy", name: "Amul Butter", unit: "pack", price: 55, image: "🧈", badge: null, available: true },
  { id: "p11", category: "dairy", name: "Greek Yogurt", unit: "200g", price: 65, image: "🫙", badge: "Probiotic", available: true },
  { id: "p12", category: "dairy", name: "Cheddar Cheese", unit: "200g", price: 180, image: "🧀", badge: null, available: true },
  { id: "p13", category: "snacks", name: "Lays Classic", unit: "pack", price: 20, image: "🥔", badge: "Hot Deal", available: true },
  { id: "p14", category: "snacks", name: "Dark Chocolate", unit: "bar", price: 99, image: "🍫", badge: "Premium", available: true },
  { id: "p15", category: "snacks", name: "Mixed Nuts", unit: "200g", price: 145, image: "🥜", badge: "Healthy", available: true },
  { id: "p16", category: "beverages", name: "Orange Juice", unit: "litre", price: 85, image: "🍊", badge: "No Sugar", available: true },
  { id: "p17", category: "beverages", name: "Green Tea", unit: "box", price: 120, image: "🍵", badge: "Antioxidant", available: true },
  { id: "p18", category: "beverages", name: "Mineral Water", unit: "1L", price: 20, image: "💧", badge: null, available: true },
  { id: "p19", category: "bakery", name: "Multigrain Bread", unit: "loaf", price: 50, image: "🍞", badge: "Baked Today", available: true },
  { id: "p20", category: "bakery", name: "Croissants", unit: "pack of 4", price: 80, image: "🥐", badge: "Fresh", available: true },
];

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, width: "90%", maxWidth: 360, pointerEvents: "none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background: "#1a1a2e", color: "#fff", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, fontSize: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", animation: "slideDown 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
          <span style={{ fontSize: 20 }}>{t.icon}</span><span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── PROVIDER ─────────────────────────────────────────────────────────────────
function AppProvider({ children }) {
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [banners, setBanners] = useState([
    { id: "b1", title: "Flash Sale! 🔥", subtitle: "Up to 40% off on fruits", bg: "linear-gradient(135deg, #667eea, #764ba2)", active: true },
    { id: "b2", title: "Free Delivery 🚀", subtitle: "On orders above ₹299", bg: "linear-gradient(135deg, #f093fb, #f5576c)", active: true },
    { id: "b3", title: "Fresh & Organic 🌿", subtitle: "Farm to doorstep in 10 mins", bg: "linear-gradient(135deg, #4facfe, #00f2fe)", active: true },
  ]);
  const [settings, setSettings] = useState({ deliveryFee: 30, platformFee: 5, taxRate: 5, deliveryTime: 8 });
  const [offers, setOffers] = useState([]);
  const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem("qm_cart") || "{}"); } catch { return {}; } });
  const [page, setPage] = useState("home");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [address, setAddress] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [appliedOffer, setAppliedOffer] = useState(null);
  const toastId = useRef(0);

  // ── Firebase real-time listeners ──
  useEffect(() => {
    const unsubs = [];
    // Products
    unsubs.push(onSnapshot(query(collection(db, "products"), orderBy("name")), snap => {
      if (!snap.empty) setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false)));
    // Categories
    unsubs.push(onSnapshot(collection(db, "categories"), snap => {
      if (!snap.empty) setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {}));
    // Banners
    unsubs.push(onSnapshot(query(collection(db, "banners"), orderBy("order")), snap => {
      if (!snap.empty) setBanners(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(b => b.active));
    }, () => {}));
    // Settings
    unsubs.push(onSnapshot(doc(db, "config", "settings"), snap => {
      if (snap.exists()) setSettings(snap.data());
    }, () => {}));
    // Offers
    unsubs.push(onSnapshot(collection(db, "offers"), snap => {
      if (!snap.empty) setOffers(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(o => o.active));
    }, () => {}));
    return () => unsubs.forEach(u => u());
  }, []);

  useEffect(() => { localStorage.setItem("qm_cart", JSON.stringify(cart)); }, [cart]);

  const addToast = useCallback((message, icon = "✅") => {
    const id = ++toastId.current;
    setToasts(p => [...p, { id, message, icon }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 2500);
  }, []);

  const updateCart = useCallback((productId, delta) => {
    setCart(prev => {
      const qty = (prev[productId] || 0) + delta;
      if (qty <= 0) { const { [productId]: _, ...rest } = prev; return rest; }
      return { ...prev, [productId]: qty };
    });
  }, []);

  const addItem = useCallback((product) => {
    updateCart(product.id, 1);
    addToast(`${product.name} added to cart`, "🛒");
  }, [updateCart, addToast]);

  const applyOffer = useCallback((code) => {
    const offer = offers.find(o => o.code?.toLowerCase() === code.toLowerCase());
    if (!offer) { addToast("Invalid promo code", "❌"); return false; }
    setAppliedOffer(offer);
    addToast(`Promo applied! ${offer.type === "percent" ? offer.discount + "% off" : "₹" + offer.discount + " off"}`, "🎉");
    return true;
  }, [offers, addToast]);

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartItems = products.filter(p => cart[p.id] > 0).map(p => ({ ...p, qty: cart[p.id] }));
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryFee = settings.deliveryFee || 30;
  const platformFee = settings.platformFee || 5;
  const tax = Math.round(subtotal * (settings.taxRate || 5) / 100);
  let discount = 0;
  if (appliedOffer) {
    discount = appliedOffer.type === "percent" ? Math.round(subtotal * appliedOffer.discount / 100) : appliedOffer.discount;
    discount = Math.min(discount, subtotal);
  }
  const total = Math.max(0, subtotal + deliveryFee + platformFee + tax - discount);

  const placeOrder = useCallback(async (orderData) => {
    try {
      const docRef = await addDoc(collection(db, "orders"), {
        ...orderData, status: "pending", createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (e) {
      console.error("Order save failed:", e);
      return "local-" + Date.now();
    }
  }, []);

  return (
    <AppContext.Provider value={{
      products, categories, banners, settings, offers, appliedOffer,
      cart, page, setPage, selectedCategory, setSelectedCategory,
      address, setAddress, toasts, addToast, updateCart, addItem,
      cartCount, cartItems, subtotal, deliveryFee, platformFee, tax, discount, total,
      searchQuery, setSearchQuery, loading, placeOrder, applyOffer, setAppliedOffer, setCart
    }}>
      {children}
      <Toast toasts={toasts} />
    </AppContext.Provider>
  );
}

// ─── ADD BUTTON ───────────────────────────────────────────────────────────────
function AddButton({ product }) {
  const { cart, addItem, updateCart } = useContext(AppContext);
  const qty = cart[product.id] || 0;
  if (qty === 0) return (
    <button onClick={() => addItem(product)} style={{ background: "linear-gradient(135deg,#0ea5e9,#06b6d4)", color: "#fff", border: "none", borderRadius: 10, padding: "7px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 8px rgba(14,165,233,0.3)", whiteSpace: "nowrap" }}>+ ADD</button>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", background: "linear-gradient(135deg,#0ea5e9,#06b6d4)", borderRadius: 10, overflow: "hidden", boxShadow: "0 2px 8px rgba(14,165,233,0.3)" }}>
      <button onClick={() => updateCart(product.id, -1)} style={{ background: "none", border: "none", color: "#fff", width: 30, height: 32, fontSize: 18, cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>−</button>
      <span style={{ color: "#fff", fontWeight: 700, fontSize: 13, minWidth: 16, textAlign: "center" }}>{qty}</span>
      <button onClick={() => updateCart(product.id, 1)} style={{ background: "none", border: "none", color: "#fff", width: 30, height: 32, fontSize: 18, cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>+</button>
    </div>
  );
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProductCard({ product }) {
  const { categories } = useContext(AppContext);
  const cat = categories.find(c => c.id === product.category) || {};
  const isUrl = product.image && product.image.startsWith("http");
  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0", display: "flex", flexDirection: "column", gap: 8, position: "relative", overflow: "hidden" }}>
      {!product.available && <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.8)", zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 16 }}><span style={{ fontWeight: 800, color: "#94a3b8", fontSize: 12 }}>OUT OF STOCK</span></div>}
      {product.badge && <div style={{ position: "absolute", top: 8, left: 8, background: cat.color || "#0ea5e9", color: "#fff", borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 700, zIndex: 2 }}>{product.badge}</div>}
      {product.discount > 0 && <div style={{ position: "absolute", top: 8, right: 8, background: "#ef4444", color: "#fff", borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 700, zIndex: 2 }}>-{product.discount}%</div>}
      <div style={{ background: cat.bg || "#f8f8f8", borderRadius: 12, padding: "12px 0", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 80 }}>
        {isUrl
          ? <img src={product.image} alt={product.name} style={{ width: 70, height: 70, objectFit: "contain", borderRadius: 8 }} />
          : <span style={{ fontSize: 52, lineHeight: 1 }}>{product.image || "🛒"}</span>}
      </div>
      <div>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "#1a1a2e", lineHeight: 1.3 }}>{product.name}</p>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>per {product.unit}</p>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
        <div>
          {product.originalPrice && product.originalPrice > product.price && (
            <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", textDecoration: "line-through" }}>₹{product.originalPrice}</p>
          )}
          <span style={{ fontWeight: 800, fontSize: 15, color: "#1a1a2e" }}>₹{product.price}</span>
        </div>
        <AddButton product={product} />
      </div>
    </div>
  );
}

// ─── MAP MODAL ────────────────────────────────────────────────────────────────
function MapModal({ onClose, onSave }) {
  const [mode, setMode] = useState("manual");
  const [inputAddr, setInputAddr] = useState("");
  const [detected, setDetected] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const [pinAddr, setPinAddr] = useState("");
  const mapsLoaded = typeof window !== "undefined" && window.google?.maps;

  useEffect(() => {
    if (mode !== "map" || !mapsLoaded || !mapRef.current) return;
    const center = { lat: 28.6139, lng: 77.2090 };
    mapInstance.current = new window.google.maps.Map(mapRef.current, { zoom: 15, center, disableDefaultUI: true });
    markerRef.current = new window.google.maps.Marker({ map: mapInstance.current, position: center, draggable: true });
    const geocoder = new window.google.maps.Geocoder();
    const updateAddr = pos => geocoder.geocode({ location: pos }, (res, s) => setPinAddr(s === "OK" && res[0] ? res[0].formatted_address : `${pos.lat().toFixed(4)}, ${pos.lng().toFixed(4)}`));
    updateAddr(markerRef.current.getPosition());
    markerRef.current.addListener("dragend", () => updateAddr(markerRef.current.getPosition()));
  }, [mode, mapsLoaded]);

  const detectLoc = () => {
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(pos => {
      if (mapsLoaded) {
        new window.google.maps.Geocoder().geocode({ location: { lat: pos.coords.latitude, lng: pos.coords.longitude } }, (res, s) => {
          setDetected(s === "OK" && res[0] ? res[0].formatted_address : `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
          setDetecting(false);
        });
      } else { setDetected(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`); setDetecting(false); }
    }, () => { setDetected("Could not detect location"); setDetecting(false); });
  };

  const save = () => {
    const addr = mode === "detect" ? detected : mode === "map" ? pinAddr : inputAddr;
    if (!addr) return;
    onSave(addr); onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 480, margin: "0 auto", padding: "24px 20px 40px", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, background: "#e2e8f0", borderRadius: 2, margin: "0 auto 20px" }} />
        <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>📍 Select Delivery Address</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[["detect", "📡 Detect"], ["manual", "✏️ Type"], ["map", "🗺️ Map"]].map(([v, l]) => (
            <button key={v} onClick={() => setMode(v)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `2px solid ${mode === v ? "#0ea5e9" : "#e2e8f0"}`, background: mode === v ? "#f0f9ff" : "#fff", color: mode === v ? "#0ea5e9" : "#64748b", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{l}</button>
          ))}
        </div>
        {mode === "detect" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <button onClick={detectLoc} disabled={detecting} style={{ background: "linear-gradient(135deg,#0ea5e9,#06b6d4)", color: "#fff", border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{detecting ? "Detecting..." : "📡 Detect My Location"}</button>
            {detected && <p style={{ marginTop: 16, color: "#334155", fontWeight: 600, fontSize: 13 }}>📍 {detected}</p>}
          </div>
        )}
        {mode === "manual" && <textarea value={inputAddr} onChange={e => setInputAddr(e.target.value)} placeholder="House no., Street, Area, City, Pincode..." rows={3} style={{ width: "100%", border: "2px solid #e2e8f0", borderRadius: 12, padding: "12px 14px", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box", resize: "none" }} onFocus={e => e.target.style.borderColor = "#0ea5e9"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />}
        {mode === "map" && (
          <div>
            {mapsLoaded ? <div ref={mapRef} style={{ height: 240, borderRadius: 12, marginBottom: 10 }} /> : <div style={{ height: 240, borderRadius: 12, background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}><p style={{ color: "#0284c7" }}>Loading map...</p></div>}
            {pinAddr && <p style={{ fontSize: 12, color: "#334155", fontWeight: 600, margin: 0 }}>📍 {pinAddr}</p>}
          </div>
        )}
        <button onClick={save} style={{ width: "100%", background: "linear-gradient(135deg,#0ea5e9,#06b6d4)", color: "#fff", border: "none", borderRadius: 14, padding: "15px 0", fontWeight: 800, fontSize: 16, cursor: "pointer", marginTop: 20, fontFamily: "inherit" }}>✅ Confirm Address</button>
      </div>
    </div>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage() {
  const { products, categories, banners, selectedCategory, setSelectedCategory, address, setAddress, searchQuery, setSearchQuery, loading, settings } = useContext(AppContext);
  const [showMap, setShowMap] = useState(false);
  const [bannerIdx, setBannerIdx] = useState(0);
  useEffect(() => { const t = setInterval(() => setBannerIdx(i => (i + 1) % Math.max(banners.length, 1)), 3500); return () => clearInterval(t); }, [banners.length]);

  const filtered = products.filter(p => {
    const catOk = selectedCategory === "all" || p.category === selectedCategory;
    const searchOk = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return catOk && searchOk && p.available !== false;
  });

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* HEADER */}
      <div style={{ background: "linear-gradient(160deg,#0f172a,#1e293b)", padding: "16px 16px 20px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, letterSpacing: 1 }}>DELIVERY IN</span>
              <span style={{ background: "#22c55e", color: "#fff", borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>{settings.deliveryTime || 8} MINS</span>
            </div>
            <button onClick={() => setShowMap(true)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 0 }}>
              <span style={{ color: "#38bdf8", fontSize: 14 }}>📍</span>
              <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 14, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{address ? address.slice(0, 28) + (address.length > 28 ? "..." : "") : "Select Location"}</span>
              <span style={{ color: "#94a3b8" }}>▾</span>
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ background: "linear-gradient(135deg,#0ea5e9,#06b6d4)", borderRadius: 10, padding: "6px 12px", cursor: "pointer" }}>
              <span style={{ color: "#fff", fontSize: 16 }}>👤</span>
            </div>
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>🔍</span>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder='Search groceries...' style={{ width: "100%", background: "#fff", border: "none", borderRadius: 14, padding: "12px 40px 12px 40px", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none", color: "#1e293b", fontWeight: 500 }} />
          {searchQuery && <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "#94a3b8", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", color: "#fff", fontSize: 11, fontFamily: "inherit" }}>✕</button>}
        </div>
      </div>

      {/* BANNER */}
      {!searchQuery && banners.length > 0 && (
        <div style={{ padding: "14px 16px 0" }}>
          <div style={{ background: banners[bannerIdx % banners.length]?.bg || "linear-gradient(135deg,#667eea,#764ba2)", borderRadius: 18, padding: "20px", position: "relative", overflow: "hidden", minHeight: 100, transition: "background 0.5s" }}>
            {banners[bannerIdx % banners.length]?.imageUrl && <img src={banners[bannerIdx % banners.length].imageUrl} alt="" style={{ position: "absolute", right: 0, top: 0, height: "100%", objectFit: "cover", opacity: 0.3 }} />}
            <p style={{ margin: "0 0 4px", color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: 600 }}>{banners[bannerIdx % banners.length]?.subtitle}</p>
            <h3 style={{ margin: 0, color: "#fff", fontSize: 20, fontWeight: 900 }}>{banners[bannerIdx % banners.length]?.title}</h3>
            {banners.length > 1 && (
              <div style={{ display: "flex", gap: 5, marginTop: 12 }}>
                {banners.map((_, i) => <div key={i} onClick={() => setBannerIdx(i)} style={{ width: i === bannerIdx % banners.length ? 20 : 6, height: 6, borderRadius: 3, background: i === bannerIdx % banners.length ? "#fff" : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all 0.3s" }} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CATEGORIES GRID */}
      {!searchQuery && (
        <div style={{ padding: "18px 0 4px" }}>
          <div style={{ padding: "0 16px", marginBottom: 12 }}><h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1a1a2e" }}>Categories</h2></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, padding: "0 16px" }}>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(selectedCategory === cat.id ? "all" : cat.id)} style={{ background: selectedCategory === cat.id ? cat.color : cat.bg || "#f8fafc", border: `2px solid ${selectedCategory === cat.id ? cat.color : "transparent"}`, borderRadius: 14, padding: "10px 4px 8px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, transition: "all 0.2s", fontFamily: "inherit" }}>
                <span style={{ fontSize: 24 }}>{cat.emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: selectedCategory === cat.id ? "#fff" : cat.color || "#64748b", lineHeight: 1, textAlign: "center" }}>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* FILTER PILLS */}
      <div style={{ overflowX: "auto", padding: "14px 16px 0", scrollbarWidth: "none" }}>
        <div style={{ display: "flex", gap: 8, width: "max-content" }}>
          {[{ id: "all", name: "All Items", emoji: "✨", color: "#0ea5e9", bg: "#f0f9ff" }, ...categories].map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} style={{ background: selectedCategory === cat.id ? cat.color : "#fff", color: selectedCategory === cat.id ? "#fff" : "#64748b", border: `2px solid ${selectedCategory === cat.id ? cat.color : "#e2e8f0"}`, borderRadius: 50, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", transition: "all 0.2s", boxShadow: selectedCategory === cat.id ? `0 4px 12px ${cat.color}40` : "none" }}>
              {cat.emoji} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* PRODUCTS */}
      <div style={{ padding: "14px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1a1a2e" }}>
            {searchQuery ? `"${searchQuery}"` : selectedCategory !== "all" ? categories.find(c => c.id === selectedCategory)?.name || "Products" : "All Products"}
          </h2>
          <span style={{ color: "#94a3b8", fontSize: 12 }}>{filtered.length} items</span>
        </div>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {[1,2,3,4,5,6].map(i => <div key={i} style={{ background: "#fff", borderRadius: 16, height: 200, animation: "pulse 1.5s infinite" }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🔍</div>
            <h3 style={{ color: "#1a1a2e", margin: "0 0 8px" }}>Nothing found</h3>
            <p style={{ color: "#94a3b8", margin: 0 }}>Try a different search or category</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {filtered.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>

      {showMap && <MapModal onClose={() => setShowMap(false)} onSave={setAddress} />}
    </div>
  );
}

// ─── CART PAGE ────────────────────────────────────────────────────────────────
function CartPage() {
  const { cartItems, updateCart, subtotal, deliveryFee, platformFee, tax, discount, total, setPage, applyOffer, appliedOffer, setAppliedOffer } = useContext(AppContext);
  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  const handleApply = () => {
    setPromoLoading(true);
    setTimeout(() => { applyOffer(promoInput); setPromoLoading(false); }, 600);
  };

  if (cartItems.length === 0) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", padding: 32, textAlign: "center" }}>
      <div style={{ fontSize: 80, marginBottom: 16 }}>🛒</div>
      <h2 style={{ color: "#1a1a2e", margin: "0 0 8px" }}>Your cart is empty</h2>
      <p style={{ color: "#94a3b8", margin: "0 0 28px" }}>Add some fresh groceries!</p>
      <button onClick={() => setPage("home")} style={{ background: "linear-gradient(135deg,#0ea5e9,#06b6d4)", color: "#fff", border: "none", borderRadius: 14, padding: "14px 32px", fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>Shop Now</button>
    </div>
  );

  return (
    <div style={{ paddingBottom: 120 }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #f0f0f0", padding: "16px", position: "sticky", top: 0, zIndex: 50 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>🛒 Cart ({cartItems.length})</h2>
      </div>
      <div style={{ margin: "12px 16px", background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }}>⚡</span>
        <div><p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#166534" }}>Express Delivery Active</p><p style={{ margin: 0, fontSize: 11, color: "#4ade80" }}>Items arriving fresh & fast</p></div>
      </div>
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {cartItems.map(item => (
          <div key={item.id} style={{ background: "#fff", borderRadius: 16, padding: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: 6, width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {item.image?.startsWith("http") ? <img src={item.image} alt={item.name} style={{ width: 40, height: 40, objectFit: "contain" }} /> : <span style={{ fontSize: 32 }}>{item.image || "🛒"}</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 13, color: "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>₹{item.price} / {item.unit}</p>
              <p style={{ margin: "3px 0 0", fontWeight: 800, fontSize: 14, color: "#0ea5e9" }}>₹{item.price * item.qty}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", background: "#f1f5f9", borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
              <button onClick={() => updateCart(item.id, -1)} style={{ background: "none", border: "none", width: 32, height: 32, fontSize: 18, cursor: "pointer", color: "#e11d48", fontWeight: 700, fontFamily: "inherit" }}>−</button>
              <span style={{ fontWeight: 800, fontSize: 14, minWidth: 18, textAlign: "center" }}>{item.qty}</span>
              <button onClick={() => updateCart(item.id, 1)} style={{ background: "none", border: "none", width: 32, height: 32, fontSize: 18, cursor: "pointer", color: "#22c55e", fontWeight: 700, fontFamily: "inherit" }}>+</button>
            </div>
          </div>
        ))}
      </div>

      {/* PROMO */}
      <div style={{ margin: "14px 16px 0", background: "#fff", borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        {appliedOffer ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🎉</span>
            <span style={{ flex: 1, color: "#166534", fontWeight: 700, fontSize: 13 }}>{appliedOffer.code} applied! Saving ₹{discount}</span>
            <button onClick={() => setAppliedOffer(null)} style={{ color: "#e11d48", fontWeight: 700, fontSize: 12, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Remove</button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>🏷️</span>
            <input value={promoInput} onChange={e => setPromoInput(e.target.value.toUpperCase())} placeholder="Promo code" style={{ flex: 1, border: "none", outline: "none", fontSize: 14, fontFamily: "inherit", background: "none", fontWeight: 600, letterSpacing: 1 }} />
            <button onClick={handleApply} disabled={!promoInput || promoLoading} style={{ color: promoInput ? "#0ea5e9" : "#cbd5e1", fontWeight: 800, fontSize: 13, background: "none", border: "none", cursor: promoInput ? "pointer" : "default", fontFamily: "inherit" }}>{promoLoading ? "..." : "APPLY"}</button>
          </div>
        )}
      </div>

      {/* BILL */}
      <div style={{ margin: "14px 16px 0", background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: "#1a1a2e" }}>Bill Summary</h3>
        {[["Item Total", `₹${subtotal}`], ["Delivery Fee", `₹${deliveryFee}`], ["Platform Fee", `₹${platformFee}`], [`GST & Taxes`, `₹${tax}`]].map(([l, v]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ color: "#64748b", fontSize: 14 }}>{l}</span>
            <span style={{ color: "#334155", fontWeight: 600, fontSize: 14 }}>{v}</span>
          </div>
        ))}
        {discount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ color: "#22c55e", fontSize: 14 }}>Promo Discount</span>
            <span style={{ color: "#22c55e", fontWeight: 700, fontSize: 14 }}>−₹{discount}</span>
          </div>
        )}
        <div style={{ borderTop: "2px dashed #e2e8f0", margin: "10px 0", paddingTop: 12, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 800, fontSize: 16 }}>Grand Total</span>
          <span style={{ fontWeight: 900, fontSize: 18, color: "#0ea5e9" }}>₹{total}</span>
        </div>
      </div>

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, padding: 16, background: "#fff", borderTop: "1px solid #f0f0f0", boxSizing: "border-box" }}>
        <button onClick={() => setPage("checkout")} style={{ width: "100%", background: "linear-gradient(135deg,#0ea5e9,#06b6d4)", color: "#fff", border: "none", borderRadius: 16, padding: "16px 24px", fontWeight: 800, fontSize: 16, cursor: "pointer", fontFamily: "inherit", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 6px 20px rgba(14,165,233,0.4)" }}>
          <span>Proceed to Checkout</span>
          <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "3px 12px" }}>₹{total}</span>
        </button>
      </div>
    </div>
  );
}

// ─── CHECKOUT PAGE ────────────────────────────────────────────────────────────
function CheckoutPage() {
  const { cartItems, subtotal, deliveryFee, platformFee, tax, discount, total, address, setAddress, setPage, addToast, placeOrder, setCart, appliedOffer } = useContext(AppContext);
  const [showMap, setShowMap] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [payMethod, setPayMethod] = useState("upi");

  const handleOrder = async () => {
    if (!address) { addToast("Please add delivery address", "📍"); return; }
    setLoading(true);
    const id = await placeOrder({
      items: cartItems.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, unit: i.unit })),
      subtotal, deliveryFee, platformFee, tax, discount, total, address,
      paymentMethod: payMethod, promoCode: appliedOffer?.code || null
    });
    setOrderId(id);
    setCart({});
    localStorage.removeItem("qm_cart");
    setLoading(false);
    setPlaced(true);
    addToast("Order placed! 🎉", "✅");
  };

  if (placed) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 32, textAlign: "center", background: "#f8fafc" }}>
      <div style={{ fontSize: 80, marginBottom: 16 }}>🎉</div>
      <h2 style={{ color: "#1a1a2e", margin: "0 0 8px", fontSize: 24, fontWeight: 900 }}>Order Confirmed!</h2>
      <p style={{ color: "#64748b", margin: "0 0 6px" }}>Your groceries are being prepared</p>
      <p style={{ color: "#94a3b8", fontSize: 12, margin: "0 0 20px" }}>Order ID: {orderId}</p>
      <div style={{ background: "#f0fdf4", borderRadius: 16, padding: "14px 24px", marginBottom: 24, border: "1px solid #bbf7d0" }}>
        <p style={{ color: "#166534", fontWeight: 800, margin: "0 0 4px" }}>⚡ Estimated Delivery: ~8 minutes</p>
        <p style={{ color: "#4ade80", margin: 0, fontSize: 12 }}>You'll receive live updates shortly</p>
      </div>
      <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", marginBottom: 28, width: "100%", maxWidth: 300 }}>
        <p style={{ color: "#94a3b8", fontSize: 11, margin: "0 0 4px", letterSpacing: 1 }}>AMOUNT PAID</p>
        <p style={{ color: "#0ea5e9", fontSize: 32, fontWeight: 900, margin: 0 }}>₹{total}</p>
      </div>
      <button onClick={() => setPage("home")} style={{ background: "linear-gradient(135deg,#0ea5e9,#06b6d4)", color: "#fff", border: "none", borderRadius: 14, padding: "14px 32px", fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>Continue Shopping</button>
    </div>
  );

  return (
    <div style={{ paddingBottom: 120 }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #f0f0f0", padding: 16, position: "sticky", top: 0, zIndex: 50 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>Checkout</h2>
      </div>

      {/* ADDRESS */}
      <div style={{ margin: "16px 16px 0" }}>
        <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#64748b", letterSpacing: 1 }}>DELIVERY ADDRESS</p>
        <div style={{ background: "#fff", borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", gap: 12 }}>
          <span style={{ fontSize: 22, marginTop: 2 }}>📍</span>
          <div style={{ flex: 1 }}>
            {address ? <><p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>Deliver Here</p><p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>{address}</p></> : <p style={{ margin: 0, color: "#94a3b8", fontSize: 14 }}>No address added</p>}
          </div>
          <button onClick={() => setShowMap(true)} style={{ color: "#0ea5e9", fontWeight: 700, fontSize: 12, background: "none", border: "1px solid #0ea5e9", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>{address ? "Change" : "Add"}</button>
        </div>
      </div>

      {/* ITEMS */}
      <div style={{ margin: "16px 16px 0" }}>
        <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#64748b", letterSpacing: 1 }}>ORDER ITEMS ({cartItems.length})</p>
        <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          {cartItems.map((item, idx) => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: idx < cartItems.length - 1 ? "1px solid #f8fafc" : "none" }}>
              <span style={{ fontSize: 24 }}>{item.image?.startsWith("http") ? "" : (item.image || "🛒")}</span>
              {item.image?.startsWith("http") && <img src={item.image} alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />}
              <div style={{ flex: 1 }}><p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "#1a1a2e" }}>{item.name}</p><p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>× {item.qty}</p></div>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#334155" }}>₹{item.price * item.qty}</span>
            </div>
          ))}
        </div>
      </div>

      {/* PAYMENT */}
      <div style={{ margin: "16px 16px 0", background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "#64748b", letterSpacing: 1 }}>PAYMENT METHOD</p>
        {[["upi", "💳 UPI / Card"], ["cod", "💵 Cash on Delivery"]].map(([val, label]) => (
          <div key={val} onClick={() => setPayMethod(val)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", cursor: "pointer", borderBottom: val === "upi" ? "1px solid #f1f5f9" : "none" }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${payMethod === val ? "#0ea5e9" : "#cbd5e1"}`, background: payMethod === val ? "#0ea5e9" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {payMethod === val && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
            </div>
            <span style={{ fontSize: 14, fontWeight: 500, color: "#334155" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* BILL */}
      <div style={{ margin: "16px 16px 0", background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: "#1a1a2e" }}>Payment Summary</h3>
        {[["Subtotal", subtotal], ["Delivery Fee", deliveryFee], ["Platform Fee", platformFee], ["Taxes", tax]].map(([l, v]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ color: "#64748b", fontSize: 14 }}>{l}</span>
            <span style={{ color: "#334155", fontWeight: 600, fontSize: 14 }}>₹{v}</span>
          </div>
        ))}
        {discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><span style={{ color: "#22c55e", fontSize: 14 }}>Discount</span><span style={{ color: "#22c55e", fontWeight: 700, fontSize: 14 }}>−₹{discount}</span></div>}
        <div style={{ borderTop: "2px solid #f1f5f9", marginTop: 10, paddingTop: 12, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 800, fontSize: 16 }}>Total</span>
          <span style={{ fontWeight: 900, fontSize: 20, color: "#0ea5e9" }}>₹{total}</span>
        </div>
      </div>

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, padding: 16, background: "#fff", borderTop: "1px solid #f0f0f0", boxSizing: "border-box" }}>
        <button onClick={handleOrder} disabled={loading} style={{ width: "100%", background: loading ? "#94a3b8" : "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff", border: "none", borderRadius: 16, padding: "16px 0", fontWeight: 800, fontSize: 16, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: "0 6px 20px rgba(34,197,94,0.4)", transition: "all 0.3s" }}>
          {loading ? "Placing Order..." : `Place Order · ₹${total}`}
        </button>
      </div>
      {showMap && <MapModal onClose={() => setShowMap(false)} onSave={setAddress} />}
    </div>
  );
}

// ─── ORDERS PAGE ──────────────────────────────────────────────────────────────
function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const STATUS_COLORS = { pending: "#f59f00", confirmed: "#0ea5e9", preparing: "#8b5cf6", out_for_delivery: "#f97316", delivered: "#22c55e", cancelled: "#ef4444" };
  const STATUS_LABELS = { pending: "⏳ Pending", confirmed: "✅ Confirmed", preparing: "👨‍🍳 Preparing", out_for_delivery: "🛵 On the Way", delivered: "📦 Delivered", cancelled: "❌ Cancelled" };

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #f0f0f0", padding: 16, position: "sticky", top: 0, zIndex: 50 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>📦 My Orders</h2>
      </div>
      {loading ? <div style={{ textAlign: "center", padding: 40 }}><p style={{ color: "#94a3b8" }}>Loading orders...</p></div>
        : orders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 32px" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📭</div>
            <h3 style={{ color: "#1a1a2e", margin: "0 0 8px" }}>No orders yet</h3>
            <p style={{ color: "#94a3b8" }}>Your order history will appear here</p>
          </div>
        ) : (
          <div style={{ padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
            {orders.map(order => (
              <div key={order.id} style={{ background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <div><p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>Order #{order.id?.slice(-6).toUpperCase()}</p><p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : "Recent"}</p></div>
                  <span style={{ background: `${STATUS_COLORS[order.status] || "#94a3b8"}20`, color: STATUS_COLORS[order.status] || "#94a3b8", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>{STATUS_LABELS[order.status] || order.status}</span>
                </div>
                <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
                  {(order.items || []).slice(0, 4).map((item, i) => <span key={i} style={{ background: "#f8fafc", borderRadius: 8, padding: "3px 8px", fontSize: 12, color: "#64748b" }}>{item.name} ×{item.qty}</span>)}
                  {(order.items || []).length > 4 && <span style={{ background: "#f8fafc", borderRadius: 8, padding: "3px 8px", fontSize: 12, color: "#64748b" }}>+{order.items.length - 4} more</span>}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>📍 {order.address?.slice(0, 30) || "Address not saved"}...</span>
                  <span style={{ fontWeight: 800, fontSize: 16, color: "#0ea5e9" }}>₹{order.total}</span>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// ─── FLOATING CART ────────────────────────────────────────────────────────────
function FloatingCart() {
  const { cartCount, total, setPage, page } = useContext(AppContext);
  if (cartCount === 0 || page === "cart" || page === "checkout") return null;
  return (
    <div style={{ position: "fixed", bottom: 72, left: "50%", transform: "translateX(-50%)", width: "calc(100% - 32px)", maxWidth: 448, zIndex: 200 }}>
      <button onClick={() => setPage("cart")} style={{ width: "100%", background: "linear-gradient(135deg,#0f172a,#1e3a5f)", color: "#fff", border: "none", borderRadius: 18, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ background: "#ef4444", color: "#fff", borderRadius: "50%", width: 22, height: 22, fontSize: 11, fontWeight: 900, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{cartCount} item{cartCount !== 1 ? "s" : ""} in cart</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 15 }}>₹{total}</span>
          <span style={{ background: "#0ea5e9", borderRadius: 8, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>View →</span>
        </div>
      </button>
    </div>
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
function BottomNav() {
  const { page, setPage, cartCount } = useContext(AppContext);
  const tabs = [{ id: "home", icon: "🏠", label: "Home" }, { id: "cart", icon: "🛒", label: "Cart", badge: cartCount }, { id: "orders", icon: "📦", label: "Orders" }];
  return (
    <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#fff", borderTop: "1px solid #f0f0f0", display: "flex", zIndex: 150, boxShadow: "0 -4px 20px rgba(0,0,0,0.06)" }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => setPage(tab.id)} style={{ flex: 1, background: "none", border: "none", padding: "10px 0 12px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontFamily: "inherit", position: "relative" }}>
          <span style={{ fontSize: 22, position: "relative" }}>
            {tab.icon}
            {tab.badge > 0 && <span style={{ position: "absolute", top: -4, right: -8, background: "#ef4444", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{tab.badge}</span>}
          </span>
          <span style={{ fontSize: 10, fontWeight: page === tab.id ? 800 : 500, color: page === tab.id ? "#0ea5e9" : "#94a3b8" }}>{tab.label}</span>
          {page === tab.id && <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 28, height: 3, background: "#0ea5e9", borderRadius: "0 0 4px 4px" }} />}
        </button>
      ))}
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AppProvider>
      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; font-family: 'Nunito', sans-serif; background: #f8fafc; }
        ::-webkit-scrollbar { display: none; }
        @keyframes slideDown { from { opacity:0; transform:translateY(-16px) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        input, button, textarea { -webkit-appearance: none; }
      `}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#f8fafc", position: "relative" }}>
        <InnerApp />
      </div>
    </AppProvider>
  );
}

function InnerApp() {
  const { page } = useContext(AppContext);
  return (
    <>
      {page === "home" && <HomePage />}
      {page === "cart" && <CartPage />}
      {page === "checkout" && <CheckoutPage />}
      {page === "orders" && <OrdersPage />}
      <FloatingCart />
      <BottomNav />
    </>
  );
}
