import { useState, useEffect } from "react";
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
import { Plus, Trash, CalendarBlank, Package, MapPin, Phone, Buildings, PaperPlaneTilt, HardHat, ArrowRight } from "@phosphor-icons/react";
import api from "@/lib/api";

export default function BuyerPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [cities, setCities] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [customProduct, setCustomProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [city, setCity] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [phone, setPhone] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [company, setCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.get("/products").then(r => setProducts(r.data)).catch(() => {});
    api.get("/public/cities").then(r => setCities(r.data)).catch(() => {});
    api.get("/public/suppliers").then(r => setSuppliers(r.data)).catch(() => {});
  }, []);

  const addItem = () => {
    const name = selectedProduct || customProduct;
    if (!name || !quantity || parseInt(quantity) <= 0) {
      toast.error("Select a product and enter quantity");
      return;
    }
    const product = products.find(p => p.name === selectedProduct);
    setItems([...items, { product_name: name, product_id: product?.id || null, quantity: parseInt(quantity) }]);
    setSelectedProduct("");
    setCustomProduct("");
    setQuantity("");
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (items.length === 0) { toast.error("Add at least one product"); return; }
    if (!city) { toast.error("Select a city"); return; }
    if (!startDate || !endDate) { toast.error("Select start and end dates"); return; }
    if (!phone || phone.length < 10) { toast.error("Enter a valid phone number"); return; }

    setSubmitting(true);
    try {
      await api.post("/leads", {
        buyer_phone: phone,
        buyer_name: buyerName,
        buyer_company: company,
        city,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        items,
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
            <Button data-testid="submit-another-btn" onClick={() => { setSubmitted(false); setItems([]); setPhone(""); setBuyerName(""); setCompany(""); setCity(""); setStartDate(null); setEndDate(null); }} className="bg-orange-600 hover:bg-orange-700 text-white rounded-sm w-full">
              Submit Another Requirement
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="overline mb-3">Step 1 of 2</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-8">Add Your Requirements</h2>

          {/* Product Selection */}
          <Card className="rounded-sm border-neutral-200 mb-6">
            <CardHeader className="border-b border-neutral-200 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package size={20} weight="bold" className="text-orange-600" />
                Products
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1">
                  <Select value={selectedProduct} onValueChange={(v) => { setSelectedProduct(v); setCustomProduct(""); }}>
                    <SelectTrigger data-testid="product-select" className="rounded-sm border-neutral-300">
                      <SelectValue placeholder="Select from catalog" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <span className="text-neutral-400 self-center text-sm">or</span>
                <Input data-testid="custom-product-input" placeholder="Custom product name" value={customProduct} onChange={(e) => { setCustomProduct(e.target.value); setSelectedProduct(""); }} className="flex-1 rounded-sm border-neutral-300" />
              </div>
              <div className="flex gap-3">
                <Input data-testid="quantity-input" type="number" placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-32 rounded-sm border-neutral-300" />
                <Button data-testid="add-item-btn" onClick={addItem} className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-sm">
                  <Plus size={18} weight="bold" className="mr-1" /> Add Item
                </Button>
              </div>

              {/* Cart Items */}
              {items.length > 0 && (
                <div className="mt-6 border border-neutral-200 rounded-sm">
                  <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-200 flex justify-between text-xs font-bold uppercase tracking-wider text-neutral-500 font-mono">
                    <span>Product</span>
                    <span>Qty</span>
                  </div>
                  {items.map((item, idx) => (
                    <div key={idx} className="px-4 py-3 flex items-center justify-between border-b border-neutral-100 last:border-0" data-testid={`cart-item-${idx}`}>
                      <span className="text-sm font-medium">{item.product_name}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm">{item.quantity}</span>
                        <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700" data-testid={`remove-item-${idx}`}>
                          <Trash size={16} weight="bold" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details */}
          <Card className="rounded-sm border-neutral-200 mb-6">
            <CardHeader className="border-b border-neutral-200 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin size={20} weight="bold" className="text-orange-600" />
                Project Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">End Date *</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button data-testid="end-date-btn" variant="outline" className="w-full justify-start rounded-sm border-neutral-300 font-normal">
                        <CalendarBlank size={16} className="mr-2 text-neutral-500" />
                        {endDate ? format(endDate, "dd MMM yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} /></PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card className="rounded-sm border-neutral-200 mb-6">
            <CardHeader className="border-b border-neutral-200 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone size={20} weight="bold" className="text-orange-600" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">Contact Number *</label>
                <Input data-testid="phone-input" placeholder="Enter 10-digit phone number" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-sm border-neutral-300" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">Your Name</label>
                  <Input data-testid="buyer-name-input" placeholder="Optional" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} className="rounded-sm border-neutral-300" />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">Company Name</label>
                  <Input data-testid="company-input" placeholder="Optional" value={company} onChange={(e) => setCompany(e.target.value)} className="rounded-sm border-neutral-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button data-testid="submit-rfq-btn" onClick={handleSubmit} disabled={submitting} className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-sm h-14 text-lg font-bold shadow-[4px_4px_0px_#0A0A0A] hover:shadow-[2px_2px_0px_#0A0A0A] transition-all">
            {submitting ? "Submitting..." : "Submit Requirement"}
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
