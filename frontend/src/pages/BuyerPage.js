import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { toast } from "sonner";
import { CalendarBlank, Package, Buildings, PaperPlaneTilt, HardHat, ArrowRight, CheckCircle, Plus, Minus, X, MagnifyingGlass } from "@phosphor-icons/react";
import api from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DEFAULT_GRID_PRODUCTS = 11;

const DURATION_OPTIONS = [
  "1 Month", "2 Months", "3 Months", "4 Months", "5 Months", "6 Months",
  "9 Months", "1 Year", "1.5 Years", "2 Years", "3 Years"
];

export default function BuyerPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [cities, setCities] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [catalogSearchOpen, setCatalogSearchOpen] = useState(false);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState("");
  const catalogSearchInputRef = useRef(null);
  const [city, setCity] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [duration, setDuration] = useState("");
  const [customDuration, setCustomDuration] = useState("");
  const [phone, setPhone] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [company, setCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api
      .get("/products", { params: { limit: 100 } })
      .then((r) => {
        const raw = r.data.items ?? r.data;
        setProducts(Array.isArray(raw) ? raw : []);
      })
      .catch(() => setProducts([]));
    api.get("/public/cities").then(r => setCities(r.data)).catch(() => {});
    api.get("/public/suppliers").then(r => setSuppliers(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!catalogSearchOpen) return;
    const t = requestAnimationFrame(() => catalogSearchInputRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [catalogSearchOpen]);

  const gridProducts = useMemo(
    () => products.slice(0, DEFAULT_GRID_PRODUCTS),
    [products]
  );

  const catalogSearchResults = useMemo(() => {
    const q = catalogSearchQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [catalogSearchQuery, products]);

  const toggleProduct = (product) => {
    setSelectedProducts(prev => {
      const next = { ...prev };
      if (next[product.id]) {
        delete next[product.id];
      } else {
        next[product.id] = { ...product, quantity: 1 };
      }
      return next;
    });
  };

  const updateQuantity = (productId, qty) => {
    const val = Math.max(1, parseInt(qty) || 1);
    setSelectedProducts(prev => ({
      ...prev,
      [productId]: { ...prev[productId], quantity: val }
    }));
  };

  const addProductFromCatalogSearch = (product) => {
    setSelectedProducts((prev) => {
      if (prev[product.id]) {
        return {
          ...prev,
          [product.id]: {
            ...prev[product.id],
            quantity: prev[product.id].quantity + 1,
          },
        };
      }
      return { ...prev, [product.id]: { ...product, quantity: 1 } };
    });
    toast.success(`Added: ${product.name}`);
  };

  const handleSubmit = async () => {
    const catalogItems = Object.values(selectedProducts).map(p => ({
      product_name: p.name,
      product_id: p.id,
      quantity: p.quantity
    }));

    if (catalogItems.length === 0) { toast.error("Select at least one product"); return; }
    if (!city) { toast.error("Select a city"); return; }
    if (!startDate) { toast.error("Select a start date"); return; }
    const finalDuration = duration === "custom" ? customDuration : duration;
    if (!finalDuration) { toast.error("Select or enter duration"); return; }
    if (!phone || phone.length < 10) { toast.error("Enter a valid phone number"); return; }

    setSubmitting(true);
    try {
      await api.post("/leads", {
        buyer_phone: phone,
        buyer_name: buyerName,
        buyer_company: company,
        city,
        start_date: format(startDate, "yyyy-MM-dd"),
        duration: finalDuration,
        items: catalogItems,
        source: "platform"
      });
      toast.success("Requirement submitted successfully!");
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit");
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6]">
        <Card className="max-w-md w-full mx-4 rounded-sm border-neutral-200 shadow-[4px_4px_0px_#0A0A0A]">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 flex items-center justify-center rounded-sm">
              <PaperPlaneTilt size={32} weight="bold" className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Requirement Submitted</h2>
            <p className="text-neutral-600 mb-6">Our team will verify and connect you with the best suppliers in your area.</p>
            <Button data-testid="submit-another-btn" onClick={() => { setSubmitted(false); setSelectedProducts({}); setPhone(""); setBuyerName(""); setCompany(""); setCity(""); setStartDate(null); setDuration(""); setCustomDuration(""); }} className="bg-orange-600 hover:bg-orange-700 text-white rounded-sm w-full">
              Submit Another Requirement
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedCount = Object.keys(selectedProducts).length;

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-200" data-testid="buyer-navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HardHat size={28} weight="bold" className="text-orange-600" />
            <span className="text-xl font-bold tracking-tight">MRB LISTING</span>
          </div>
          <Button data-testid="nav-login-btn" variant="outline" onClick={() => navigate("/login")} className="rounded-sm border-neutral-300 hover:bg-neutral-100 text-sm">
            Supplier / Admin Login
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-pattern py-16 sm:py-24 lg:py-32" data-testid="hero-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="overline mb-4">India's Scaffolding RFQ Platform</div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter uppercase text-[#0A0A0A] leading-[0.95]">
              Get Quotes From<br />Verified Suppliers
            </h1>
            <p className="mt-6 text-base sm:text-lg text-neutral-600 max-w-xl leading-relaxed">
              Post your scaffolding requirements and receive competitive quotes from pre-verified suppliers in your city. No login required.
            </p>
            <div className="mt-8 flex gap-4">
              <Button data-testid="hero-cta-btn" onClick={() => document.getElementById("rfq-form")?.scrollIntoView({ behavior: "smooth" })} className="bg-orange-600 hover:bg-orange-700 text-white rounded-sm px-8 h-12 text-base font-bold shadow-[4px_4px_0px_#0A0A0A] hover:shadow-[2px_2px_0px_#0A0A0A] transition-all">
                Post Requirement <ArrowRight size={20} weight="bold" className="ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* RFQ Form */}
      <section id="rfq-form" className="py-16 bg-[#F3F4F6]" data-testid="rfq-form-section">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="overline mb-3">Step 1: Select Products</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">What do you need?</h2>
          <p className="text-neutral-500 text-sm mb-8">Tap to select from popular items, or search the full catalog. Adjust quantities below.</p>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {gridProducts.map(p => {
              const isSelected = !!selectedProducts[p.id];
              return (
                <div
                  key={p.id}
                  data-testid={`product-card-${p.id}`}
                  onClick={() => toggleProduct(p)}
                  className={`cursor-pointer rounded-sm border-2 transition-all overflow-hidden ${
                    isSelected
                      ? "border-orange-500 shadow-[3px_3px_0px_#FF5A1F] bg-orange-50"
                      : "border-neutral-200 hover:border-neutral-400 bg-white"
                  }`}
                >
                  <div className="relative aspect-square bg-neutral-100">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={40} className="text-neutral-300" />
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-7 h-7 bg-orange-600 rounded-sm flex items-center justify-center">
                        <CheckCircle size={18} weight="fill" className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-bold leading-tight">{p.name}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{p.category}</p>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              data-testid="search-products-card"
              onClick={() => {
                setCatalogSearchQuery("");
                setCatalogSearchOpen(true);
              }}
              className="cursor-pointer rounded-sm border-2 border-dashed border-neutral-300 hover:border-orange-400 bg-white flex flex-col items-center justify-center min-h-[200px] transition-all text-left w-full"
            >
              <MagnifyingGlass size={32} className="text-orange-500 mb-2" weight="bold" />
              <p className="text-sm font-bold text-neutral-800">Search products</p>
              <p className="text-xs text-neutral-500 mt-0.5 px-3 text-center">Add from full catalog</p>
            </button>
          </div>

          <Dialog
            open={catalogSearchOpen}
            onOpenChange={(open) => {
              setCatalogSearchOpen(open);
              if (!open) setCatalogSearchQuery("");
            }}
          >
            <DialogContent
              className="max-w-lg rounded-sm border-neutral-200 sm:rounded-sm gap-0 p-0 overflow-hidden"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <DialogHeader className="p-6 pb-4 space-y-1.5">
                <DialogTitle className="text-left">Search catalog</DialogTitle>
                <DialogDescription className="text-left">
                  Type to filter, then tap a product to add. You can add several without closing this window.
                </DialogDescription>
              </DialogHeader>
              <div className="px-6 pb-2">
                <div className="relative">
                  <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" size={18} weight="bold" />
                  <Input
                    ref={catalogSearchInputRef}
                    data-testid="catalog-search-input"
                    placeholder="Search by name or category…"
                    value={catalogSearchQuery}
                    onChange={(e) => setCatalogSearchQuery(e.target.value)}
                    className="pl-10 rounded-sm border-neutral-300"
                  />
                </div>
              </div>
              <div
                className="border-t border-neutral-200 bg-neutral-50 max-h-[min(50vh,320px)] overflow-y-auto mx-0"
                data-testid="catalog-search-results"
              >
                {catalogSearchResults.length === 0 ? (
                  <p className="text-sm text-neutral-500 p-4 text-center">No products match your search.</p>
                ) : (
                  <ul className="py-1">
                    {catalogSearchResults.map((p) => {
                      const inCart = selectedProducts[p.id];
                      return (
                      <li key={p.id}>
                        <button
                          type="button"
                          data-testid={`catalog-search-option-${p.id}`}
                          data-added={inCart ? "true" : "false"}
                          onClick={() => addProductFromCatalogSearch(p)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-neutral-100/80 last:border-0 transition-colors ${
                            inCart
                              ? "bg-orange-50 shadow-[inset_3px_0_0_0_#FF5A1F] hover:bg-orange-50/90"
                              : "hover:bg-white bg-transparent"
                          }`}
                        >
                          <div
                            className={`w-11 h-11 rounded-sm overflow-hidden flex-shrink-0 ${
                              inCart
                                ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-orange-50"
                                : "bg-neutral-200"
                            }`}
                          >
                            {p.image_url ? (
                              <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-neutral-200">
                                <Package size={22} className="text-neutral-400" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold leading-tight truncate">{p.name}</p>
                            <p className="text-xs text-neutral-500">{p.category}</p>
                          </div>
                          {inCart ? (
                            <span
                              className="flex-shrink-0 rounded-sm bg-orange-600 text-white text-xs font-bold font-mono tabular-nums min-w-[2.25rem] px-2 py-1 text-center"
                              data-testid={`catalog-search-qty-${p.id}`}
                            >
                              ×{inCart.quantity}
                            </span>
                          ) : null}
                          <Plus size={18} weight="bold" className={`flex-shrink-0 ${inCart ? "text-orange-700" : "text-orange-600"}`} />
                        </button>
                      </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <DialogFooter className="p-4 pt-3 border-t border-neutral-200 bg-white sm:justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  data-testid="catalog-search-done-btn"
                  className="rounded-sm border-neutral-300"
                  onClick={() => setCatalogSearchOpen(false)}
                >
                  Done
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Selected Products with Quantities */}
          {Object.keys(selectedProducts).length > 0 && (
            <Card className="rounded-sm border-orange-200 bg-orange-50/50 mb-8" data-testid="selected-products-section">
              <CardHeader className="border-b border-orange-200 pb-3 pt-4 px-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle size={18} weight="bold" className="text-orange-600" />
                  Selected Products ({selectedCount})
                  <span className="text-xs text-neutral-500 font-normal ml-auto">Set quantity for each</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {Object.values(selectedProducts).map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-orange-100 last:border-0" data-testid={`selected-item-${p.id}`}>
                    <div className="w-10 h-10 rounded-sm overflow-hidden bg-neutral-100 flex-shrink-0">
                      {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <Package size={20} className="text-neutral-300 m-auto mt-2.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{p.name}</p>
                      <p className="text-xs text-neutral-500">{p.category}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button data-testid={`qty-minus-${p.id}`} onClick={(e) => { e.stopPropagation(); updateQuantity(p.id, p.quantity - 1); }} className="w-8 h-8 flex items-center justify-center border border-neutral-300 rounded-sm hover:bg-neutral-100">
                        <Minus size={14} />
                      </button>
                      <Input data-testid={`qty-input-${p.id}`} type="number" value={p.quantity} onChange={(e) => updateQuantity(p.id, e.target.value)}
                        className="w-16 h-8 text-center rounded-sm border-neutral-300 text-sm font-mono" />
                      <button data-testid={`qty-plus-${p.id}`} onClick={(e) => { e.stopPropagation(); updateQuantity(p.id, p.quantity + 1); }} className="w-8 h-8 flex items-center justify-center border border-neutral-300 rounded-sm hover:bg-neutral-100">
                        <Plus size={14} />
                      </button>
                    </div>
                    <button data-testid={`remove-product-${p.id}`} onClick={() => toggleProduct(p)} className="text-red-500 hover:text-red-700 ml-1">
                      <X size={16} weight="bold" />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Project Details */}
          <div className="overline mb-3 mt-8">Step 2: Project Details</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="rounded-sm border-neutral-200">
              <CardContent className="p-5 space-y-4">
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">City *</label>
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger data-testid="city-select" className="rounded-sm border-neutral-300">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">Start Date *</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button data-testid="start-date-btn" variant="outline" className="w-full justify-start rounded-sm border-neutral-300 font-normal">
                        <CalendarBlank size={16} className="mr-2 text-neutral-500" />
                        {startDate ? format(startDate, "dd MMM yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} /></PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">Duration *</label>
                  <Select value={duration} onValueChange={(v) => { setDuration(v); if (v !== "custom") setCustomDuration(""); }}>
                    <SelectTrigger data-testid="duration-select" className="rounded-sm border-neutral-300">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      <SelectItem value="custom">Custom (type your own)</SelectItem>
                    </SelectContent>
                  </Select>
                  {duration === "custom" && (
                    <Input data-testid="custom-duration-input" placeholder='e.g. "45 Days" or "8 Months"' value={customDuration} onChange={(e) => setCustomDuration(e.target.value)} className="mt-2 rounded-sm border-neutral-300" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-sm border-neutral-200">
              <CardContent className="p-5 space-y-4">
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">Contact Number *</label>
                  <Input data-testid="phone-input" placeholder="Enter 10-digit phone number" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-sm border-neutral-300" />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">Your Name</label>
                  <Input data-testid="buyer-name-input" placeholder="Optional" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} className="rounded-sm border-neutral-300" />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">Company Name</label>
                  <Input data-testid="company-input" placeholder="Optional" value={company} onChange={(e) => setCompany(e.target.value)} className="rounded-sm border-neutral-300" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Button data-testid="submit-rfq-btn" onClick={handleSubmit} disabled={submitting} className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-sm h-14 text-lg font-bold shadow-[4px_4px_0px_#0A0A0A] hover:shadow-[2px_2px_0px_#0A0A0A] transition-all">
            {submitting ? "Submitting..." : `Submit Requirement (${selectedCount} items)`}
          </Button>
        </div>
      </section>

      {/* Suppliers Section */}
      {suppliers.length > 0 && (
        <section className="py-16" data-testid="suppliers-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="overline mb-3">Verified Network</div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-8">Our Supplier Partners</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {suppliers.slice(0, 6).map((s, i) => (
                <Card key={i} className="rounded-sm border-neutral-200 card-hover">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-neutral-100 flex items-center justify-center rounded-sm">
                        <Buildings size={20} className="text-neutral-600" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{s.name || s.company_name || "Supplier"}</p>
                        <p className="text-xs text-neutral-500">{s.supplier_type}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(s.cities_served || []).map(c => (
                        <Badge key={c} variant="secondary" className="rounded-sm text-xs">{c}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-neutral-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-6">
            <HardHat size={24} weight="bold" className="text-orange-500" />
            <span className="text-lg font-bold tracking-tight">MRB LISTING PLATFORM</span>
          </div>
          <p className="text-neutral-400 text-sm max-w-md">
            India's leading scaffolding RFQ platform connecting buyers with verified suppliers across major cities.
          </p>
          <div className="mt-8 pt-8 border-t border-neutral-800 text-neutral-500 text-xs font-mono">
            &copy; {new Date().getFullYear()} MRB Listing Platform. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
