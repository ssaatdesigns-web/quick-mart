import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const DEFAULT_SETTINGS = {
  deliveryFee: 30,
  platformFee: 5,
  taxRate: 5,
  deliveryTime: 8,
};

export default function App() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [offers, setOffers] = useState([]);
  const [banners, setBanners] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [promoCode, setPromoCode] = useState("");
  const [appliedOffer, setAppliedOffer] = useState(null);

  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash on Delivery");

  const [cart, setCart] = useState([]);
  const [lastOrder, setLastOrder] = useState(null);

  const setSafeStatus = (message) => {
    setStatusMessage(message);
    window.clearTimeout(window.__sabGCustomerStatusTimer);
    window.__sabGCustomerStatusTimer = window.setTimeout(() => {
      setStatusMessage("");
    }, 2500);
  };

  const subscribeTable = useCallback((table, handler) => {
    return supabase
      .channel(`rt-${table}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, handler)
      .subscribe();
  }, []);

  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("available", true)
      .order("createdAt", { ascending: false });

    if (error) {
      console.error("fetchProducts error:", error);
      return;
    }

    setProducts(data || []);
  }, []);

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort", { ascending: true });

    if (error) {
      console.error("fetchCategories error:", error);
      return;
    }

    setCategories(data || []);
  }, []);

  const fetchOffers = useCallback(async () => {
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .eq("active", true)
      .order("createdAt", { ascending: false });

    if (error) {
      console.error("fetchOffers error:", error);
      return;
    }

    setOffers(data || []);
  }, []);

  const fetchBanners = useCallback(async () => {
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .eq("active", true)
      .order("createdAt", { ascending: false });

    if (error) {
      console.error("fetchBanners error:", error);
      return;
    }

    setBanners(data || []);
  }, []);

  const fetchSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from("config")
      .select("*")
      .eq("key", "settings")
      .single();

    if (error) {
      console.error("fetchSettings error:", error);
      return;
    }

    if (data?.value) {
      setSettings((prev) => ({ ...prev, ...data.value }));
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchProducts(),
        fetchCategories(),
        fetchOffers(),
        fetchBanners(),
        fetchSettings(),
      ]);
      if (mounted) setLoading(false);
    };

    init();

    const channels = [
      subscribeTable("products", fetchProducts),
      subscribeTable("categories", fetchCategories),
      subscribeTable("offers", fetchOffers),
      subscribeTable("banners", fetchBanners),
      subscribeTable("config", fetchSettings),
    ];

    return () => {
      mounted = false;
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, [
    fetchProducts,
    fetchCategories,
    fetchOffers,
    fetchBanners,
    fetchSettings,
    subscribeTable,
  ]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === "All" || product.category === selectedCategory;

      const searchable = `${product.name || ""} ${product.category || ""} ${product.description || ""} ${product.badge || ""}`.toLowerCase();
      const matchesSearch = searchable.includes(search.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, search]);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);

      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: Number(product.price || 0),
          image: product.image || "",
          unit: product.unit || "piece",
          category: product.category || "",
          quantity: 1,
        },
      ];
    });

    setSafeStatus(`${product.name} added to cart.`);
  };

  const incrementQty = (id) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  };

  const decrementQty = (id) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setAppliedOffer(null);
    setPromoCode("");
  };

  const subtotal = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
      0
    );
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (!appliedOffer) return 0;

    if (appliedOffer.type === "percent") {
      return Number(((subtotal * Number(appliedOffer.discount || 0)) / 100).toFixed(2));
    }

    if (appliedOffer.type === "flat") {
      return Number(appliedOffer.discount || 0);
    }

    return 0;
  }, [appliedOffer, subtotal]);

  const taxAmount = useMemo(() => {
    const taxable = Math.max(subtotal - discountAmount, 0);
    return Number(((taxable * Number(settings.taxRate || 0)) / 100).toFixed(2));
  }, [subtotal, discountAmount, settings.taxRate]);

  const deliveryFee = Number(settings.deliveryFee || 0);
  const platformFee = Number(settings.platformFee || 0);

  const total = useMemo(() => {
    return Number(
      Math.max(subtotal - discountAmount, 0) + taxAmount + deliveryFee + platformFee
    ).toFixed(2);
  }, [subtotal, discountAmount, taxAmount, deliveryFee, platformFee]);

  const applyPromoCode = () => {
    if (!promoCode.trim()) {
      alert("Enter a promo code.");
      return;
    }

    const matched = offers.find(
      (offer) => offer.code?.toLowerCase() === promoCode.trim().toLowerCase()
    );

    if (!matched) {
      alert("Invalid promo code.");
      setAppliedOffer(null);
      return;
    }

    if (subtotal < Number(matched.minOrder || 0)) {
      alert(`Minimum order for this offer is ₹${matched.minOrder}`);
      setAppliedOffer(null);
      return;
    }

    setAppliedOffer(matched);
    setSafeStatus(`Offer ${matched.code} applied.`);
  };

  const placeOrder = async () => {
    if (!cart.length) {
      alert("Your cart is empty.");
      return;
    }

    if (!address.trim()) {
      alert("Please enter delivery address.");
      return;
    }

    setPlacingOrder(true);

    const orderPayload = {
      items: cart.map((item) => ({
        id: item.id,
        name: item.name,
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 0),
        total: Number(item.price || 0) * Number(item.quantity || 0),
        unit: item.unit || "piece",
        image: item.image || "",
        category: item.category || "",
      })),
      subtotal: Number(subtotal.toFixed(2)),
      deliveryFee: Number(deliveryFee.toFixed(2)),
      platformFee: Number(platformFee.toFixed(2)),
      tax: Number(taxAmount.toFixed(2)),
      discount: Number(discountAmount.toFixed(2)),
      total: Number(total.toFixed(2)),
      address: address.trim(),
      paymentMethod,
      promoCode: appliedOffer?.code || null,
      status: "pending",
    };

    const { data, error } = await supabase
      .from("orders")
      .insert([orderPayload])
      .select()
      .single();

    setPlacingOrder(false);

    if (error) {
      console.error("placeOrder error:", error);
      alert(error.message);
      return;
    }

    setLastOrder(data);
    clearCart();
    setAddress("");
    setPaymentMethod("Cash on Delivery");
    setSafeStatus("Order placed successfully.");
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <h1 style={styles.heading}>sabG</h1>
        <p>Loading products...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>sabG</h1>

      {statusMessage ? <div style={styles.statusBox}>{statusMessage}</div> : null}

      {banners.length > 0 ? (
        <div style={styles.bannerWrap}>
          {banners.slice(0, 3).map((banner) => (
            <div
              key={banner.id}
              style={{
                ...styles.banner,
                background: banner.bg || "linear-gradient(135deg, #2563eb, #0f172a)",
              }}
            >
              <div>
                <h3 style={{ marginBottom: 6 }}>{banner.title || "QuickMart Offer"}</h3>
                <p style={{ opacity: 0.9 }}>{banner.subtitle || "Fast grocery delivery"}</p>
              </div>
              {banner.image ? (
                <img
                  src={banner.image}
                  alt={banner.title || "Banner"}
                  style={styles.bannerImage}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div style={styles.topSection}>
        <input
          style={styles.input}
          placeholder="Search groceries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          style={styles.input}
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="All">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.emoji ? `${cat.emoji} ` : ""}
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <h2>Categories</h2>
      <div style={styles.categoryRow}>
        <button
          style={{
            ...styles.categoryChip,
            ...(selectedCategory === "All" ? styles.categoryChipActive : {}),
          }}
          onClick={() => setSelectedCategory("All")}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            style={{
              ...styles.categoryChip,
              ...(selectedCategory === cat.name ? styles.categoryChipActive : {}),
            }}
            onClick={() => setSelectedCategory(cat.name)}
          >
            {cat.emoji ? `${cat.emoji} ` : ""}
            {cat.name}
          </button>
        ))}
      </div>

      <h2>Products</h2>
      <div style={styles.productGrid}>
        {filteredProducts.map((product) => (
          <div key={product.id} style={styles.productCard}>
            {product.image ? (
              <img src={product.image} alt={product.name} style={styles.productImage} />
            ) : (
              <div style={styles.productImagePlaceholder}>No Image</div>
            )}

            <div style={{ flex: 1 }}>
              <h3 style={{ marginBottom: 6 }}>{product.name}</h3>
              <div style={styles.smallText}>{product.category}</div>

              {product.badge ? <div style={styles.badge}>{product.badge}</div> : null}

              <div style={styles.priceRow}>
                <strong>₹{Number(product.price || 0).toFixed(2)}</strong>
                {Number(product.originalPrice || 0) > Number(product.price || 0) ? (
                  <span style={styles.originalPrice}>
                    ₹{Number(product.originalPrice || 0).toFixed(2)}
                  </span>
                ) : null}
              </div>

              <div style={styles.smallText}>Per {product.unit || "piece"}</div>

              {product.description ? (
                <p style={styles.description}>{product.description}</p>
              ) : null}

              <button style={styles.button} onClick={() => addToCart(product)}>
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>

      <hr style={styles.hr} />

      <h2>Offers</h2>
      {offers.length === 0 ? (
        <p>No active offers.</p>
      ) : (
        <div style={styles.offerList}>
          {offers.map((offer) => (
            <div key={offer.id} style={styles.offerCard}>
              <div>
                <strong>{offer.code}</strong>
                <div style={styles.smallText}>{offer.title || "Promo offer"}</div>
                <div style={styles.smallText}>
                  {offer.type === "percent"
                    ? `${offer.discount}% off`
                    : `₹${offer.discount} off`}
                </div>
                <div style={styles.smallText}>
                  Min order: ₹{Number(offer.minOrder || 0).toFixed(2)}
                </div>
              </div>
              <button
                style={styles.buttonSecondary}
                onClick={() => {
                  setPromoCode(offer.code || "");
                  setAppliedOffer(offer);
                  setSafeStatus(`Offer ${offer.code} selected.`);
                }}
              >
                Use
              </button>
            </div>
          ))}
        </div>
      )}

      <hr style={styles.hr} />

      <h2>Cart</h2>
      {cart.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <div style={styles.cartWrap}>
          {cart.map((item) => (
            <div key={item.id} style={styles.cartItem}>
              <div style={{ flex: 1 }}>
                <strong>{item.name}</strong>
                <div style={styles.smallText}>
                  ₹{Number(item.price || 0).toFixed(2)} × {item.quantity}
                </div>
                <div style={styles.smallText}>
                  Item total: ₹
                  {(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}
                </div>
              </div>

              <div style={styles.qtyControls}>
                <button style={styles.qtyBtn} onClick={() => decrementQty(item.id)}>
                  -
                </button>
                <span>{item.quantity}</span>
                <button style={styles.qtyBtn} onClick={() => incrementQty(item.id)}>
                  +
                </button>
                <button
                  style={styles.removeBtn}
                  onClick={() => removeFromCart(item.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <div style={styles.checkoutBox}>
            <h3 style={{ marginBottom: 12 }}>Checkout</h3>

            <div style={styles.inlineRow}>
              <input
                style={styles.input}
                placeholder="Promo code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
              <button style={styles.buttonSecondary} onClick={applyPromoCode}>
                Apply
              </button>
            </div>

            {appliedOffer ? (
              <div style={styles.appliedOffer}>
                Applied: <strong>{appliedOffer.code}</strong>
              </div>
            ) : null}

            <textarea
              style={{ ...styles.input, minHeight: 90, resize: "vertical", width: "100%" }}
              placeholder="Enter delivery address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <select
              style={styles.input}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option>Cash on Delivery</option>
              <option>UPI</option>
              <option>Card on Delivery</option>
            </select>

            <div style={styles.billRow}>
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div style={styles.billRow}>
              <span>Discount</span>
              <span>- ₹{discountAmount.toFixed(2)}</span>
            </div>
            <div style={styles.billRow}>
              <span>Delivery Fee</span>
              <span>₹{deliveryFee.toFixed(2)}</span>
            </div>
            <div style={styles.billRow}>
              <span>Platform Fee</span>
              <span>₹{platformFee.toFixed(2)}</span>
            </div>
            <div style={styles.billRow}>
              <span>Tax ({Number(settings.taxRate || 0)}%)</span>
              <span>₹{taxAmount.toFixed(2)}</span>
            </div>
            <div style={{ ...styles.billRow, ...styles.billTotal }}>
              <span>Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>

            <div style={styles.smallText}>
              Estimated delivery in {Number(settings.deliveryTime || 0)} mins
            </div>

            <div style={styles.inlineRow}>
              <button
                style={styles.button}
                onClick={placeOrder}
                disabled={placingOrder}
              >
                {placingOrder ? "Placing Order..." : "Place Order"}
              </button>
              <button style={styles.buttonDanger} onClick={clearCart}>
                Clear Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {lastOrder ? (
        <>
          <hr style={styles.hr} />
          <h2>Last Order</h2>
          <div style={styles.orderSuccess}>
            <div><strong>Order ID:</strong> {lastOrder.id}</div>
            <div><strong>Status:</strong> {lastOrder.status}</div>
            <div><strong>Total:</strong> ₹{Number(lastOrder.total || 0).toFixed(2)}</div>
            <div><strong>Address:</strong> {lastOrder.address}</div>
            <div><strong>Payment:</strong> {lastOrder.paymentMethod}</div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  page: {
    padding: 20,
    minHeight: "100vh",
    background: "#ffffff",
    color: "#0f172a",
    fontFamily: "Inter, sans-serif",
  },
  heading: {
    marginBottom: 16,
  },
  statusBox: {
    marginBottom: 14,
    padding: "10px 12px",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
    borderRadius: 8,
  },
  bannerWrap: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 12,
    marginBottom: 20,
  },
  banner: {
    color: "white",
    borderRadius: 16,
    padding: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 120,
  },
  bannerImage: {
    width: 80,
    height: 80,
    objectFit: "cover",
    borderRadius: 12,
    background: "rgba(255,255,255,0.2)",
  },
  topSection: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 18,
  },
  input: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#0f172a",
    minWidth: 180,
  },
  categoryRow: {
    display: "flex",
    gap: 10,
    overflowX: "auto",
    paddingBottom: 8,
    marginBottom: 18,
  },
  categoryChip: {
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid #cbd5e1",
    background: "#fff",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  categoryChipActive: {
    background: "#2563eb",
    color: "white",
    borderColor: "#2563eb",
  },
  productGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 14,
  },
  productCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    background: "#fff",
  },
  productImage: {
    width: "100%",
    height: 160,
    objectFit: "cover",
    borderRadius: 12,
    background: "#f8fafc",
  },
  productImagePlaceholder: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    background: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
  },
  badge: {
    display: "inline-block",
    marginTop: 6,
    marginBottom: 8,
    padding: "4px 8px",
    borderRadius: 999,
    background: "#ecfeff",
    color: "#0f766e",
    fontSize: 12,
    fontWeight: 600,
  },
  priceRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  originalPrice: {
    textDecoration: "line-through",
    color: "#64748b",
    fontSize: 14,
  },
  description: {
    fontSize: 14,
    color: "#475569",
    marginTop: 8,
    marginBottom: 10,
    lineHeight: 1.5,
  },
  button: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: "#16a34a",
    color: "white",
    cursor: "pointer",
  },
  buttonSecondary: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: "#e2e8f0",
    color: "#0f172a",
    cursor: "pointer",
  },
  buttonDanger: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: "#dc2626",
    color: "white",
    cursor: "pointer",
  },
  offerList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  offerCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 14,
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    background: "#fff",
  },
  cartWrap: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: 16,
  },
  cartItem: {
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    background: "#fff",
  },
  qtyControls: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#fff",
    cursor: "pointer",
  },
  removeBtn: {
    padding: "8px 10px",
    borderRadius: 8,
    border: "none",
    background: "#fee2e2",
    color: "#991b1b",
    cursor: "pointer",
  },
  checkoutBox: {
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 16,
    background: "#fff",
    height: "fit-content",
  },
  inlineRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 12,
    alignItems: "center",
  },
  appliedOffer: {
    marginBottom: 12,
    padding: "8px 10px",
    borderRadius: 8,
    background: "#ecfccb",
    color: "#3f6212",
    fontSize: 14,
  },
  billRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 8,
    fontSize: 15,
  },
  billTotal: {
    fontWeight: 700,
    fontSize: 18,
    marginTop: 12,
    paddingTop: 10,
    borderTop: "1px solid #e2e8f0",
  },
  orderSuccess: {
    border: "1px solid #bbf7d0",
    background: "#f0fdf4",
    borderRadius: 14,
   
