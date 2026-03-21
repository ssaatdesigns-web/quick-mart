import { useState, useEffect, useContext, createContext, useCallback, useRef } from "react";

const AppContext = createContext();

const CATEGORIES = [
  { id: "fruits", name: "Fruits", emoji: "🍎", color: "#FF6B6B", bg: "#FFF0F0" },
  { id: "vegetables", name: "Vegetables", emoji: "🥦", color: "#51CF66", bg: "#F0FFF4" },
  { id: "dairy", name: "Dairy", emoji: "🥛", color: "#339AF0", bg: "#F0F7FF" },
  { id: "snacks", name: "Snacks", emoji: "🍿", color: "#FF922B", bg: "#FFF5EB" },
  { id: "beverages", name: "Beverages", emoji: "🧃", color: "#CC5DE8", bg: "#F9F0FF" },
  { id: "bakery", name: "Bakery", emoji: "🍞", color: "#F59F00", bg: "#FFFBEB" },
  { id: "meat", name: "Meat", emoji: "🍗", color: "#E64980", bg: "#FFF0F6" },
  { id: "frozen", name: "Frozen", emoji: "🧊", color: "#1098AD", bg: "#E3FAFC" },
];

const PRODUCTS = [
  { id: 1, category: "fruits", name: "Fresh Apples", unit: "kg", price: 120, image: "🍎", badge: "Organic" },
  { id: 2, category: "fruits", name: "Ripe Bananas", unit: "dozen", price: 45, image: "🍌", badge: "Fresh" },
  { id: 3, category: "fruits", name: "Sweet Mangoes", unit: "kg", price: 180, image: "🥭", badge: "Seasonal" },
  { id: 4, category: "fruits", name: "Juicy Grapes", unit: "kg", price: 90, image: "🍇", badge: null },
  { id: 5, category: "fruits", name: "Watermelon", unit: "piece", price: 60, image: "🍉", badge: "Fresh" },
  { id: 6, category: "fruits", name: "Oranges", unit: "kg", price: 80, image: "🍊", badge: null },
  { id: 7, category: "vegetables", name: "Broccoli", unit: "kg", price: 70, image: "🥦", badge: "Organic" },
  { id: 8, category: "vegetables", name: "Carrots", unit: "kg", price: 40, image: "🥕", badge: null },
  { id: 9, category: "vegetables", name: "Tomatoes", unit: "kg", price: 35, image: "🍅", badge: "Fresh" },
  { id: 10, category: "vegetables", name: "Spinach", unit: "bunch", price: 25, image: "🥬", badge: "Organic" },
  { id: 11, category: "vegetables", name: "Bell Peppers", unit: "kg", price: 85, image: "🫑", badge: null },
  { id: 12, category: "vegetables", name: "Onions", unit: "kg", price: 30, image: "🧅", badge: null },
  { id: 13, category: "dairy", name: "Full Cream Milk", unit: "litre", price: 60, image: "🥛", badge: "Daily Fresh" },
  { id: 14, category: "dairy", name: "Amul Butter", unit: "pack", price: 55, image: "🧈", badge: null },
  { id: 15, category: "dairy", name: "Greek Yogurt", unit: "200g", price: 65, image: "🫙", badge: "Probiotic" },
  { id: 16, category: "dairy", name: "Cheddar Cheese", unit: "200g", price: 180, image: "🧀", badge: null },
  { id: 17, category: "snacks", name: "Lays Classic", unit: "pack", price: 20, image: "🥔", badge: "Hot Deal" },
  { id: 18, category: "snacks", name: "Popcorn", unit: "pack", price: 35, image: "🍿", badge: null },
  { id: 19, category: "snacks", name: "Dark Chocolate", unit: "bar", price: 99, image: "🍫", badge: "Premium" },
  { id: 20, category: "snacks", name: "Mixed Nuts", unit: "200g", price: 145, image: "🥜", badge: "Healthy" },
  { id: 21, category: "beverages", name: "Orange Juice", unit: "litre", price: 85, image: "🍊", badge: "No Sugar" },
  { id: 22, category: "beverages", name: "Green Tea", unit: "box", price: 120, image: "🍵", badge: "Antioxidant" },
  { id: 23, category: "beverages", name: "Mineral Water", unit: "1L", price: 20, image: "💧", badge: null },
  { id: 24, category: "bakery", name: "Multigrain Bread", unit: "loaf", price: 50, image: "🍞", badge: "Baked Today" },
  { id: 25, category: "bakery", name: "Croissants", unit: "pack of 4", price: 80, image: "🥐", badge: "Fresh" },
];

function Toast({ toasts }) {
  return (
    <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, width: "90%", maxWidth: 360 }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background: "#1a1a2e", color: "#fff", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, fontSize: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", animation: "slideDown 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
          <span style={{ fontSize: 20 }}>{t.icon}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

function AppProvider({ children }) {
  const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem("quickmart_cart") || "{}"); } catch { return {}; } });
  const [page, setPage] = useState("home");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [address, setAddress] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const toastId = useRef(0);

  useEffect(() => { localStorage.setItem("quickmart_cart", JSON.stringify(cart)); }, [cart]);

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

  const addItem = useCallback((product) => { updateCart(product.id, 1); addToast(`${product.name} added to cart`, "🛒"); }, [updateCart, addToast]);

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartItems = PRODUCTS.filter(p => cart[p.id] > 0).map(p => ({ ...p, qty: cart[p.id] }));
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const delivery = 30, platform = 5;
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + delivery + platform + tax;

  return (
    <AppContext.Provider value={{ cart, page, setPage, selectedCategory, setSelectedCategory, address, setAddress, toasts, addToast, updateCart, addItem, cartCount, cartItems, subtotal, delivery, platform, tax, total, searchQuery, setSearchQuery }}>
      {children}
      <Toast toasts={toasts} />
    </AppContext.Provider>
  );
}

function AddButton({ product }) {
  const { cart, addItem, updateCart } = useContext(AppContext);
  const qty = cart[product.id] || 0;
  if (qty === 0) return <button onClick={() => addItem(product)} style={{ background: "linear-gradient(135deg, #0ea5e9, #06b6d4)", color: "#fff", border: "none", borderRadius: 10, padding: "7px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", letterSpacing: 0.5, boxShadow: "0 2px 8px rgba(14,165,233,0.3)", fontFamily: "inherit" }}>+ ADD</button>;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, background: "linear-gradient(135deg, #0ea5e9, #06b6d4)", borderRadius: 10, overflow: "hidden", boxShadow: "0 2px 8px rgba(14,165,233,0.3)" }}>
      <button onClick={() => updateCart(product.id, -1)} style={{ background: "none", border: "none", color: "#fff", width: 30, height: 32, fontSize: 18, cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>-</button>
      <span style={{ color: "#fff", fontWeight: 700, fontSize: 13, minWidth: 16, textAlign: "center" }}>{qty}</span>
      <button onClick={() => updateCart(product.id, 1)} style={{ background: "none", border: "none", color: "#fff", width: 30, height: 32, fontSize: 18, cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>+</button>
    </div>
  );
}

function ProductCard({ product }) {
  const cat = CATEGORIES.find(c => c.id === product.category);
  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0", display: "flex", flexDirection: "column", gap: 8, position: "relative", overflow: "hidden" }}>
      {product.badge && <div style={{ position: "absolute", top: 8, left: 8, background: cat?.color || "#0ea5e9", color: "#fff", borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>{product.badge}</div>}
      <div style={{ fontSize: 52, textAlign: "center", lineHeight: 1, background: cat?.bg || "#f8f8f8", borderRadius: 12, padding: "16px 0" }}>{product.image}</div>
      <div>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "#1a1a2e", lineHeight: 1.3 }}>{product.name}</p>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>per {product.unit}</p>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
        <span style={{ fontWeight: 800, fontSize: 15, color: "#1a1a2e" }}>Rs.{product.price}</span>
        <AddButton product={product} />
      </div>
    </div>
  );
}

function CategoryPill({ cat, active, onClick }) {
  return <button onClick={onClick} style={{ background: active ? cat.color : "#fff", color: active ? "#fff" : "#64748b", border: `2px solid ${active ? cat.color : "#e2e8f0"}`, borderRadius: 50, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", transition: "all 0.2s", fontFamily: "inherit", boxShadow: active ? `0 4px 12px ${cat.color}40` : "none" }}>{cat.emoji} {cat.name}</button>;
}

function MapModal({ onClose, onSave }) {
  const [mode, setMode] = useState("manual");
  const [inputAddr, setInputAddr] = useState("");
  const [detected, setDetected] = useState(null);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const [pinAddr, setPinAddr] = useState("");
  const mapsLoaded = typeof window !== "undefined" && window.google && window.google.maps;

  useEffect(() => {
    if (mode !== "map" || !mapsLoaded || !mapRef.current) return;
    const center = { lat: 28.6139, lng: 77.2090 };
    mapInstance.current = new window.google.maps.Map(mapRef.current, { zoom: 15, center, disableDefaultUI: true });
    markerRef.current = new window.google.maps.Marker({ map: mapInstance.current, position: center, draggable: true });
    const geocoder = new window.google.maps.Geocoder();
    const updateAddress = (pos) => {
      geocoder.geocode({ location: pos }, (results, status) => {
        if (status === "OK" && results[0]) setPinAddr(results[0].formatted_address);
        else setPinAddr(`${pos.lat().toFixed(5)}, ${pos.lng().toFixed(5)}`);
      });
    };
    updateAddress(markerRef.current.getPosition());
    markerRef.current.addListener("dragend", () => updateAddress(markerRef.current.getPosition()));
  }, [mode, mapsLoaded]);

  const detectLocation = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(pos => {
      if (mapsLoaded) {
        new window.google.maps.Geocoder().geocode({ location: { lat: pos.coords.latitude, lng: pos.coords.longitude } }, (results, status) => {
          setDetected(status === "OK" && results[0] ? results[0].formatted_address : `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
          setLoading(false);
        });
      } else { setDetected(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`); setLoading(false); }
    }, () => { setDetected("Location unavailable"); setLoading(false); });
  };

  const handleSave = () => {
    const addr = mode === "detect" ? detected : mode === "map" ? pinAddr || "Pin dropped on map" : inputAddr;
    if (!addr) return;
    onSave(addr); onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 480, padding: "24px 20px 36px", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ width: 40, height: 4, background: "#e2e8f0", borderRadius: 2, margin: "0 auto 20px" }} />
        <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>Select Delivery Address</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[["detect", "Detect"], ["manual", "Type Address"], ["map", "Drop Pin"]].map(([v, l]) => (
            <button key={v} onClick={() => setMode(v)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `2px solid ${mode === v ? "#0ea5e9" : "#e2e8f0"}`, background: mode === v ? "#f0f9ff" : "#fff", color: mode === v ? "#0ea5e9" : "#64748b", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{l}</button>
          ))}
        </div>
        {mode === "detect" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <button onClick={detectLocation} disabled={loading} style={{ background: "linear-gradient(135deg, #0ea5e9, #06b6d4)", color: "#fff", border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>{loading ? "Detecting..." : "Detect My Location"}</button>
            {detected && <p style={{ marginTop: 16, color: "#334155", fontWeight: 600, fontSize: 13 }}>Location: {detected}</p>}
          </div>
        )}
        {mode === "manual" && <input value={inputAddr} onChange={e => setInputAddr(e.target.value)} placeholder="Enter your full address..." style={{ width: "100%", border: "2px solid #e2e8f0", borderRadius: 12, padding: "12px 14px", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = "#0ea5e9"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />}
        {mode === "map" && (
          <div>
            {mapsLoaded ? <div ref={mapRef} style={{ height: 250, borderRadius: 12, marginBottom: 12 }} /> : <div style={{ height: 250, borderRadius: 12, background: "linear-gradient(135deg, #e0f2fe, #bae6fd)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginBottom: 12 }}><span style={{ fontSize: 48 }}>Map</span><p style={{ color: "#0284c7", fontWeight: 600, margin: "8px 0 0" }}>Loading map...</p></div>}
            {pinAddr && <p style={{ margin: 0, fontSize: 12, color: "#334155", fontWeight: 600 }}>Selected: {pinAddr}</p>}
          </div>
        )}
        <button onClick={handleSave} style={{ width: "100%", background: "linear-gradient(135deg, #0ea5e9, #06b6d4)", color: "#fff", border: "none", borderRadius: 14, padding: "15px 0", fontWeight: 800, fontSize: 16, cursor: "pointer", marginTop: 20, fontFamily: "inherit" }}>Confirm Address</button>
      </div>
    </div>
  );
}

function HomePage() {
  const { selectedCategory, setSelectedCategory, address, setAddress, searchQuery, setSearchQuery } = useContext(AppContext);
  const [showMap, setShowMap] = useState(false);
  const banners = [
    { bg: "linear-gradient(135deg, #667eea, #764ba2)", title: "Flash Sale!", sub: "Up to 40% off on fruits", emoji: "Fruits" },
    { bg: "linear-gradient(135deg, #f093fb, #f5576c)", title: "Free Delivery", sub: "On orders above Rs.299", emoji: "Delivery" },
    { bg: "linear-gradient(135deg, #4facfe, #00f2fe)", title: "Fresh & Organic", sub: "Farm to doorstep in 10 mins", emoji: "Organic" },
  ];
  const [bannerIdx, setBannerIdx] = useState(0);
  useEffect(() => { const t = setInterval(() => setBannerIdx(i => (i + 1) % banners.length), 3500); return () => clearInterval(t); }, []);
  const filtered = PRODUCTS.filter(p => (selectedCategory === "all" || p.category === selectedCategory) && (!searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())));

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ background: "linear-gradient(160deg, #0f172a, #1e293b)", padding: "16px 16px 24px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, letterSpacing: 1 }}>DELIVERY IN</span>
              <span style={{ background: "#22c55e", color: "#fff", borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>8 MINS</span>
            </div>
            <button onClick={() => setShowMap(true)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 0 }}>
              <span style={{ fontSize: 15, color: "#38bdf8" }}>Pin</span>
              <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 14 }}>{address ? (address.length > 24 ? address.slice(0, 24) + "..." : address) : "Select Location"}</span>
              <span style={{ color: "#94a3b8", fontSize: 12 }}>v</span>
            </button>
          </div>
          <div style={{ background: "#1e3a5f", borderRadius: 12, padding: "8px 12px", fontSize: 14, cursor: "pointer", color: "#fff", fontWeight: 700 }}>Account</div>
        </div>
        <div style={{ position: "relative" }}>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder='Search "milk, apples, bread..."' style={{ width: "100%", background: "#fff", border: "none", borderRadius: 14, padding: "13px 14px 13px 16px", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none", color: "#1e293b", fontWeight: 500 }} />
          {searchQuery && <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "#94a3b8", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", color: "#fff", fontSize: 12, fontFamily: "inherit" }}>X</button>}
        </div>
      </div>

      {!searchQuery && (
        <div style={{ padding: "16px 16px 0" }}>
          <div style={{ background: banners[bannerIdx].bg, borderRadius: 18, padding: "20px 20px", position: "relative", overflow: "hidden", minHeight: 100, transition: "all 0.5s" }}>
            <div style={{ position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", opacity: 0.3, fontSize: 60, fontWeight: 900, color: "#fff" }}>{banners[bannerIdx].emoji}</div>
            <p style={{ margin: "0 0 4px", color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: 600 }}>{banners[bannerIdx].sub}</p>
            <h3 style={{ margin: 0, color: "#fff", fontSize: 20, fontWeight: 900 }}>{banners[bannerIdx].title}</h3>
            <div style={{ display: "flex", gap: 5, marginTop: 12 }}>
              {banners.map((_, i) => <div key={i} onClick={() => setBannerIdx(i)} style={{ width: i === bannerIdx ? 20 : 6, height: 6, borderRadius: 3, background: i === bannerIdx ? "#fff" : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all 0.3s" }} />)}
            </div>
          </div>
        </div>
      )}

      {!searchQuery && (
        <div style={{ padding: "20px 0 4px" }}>
          <div style={{ padding: "0 16px", marginBottom: 14 }}><h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1a1a2e" }}>Categories</h2></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, padding: "0 16px" }}>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(selectedCategory === cat.id ? "all" : cat.id)} style={{ background: selectedCategory === cat.id ? cat.color : cat.bg, border: `2px solid ${selectedCategory === cat.id ? cat.color : "transparent"}`, borderRadius: 14, padding: "12px 6px 10px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, transition: "all 0.2s", fontFamily: "inherit" }}>
                <span style={{ fontSize: 26 }}>{cat.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: selectedCategory === cat.id ? "#fff" : cat.color, lineHeight: 1 }}>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ overflowX: "auto", padding: "16px 16px 0", scrollbarWidth: "none" }}>
        <div style={{ display: "flex", gap: 8, width: "max-content" }}>
          <CategoryPill cat={{ id: "all", name: "All", emoji: "All", color: "#0ea5e9", bg: "#f0f9ff" }} active={selectedCategory === "all"} onClick={() => setSelectedCategory("all")} />
          {CATEGORIES.map(cat => <CategoryPill key={cat.id} cat={cat} active={selectedCategory === cat.id} onClick={() => setSelectedCategory(selectedCategory === cat.id ? "all" : cat.id)} />)}
        </div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1a1a2e" }}>{searchQuery ? `Results for "${searchQuery}"` : selectedCategory !== "all" ? CATEGORIES.find(c => c.id === selectedCategory)?.name : "All Products"}</h2>
          <span style={{ color: "#94a3b8", fontSize: 12 }}>{filtered.length} items</span>
        </div>
        {filtered.length === 0
          ? <div style={{ textAlign: "center", padding: "60px 20px" }}><h3 style={{ color: "#1a1a2e" }}>Nothing found</h3><p style={{ color: "#94a3b8" }}>Try a different search or category</p></div>
          : <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>{filtered.map(p => <ProductCard key={p.id} product={p} />)}</div>
        }
      </div>
      {showMap && <MapModal onClose={() => setShowMap(false)} onSave={setAddress} />}
    </div>
  );
}

function CartPage() {
  const { cartItems, updateCart, subtotal, delivery, platform, tax, total, setPage } = useContext(AppContext);
  if (cartItems.length === 0) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", padding: 32 }}>
      <div style={{ fontSize: 80, marginBottom: 20 }}>Cart</div>
      <h2 style={{ color: "#1a1a2e", margin: "0 0 8px" }}>Your cart is empty</h2>
      <p style={{ color: "#94a3b8", margin: "0 0 28px", textAlign: "center" }}>Add some groceries to get started!</p>
      <button onClick={() => setPage("home")} style={{ background: "linear-gradient(135deg, #0ea5e9, #06b6d4)", color: "#fff", border: "none", borderRadius: 14, padding: "14px 32px", fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>Browse Products</button>
    </div>
  );
  return (
    <div style={{ paddingBottom: 120 }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #f0f0f0", padding: "16px", position: "sticky", top: 0, zIndex: 50 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>My Cart ({cartItems.length} items)</h2>
      </div>
      <div style={{ margin: "12px 16px", background: "linear-gradient(135deg, #f0fdf4, #dcfce7)", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <div><p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#166534" }}>Delivery in 8 minutes</p><p style={{ margin: 0, fontSize: 11, color: "#4ade80" }}>Your order will arrive super fast!</p></div>
      </div>
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {cartItems.map(item => (
          <div key={item.id} style={{ background: "#fff", borderRadius: 16, padding: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: 8, fontSize: 36, lineHeight: 1 }}>{item.image}</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>{item.name}</p>
              <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>Rs.{item.price} per {item.unit}</p>
              <p style={{ margin: "4px 0 0", fontWeight: 700, fontSize: 14, color: "#0ea5e9" }}>Rs.{item.price * item.qty}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 2, background: "#f1f5f9", borderRadius: 10, overflow: "hidden" }}>
              <button onClick={() => updateCart(item.id, -1)} style={{ background: "none", border: "none", width: 32, height: 32, fontSize: 18, cursor: "pointer", color: "#e11d48", fontWeight: 700, fontFamily: "inherit" }}>-</button>
              <span style={{ fontWeight: 800, fontSize: 14, minWidth: 18, textAlign: "center" }}>{item.qty}</span>
              <button onClick={() => updateCart(item.id, 1)} style={{ background: "none", border: "none", width: 32, height: 32, fontSize: 18, cursor: "pointer", color: "#22c55e", fontWeight: 700, fontFamily: "inherit" }}>+</button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ margin: "16px 16px 0", background: "#fff", borderRadius: 16, padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: "#1a1a2e" }}>Bill Summary</h3>
        {[["Item Total", `Rs.${subtotal}`], ["Delivery Fee", `Rs.${delivery}`], ["Platform Fee", `Rs.${platform}`], ["GST (5%)", `Rs.${tax}`]].map(([label, val]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ color: "#64748b", fontSize: 14 }}>{label}</span>
            <span style={{ color: "#334155", fontWeight: 600, fontSize: 14 }}>{val}</span>
          </div>
        ))}
        <div style={{ borderTop: "2px dashed #e2e8f0", margin: "12px 0", paddingTop: 12, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 800, fontSize: 16 }}>Grand Total</span>
          <span style={{ fontWeight: 900, fontSize: 18, color: "#0ea5e9" }}>Rs.{total}</span>
        </div>
      </div>
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, padding: "16px", background: "#fff", borderTop: "1px solid #f0f0f0", boxSizing: "border-box" }}>
        <button onClick={() => setPage("checkout")} style={{ width: "100%", background: "linear-gradient(135deg, #0ea5e9, #06b6d4)", color: "#fff", border: "none", borderRadius: 16, padding: "16px 0", fontWeight: 800, fontSize: 17, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 6px 20px rgba(14,165,233,0.45)", display: "flex", justifyContent: "space-between", alignItems: "center", paddingLeft: 24, paddingRight: 24 }}>
          <span>Proceed to Checkout</span>
          <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "2px 10px", fontSize: 14 }}>Rs.{total}</span>
        </button>
      </div>
    </div>
  );
}

function CheckoutPage() {
  const { cartItems, subtotal, delivery, platform, tax, total, address, setAddress, setPage, addToast } = useContext(AppContext);
  const [showMap, setShowMap] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOrder = () => {
    if (!address) { addToast("Please select a delivery address first", "Alert"); return; }
    setLoading(true);
    const orderData = { items: cartItems, subtotal, delivery, platform, tax, total, address, timestamp: new Date().toISOString() };
    console.log("ORDER PLACED:", orderData);
    setTimeout(() => { setLoading(false); setPlaced(true); addToast("Order placed successfully!", "Success"); }, 1800);
  };

  if (placed) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 32, textAlign: "center" }}>
      <div style={{ fontSize: 80, marginBottom: 16 }}>Order</div>
      <h2 style={{ color: "#1a1a2e", margin: "0 0 8px", fontSize: 24, fontWeight: 900 }}>Order Placed!</h2>
      <p style={{ color: "#64748b", margin: "0 0 6px" }}>Your groceries are on the way</p>
      <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "12px 24px", marginBottom: 28 }}><p style={{ color: "#166534", fontWeight: 700, margin: 0 }}>Arriving in ~8 minutes</p></div>
      <div style={{ background: "#fff", borderRadius: 16, padding: 20, width: "100%", maxWidth: 320, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", marginBottom: 28 }}>
        <p style={{ margin: "0 0 6px", color: "#94a3b8", fontSize: 12 }}>ORDER TOTAL</p>
        <p style={{ margin: 0, fontSize: 32, fontWeight: 900, color: "#0ea5e9" }}>Rs.{total}</p>
      </div>
      <button onClick={() => setPage("home")} style={{ background: "linear-gradient(135deg, #0ea5e9, #06b6d4)", color: "#fff", border: "none", borderRadius: 14, padding: "14px 32px", fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>Back to Home</button>
    </div>
  );

  return (
    <div style={{ paddingBottom: 120 }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #f0f0f0", padding: "16px", position: "sticky", top: 0, zIndex: 50 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>Checkout</h2>
      </div>
      <div style={{ margin: "16px 16px 0" }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "#64748b", letterSpacing: 0.5 }}>DELIVERY ADDRESS</h3>
        <div style={{ background: "#fff", borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            {address ? <><p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>Delivery Location</p><p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>{address}</p></> : <p style={{ margin: 0, color: "#94a3b8", fontSize: 14 }}>No address selected</p>}
          </div>
          <button onClick={() => setShowMap(true)} style={{ color: "#0ea5e9", fontWeight: 700, fontSize: 13, background: "none", border: "1px solid #0ea5e9", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontFamily: "inherit" }}>{address ? "Change" : "Add"}</button>
        </div>
      </div>
      <div style={{ margin: "16px 16px 0" }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "#64748b", letterSpacing: 0.5 }}>ORDER ITEMS ({cartItems.length})</h3>
        <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          {cartItems.map((item, idx) => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: idx < cartItems.length - 1 ? "1px solid #f8fafc" : "none" }}>
              <span style={{ fontSize: 28 }}>{item.image}</span>
              <div style={{ flex: 1 }}><p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "#1a1a2e" }}>{item.name}</p><p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>x {item.qty}</p></div>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#334155" }}>Rs.{item.price * item.qty}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ margin: "16px 16px 0", background: "#fff", borderRadius: 16, padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: "#1a1a2e" }}>Payment Summary</h3>
        {[["Item Total", subtotal], ["Delivery Fee", delivery], ["Platform Fee", platform], ["GST (5%)", tax]].map(([label, val]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ color: "#64748b", fontSize: 14 }}>{label}</span>
            <span style={{ color: "#334155", fontWeight: 600, fontSize: 14 }}>Rs.{val}</span>
          </div>
        ))}
        <div style={{ borderTop: "2px solid #f1f5f9", margin: "12px 0 0", paddingTop: 12, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 800, fontSize: 16 }}>Total</span>
          <span style={{ fontWeight: 900, fontSize: 20, color: "#0ea5e9" }}>Rs.{total}</span>
        </div>
      </div>
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, padding: "16px", background: "#fff", borderTop: "1px solid #f0f0f0", boxSizing: "border-box" }}>
        <button onClick={handleOrder} disabled={loading} style={{ width: "100%", background: loading ? "#94a3b8" : "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff", border: "none", borderRadius: 16, padding: "16px 0", fontWeight: 800, fontSize: 17, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.3s" }}>
          {loading ? "Placing Order..." : `Place Order - Rs.${total}`}
        </button>
      </div>
      {showMap && <MapModal onClose={() => setShowMap(false)} onSave={setAddress} />}
    </div>
  );
}

function FloatingCart() {
  const { cartCount, total, setPage, page } = useContext(AppContext);
  if (cartCount === 0 || page === "cart" || page === "checkout") return null;
  return (
    <div style={{ position: "fixed", bottom: 70, left: "50%", transform: "translateX(-50%)", width: "calc(100% - 32px)", maxWidth: 448, zIndex: 200 }}>
      <button onClick={() => setPage("cart")} style={{ width: "100%", background: "linear-gradient(135deg, #0f172a, #1e3a5f)", color: "#fff", border: "none", borderRadius: 18, padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 8px 32px rgba(15,23,42,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ background: "#ef4444", color: "#fff", borderRadius: "50%", width: 22, height: 22, fontSize: 11, fontWeight: 900, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{cartCount} item{cartCount !== 1 ? "s" : ""} in cart</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 16 }}>Rs.{total}</span>
          <span style={{ fontWeight: 700 }}>View</span>
        </div>
      </button>
    </div>
  );
}

function BottomNav() {
  const { page, setPage, cartCount } = useContext(AppContext);
  const tabs = [{ id: "home", label: "Home" }, { id: "cart", label: "Cart", badge: cartCount }, { id: "checkout", label: "Orders" }];
  return (
    <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#fff", borderTop: "1px solid #f0f0f0", display: "flex", zIndex: 150, boxShadow: "0 -4px 20px rgba(0,0,0,0.06)" }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => setPage(tab.id)} style={{ flex: 1, background: "none", border: "none", padding: "12px 0 14px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontFamily: "inherit", position: "relative" }}>
          {tab.badge > 0 && <span style={{ position: "absolute", top: 6, right: "calc(50% - 18px)", background: "#ef4444", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{tab.badge}</span>}
          <span style={{ fontSize: 10, fontWeight: page === tab.id ? 800 : 500, color: page === tab.id ? "#0ea5e9" : "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>{tab.label}</span>
          {page === tab.id && <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 28, height: 3, background: "#0ea5e9", borderRadius: "0 0 4px 4px" }} />}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; background: #f8fafc; }
        ::-webkit-scrollbar { display: none; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-16px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
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
      <FloatingCart />
      <BottomNav />
    </>
  );
}
