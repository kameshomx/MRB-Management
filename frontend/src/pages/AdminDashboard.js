import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { HardHat, SignOut, ChartBar, ListChecks, Users, Package, Wrench, CheckCircle, XCircle, Warning, PaperPlaneTilt, Plus, Trash, Pencil } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";

const LEAD_STATUSES = { pending: "Pending", verified: "Verified", not_reachable: "Not Reachable", fake: "Fake" };
const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  verified: "bg-green-100 text-green-800 border-green-300",
  not_reachable: "bg-orange-100 text-orange-800 border-orange-300",
  fake: "bg-red-100 text-red-800 border-red-300"
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [metrics, setMetrics] = useState({});
  const [leads, setLeads] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [serviceProviders, setServiceProviders] = useState([]);
  const [leadFilter, setLeadFilter] = useState("all");
  const [assignDialog, setAssignDialog] = useState(null);
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);
  const [productDialog, setProductDialog] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", category: "General" });
  const [spDialog, setSpDialog] = useState(false);
  const [newSP, setNewSP] = useState({ name: "", category: "labor", phone: "", city: "", description: "" });
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [m, l, s, p, sp] = await Promise.all([
        api.get("/admin/metrics"),
        api.get("/leads?limit=100"),
        api.get("/admin/suppliers?limit=100"),
        api.get("/products?limit=100"),
        api.get("/service-providers?limit=100")
      ]);
      setMetrics(m.data);
      setLeads(l.data.items || l.data);
      setSuppliers(s.data.items || s.data);
      setProducts(p.data.items || p.data);
      setServiceProviders(sp.data.items || sp.data);
    } catch (err) {
      toast.error("Failed to load dashboard data");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const verifyLead = async (leadId, status) => {
    try {
      await api.put(`/leads/${leadId}/verify`, { status });
      toast.success(`Lead marked as ${status}`);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to update"); }
  };

  const openAssign = async (lead) => {
    setAssignDialog(lead);
    setSelectedSuppliers([]);
  };

  const assignLead = async () => {
    if (selectedSuppliers.length < 5 || selectedSuppliers.length > 7) {
      toast.error("Select 5-7 suppliers");
      return;
    }
    try {
      await api.post(`/leads/${assignDialog.id}/assign`, { supplier_ids: selectedSuppliers });
      toast.success("Lead assigned to suppliers");
      setAssignDialog(null);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to assign"); }
  };

  const toggleSupplier = (id) => {
    setSelectedSuppliers(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const addProduct = async () => {
    if (!newProduct.name) { toast.error("Enter product name"); return; }
    try {
      await api.post("/products", newProduct);
      toast.success("Product added");
      setProductDialog(false);
      setNewProduct({ name: "", category: "General" });
      fetchAll();
    } catch (err) { toast.error("Failed to add product"); }
  };

  const deleteProduct = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      toast.success("Product deleted");
      fetchAll();
    } catch (err) { toast.error("Failed to delete"); }
  };

  const addSP = async () => {
    if (!newSP.name) { toast.error("Enter name"); return; }
    try {
      await api.post("/service-providers", newSP);
      toast.success("Service provider added");
      setSpDialog(false);
      setNewSP({ name: "", category: "labor", phone: "", city: "", description: "" });
      fetchAll();
    } catch (err) { toast.error("Failed to add"); }
  };

  const deleteSP = async (id) => {
    try {
      await api.delete(`/service-providers/${id}`);
      toast.success("Deleted");
      fetchAll();
    } catch (err) { toast.error("Failed to delete"); }
  };

  const filteredLeads = leadFilter === "all" ? leads : leads.filter(l => l.status === leadFilter);
  const citySuppliers = assignDialog ? suppliers.filter(s => s.cities_served?.includes(assignDialog.city)) : [];
  const otherSuppliers = assignDialog ? suppliers.filter(s => !s.cities_served?.includes(assignDialog.city)) : [];

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-200" data-testid="admin-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HardHat size={28} weight="bold" className="text-orange-600" />
            <span className="text-xl font-bold tracking-tight">MRB LISTING</span>
            <Badge className="rounded-sm bg-red-100 text-red-800 border border-red-300 text-xs ml-2">ADMIN</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-600 hidden sm:block">{user?.name}</span>
            <Button data-testid="admin-logout-btn" variant="outline" size="sm" onClick={() => { logout(); navigate("/"); }} className="rounded-sm border-neutral-300">
              <SignOut size={16} weight="bold" className="mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white border border-neutral-200 rounded-sm h-11 mb-8 p-1 flex-wrap h-auto gap-1">
            <TabsTrigger data-testid="tab-overview" value="overview" className="rounded-sm text-xs sm:text-sm font-bold data-[state=active]:bg-neutral-900 data-[state=active]:text-white">
              <ChartBar size={16} className="mr-1 hidden sm:inline" /> Overview
            </TabsTrigger>
            <TabsTrigger data-testid="tab-leads" value="leads" className="rounded-sm text-xs sm:text-sm font-bold data-[state=active]:bg-neutral-900 data-[state=active]:text-white">
              <ListChecks size={16} className="mr-1 hidden sm:inline" /> Leads
            </TabsTrigger>
            <TabsTrigger data-testid="tab-suppliers" value="suppliers" className="rounded-sm text-xs sm:text-sm font-bold data-[state=active]:bg-neutral-900 data-[state=active]:text-white">
              <Users size={16} className="mr-1 hidden sm:inline" /> Suppliers
            </TabsTrigger>
            <TabsTrigger data-testid="tab-products" value="products" className="rounded-sm text-xs sm:text-sm font-bold data-[state=active]:bg-neutral-900 data-[state=active]:text-white">
              <Package size={16} className="mr-1 hidden sm:inline" /> Products
            </TabsTrigger>
            <TabsTrigger data-testid="tab-services" value="services" className="rounded-sm text-xs sm:text-sm font-bold data-[state=active]:bg-neutral-900 data-[state=active]:text-white">
              <Wrench size={16} className="mr-1 hidden sm:inline" /> Services
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" data-testid="overview-tab">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total Leads", value: metrics.total_leads || 0, color: "text-neutral-900" },
                { label: "Verified", value: metrics.verified || 0, color: "text-green-600" },
                { label: "Not Reachable", value: metrics.not_reachable || 0, color: "text-orange-600" },
                { label: "Fake", value: metrics.fake || 0, color: "text-red-600" },
                { label: "Pending", value: metrics.pending || 0, color: "text-yellow-600" },
                { label: "Quotations Sent", value: metrics.total_quotations || 0, color: "text-violet-600" },
                { label: "Won Leads", value: metrics.total_won || 0, color: "text-green-600" },
                { label: "Total Suppliers", value: metrics.total_suppliers || 0, color: "text-blue-600" },
              ].map((m, i) => (
                <Card key={i} className="rounded-sm border-neutral-200" data-testid={`metric-${m.label.toLowerCase().replace(/\s/g, "-")}`}>
                  <CardContent className="p-4 text-center">
                    <p className={`text-3xl font-black ${m.color}`}>{m.value}</p>
                    <p className="text-xs text-neutral-500 font-mono uppercase tracking-wider mt-1">{m.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Top Suppliers */}
            {metrics.top_suppliers?.length > 0 && (
              <Card className="rounded-sm border-neutral-200">
                <CardContent className="p-0">
                  <div className="px-4 py-3 border-b border-neutral-200 flex items-center gap-2">
                    <span className="font-bold text-sm">Top Suppliers</span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-neutral-200">
                        <TableHead className="text-xs font-mono uppercase">Name</TableHead>
                        <TableHead className="text-xs font-mono uppercase">Won</TableHead>
                        <TableHead className="text-xs font-mono uppercase">Score</TableHead>
                        <TableHead className="text-xs font-mono uppercase">Cities</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.top_suppliers.map((s, i) => (
                        <TableRow key={i} className="border-neutral-100">
                          <TableCell className="font-medium text-sm">{s.name}</TableCell>
                          <TableCell className="font-mono text-sm">{s.total_won}</TableCell>
                          <TableCell className="font-mono text-sm">{s.performance_score}%</TableCell>
                          <TableCell><div className="flex flex-wrap gap-1">{(s.cities_served || []).slice(0, 3).map(c => <Badge key={c} variant="secondary" className="rounded-sm text-xs">{c}</Badge>)}</div></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* LEADS TAB */}
          <TabsContent value="leads" data-testid="leads-tab">
            <div className="flex flex-wrap gap-2 mb-6">
              {["all", "pending", "verified", "not_reachable", "fake"].map(s => (
                <Button key={s} data-testid={`lead-filter-${s}`} variant={leadFilter === s ? "default" : "outline"} size="sm"
                  onClick={() => setLeadFilter(s)}
                  className={`rounded-sm text-xs ${leadFilter === s ? "bg-neutral-900 text-white" : "border-neutral-300"}`}>
                  {s === "all" ? "All" : LEAD_STATUSES[s] || s} ({s === "all" ? leads.length : leads.filter(l => l.status === s).length})
                </Button>
              ))}
            </div>

            <Card className="rounded-sm border-neutral-200 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-neutral-200 bg-neutral-50">
                      <TableHead className="text-xs font-mono uppercase">ID</TableHead>
                      <TableHead className="text-xs font-mono uppercase">Phone</TableHead>
                      <TableHead className="text-xs font-mono uppercase">City</TableHead>
                      <TableHead className="text-xs font-mono uppercase">Items</TableHead>
                      <TableHead className="text-xs font-mono uppercase">Source</TableHead>
                      <TableHead className="text-xs font-mono uppercase">Status</TableHead>
                      <TableHead className="text-xs font-mono uppercase">Repeat</TableHead>
                      <TableHead className="text-xs font-mono uppercase">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-neutral-400">No leads found</TableCell></TableRow>
                    ) : (
                      filteredLeads.map(lead => (
                        <TableRow key={lead.id} className="border-neutral-100" data-testid={`lead-row-${lead.id}`}>
                          <TableCell className="font-mono text-xs">{lead.id.slice(0, 8)}</TableCell>
                          <TableCell className="text-sm">{lead.buyer_phone}</TableCell>
                          <TableCell className="text-sm">{lead.city}</TableCell>
                          <TableCell className="text-sm">{lead.items?.length || 0}</TableCell>
                          <TableCell><Badge variant="secondary" className="rounded-sm text-xs">{lead.source}</Badge></TableCell>
                          <TableCell>
                            <Badge className={`rounded-sm text-xs border ${STATUS_COLORS[lead.status]}`}>
                              {LEAD_STATUSES[lead.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>{lead.is_repeat_buyer && <Badge className="rounded-sm text-xs bg-blue-100 text-blue-800 border border-blue-300">Repeat</Badge>}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {lead.status === "pending" && (
                                <>
                                  <Button data-testid={`verify-btn-${lead.id}`} size="sm" variant="outline" onClick={() => verifyLead(lead.id, "verified")} className="rounded-sm text-xs h-7 border-green-300 text-green-700 hover:bg-green-50">
                                    <CheckCircle size={12} className="mr-0.5" /> Verify
                                  </Button>
                                  <Button data-testid={`unreachable-btn-${lead.id}`} size="sm" variant="outline" onClick={() => verifyLead(lead.id, "not_reachable")} className="rounded-sm text-xs h-7 border-orange-300 text-orange-700 hover:bg-orange-50">
                                    <Warning size={12} className="mr-0.5" />
                                  </Button>
                                  <Button data-testid={`fake-btn-${lead.id}`} size="sm" variant="outline" onClick={() => verifyLead(lead.id, "fake")} className="rounded-sm text-xs h-7 border-red-300 text-red-700 hover:bg-red-50">
                                    <XCircle size={12} className="mr-0.5" />
                                  </Button>
                                </>
                              )}
                              {lead.status === "verified" && (
                                <Button data-testid={`assign-btn-${lead.id}`} size="sm" onClick={() => openAssign(lead)} className="rounded-sm text-xs h-7 bg-orange-600 hover:bg-orange-700 text-white">
                                  <PaperPlaneTilt size={12} className="mr-0.5" /> Assign
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* SUPPLIERS TAB */}
          <TabsContent value="suppliers" data-testid="suppliers-tab">
            <Card className="rounded-sm border-neutral-200 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-neutral-200 bg-neutral-50">
                      <TableHead className="text-xs font-mono uppercase">Name</TableHead>
                      <TableHead className="text-xs font-mono uppercase">Company</TableHead>
                      <TableHead className="text-xs font-mono uppercase">Type</TableHead>
                      <TableHead className="text-xs font-mono uppercase">Cities</TableHead>
                      <TableHead className="text-xs font-mono uppercase">Score</TableHead>
                      <TableHead className="text-xs font-mono uppercase">Won</TableHead>
                      <TableHead className="text-xs font-mono uppercase">Total Leads</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-neutral-400">No suppliers registered</TableCell></TableRow>
                    ) : (
                      suppliers.map(s => (
                        <TableRow key={s.id} className="border-neutral-100" data-testid={`supplier-row-${s.id}`}>
                          <TableCell className="font-medium text-sm">{s.name}</TableCell>
                          <TableCell className="text-sm">{s.company_name}</TableCell>
                          <TableCell><Badge variant="secondary" className="rounded-sm text-xs capitalize">{s.supplier_type}</Badge></TableCell>
                          <TableCell><div className="flex flex-wrap gap-1">{(s.cities_served || []).map(c => <Badge key={c} variant="outline" className="rounded-sm text-xs">{c}</Badge>)}</div></TableCell>
                          <TableCell className="font-mono text-sm">{s.performance_score}%</TableCell>
                          <TableCell className="font-mono text-sm">{s.total_won}</TableCell>
                          <TableCell className="font-mono text-sm">{s.total_leads}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* PRODUCTS TAB */}
          <TabsContent value="products" data-testid="products-tab">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Product Catalog</h3>
              <Button data-testid="add-product-btn" size="sm" onClick={() => setProductDialog(true)} className="rounded-sm bg-orange-600 hover:bg-orange-700 text-white">
                <Plus size={14} className="mr-1" /> Add Product
              </Button>
            </div>
            <Card className="rounded-sm border-neutral-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-200 bg-neutral-50">
                    <TableHead className="text-xs font-mono uppercase">Name</TableHead>
                    <TableHead className="text-xs font-mono uppercase">Category</TableHead>
                    <TableHead className="text-xs font-mono uppercase">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map(p => (
                    <TableRow key={p.id} className="border-neutral-100" data-testid={`product-row-${p.id}`}>
                      <TableCell className="font-medium text-sm">{p.name}</TableCell>
                      <TableCell><Badge variant="secondary" className="rounded-sm text-xs">{p.category}</Badge></TableCell>
                      <TableCell>
                        <Button data-testid={`delete-product-${p.id}`} size="sm" variant="outline" onClick={() => deleteProduct(p.id)} className="rounded-sm text-xs h-7 border-red-300 text-red-700 hover:bg-red-50">
                          <Trash size={12} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* SERVICES TAB */}
          <TabsContent value="services" data-testid="services-tab">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Service Providers (Labor / Transport)</h3>
              <Button data-testid="add-sp-btn" size="sm" onClick={() => setSpDialog(true)} className="rounded-sm bg-orange-600 hover:bg-orange-700 text-white">
                <Plus size={14} className="mr-1" /> Add Provider
              </Button>
            </div>
            <Card className="rounded-sm border-neutral-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-200 bg-neutral-50">
                    <TableHead className="text-xs font-mono uppercase">Name</TableHead>
                    <TableHead className="text-xs font-mono uppercase">Category</TableHead>
                    <TableHead className="text-xs font-mono uppercase">Phone</TableHead>
                    <TableHead className="text-xs font-mono uppercase">City</TableHead>
                    <TableHead className="text-xs font-mono uppercase">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceProviders.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-neutral-400">No service providers</TableCell></TableRow>
                  ) : (
                    serviceProviders.map(sp => (
                      <TableRow key={sp.id} className="border-neutral-100" data-testid={`sp-row-${sp.id}`}>
                        <TableCell className="font-medium text-sm">{sp.name}</TableCell>
                        <TableCell><Badge variant="secondary" className="rounded-sm text-xs capitalize">{sp.category}</Badge></TableCell>
                        <TableCell className="text-sm">{sp.phone}</TableCell>
                        <TableCell className="text-sm">{sp.city}</TableCell>
                        <TableCell>
                          <Button data-testid={`delete-sp-${sp.id}`} size="sm" variant="outline" onClick={() => deleteSP(sp.id)} className="rounded-sm text-xs h-7 border-red-300 text-red-700 hover:bg-red-50">
                            <Trash size={12} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Assign Lead Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={(open) => !open && setAssignDialog(null)}>
        <DialogContent className="max-w-lg rounded-sm max-h-[80vh] overflow-y-auto" data-testid="assign-dialog">
          <DialogHeader>
            <DialogTitle>Assign Lead to Suppliers</DialogTitle>
          </DialogHeader>
          {assignDialog && (
            <div className="space-y-4">
              <div className="p-3 bg-neutral-50 rounded-sm border border-neutral-200 text-sm">
                <p><strong>City:</strong> {assignDialog.city}</p>
                <p><strong>Items:</strong> {assignDialog.items?.map(i => i.product_name).join(", ")}</p>
              </div>
              <p className="text-sm text-neutral-600">Select <strong>5-7 suppliers</strong> ({selectedSuppliers.length} selected)</p>

              {citySuppliers.length > 0 && (
                <div>
                  <p className="text-xs font-mono uppercase text-green-600 mb-2 font-bold">City Match ({assignDialog.city})</p>
                  {citySuppliers.map(s => (
                    <label key={s.id} className="flex items-center gap-3 p-2 hover:bg-neutral-50 rounded-sm cursor-pointer" data-testid={`assign-supplier-${s.id}`}>
                      <Checkbox checked={selectedSuppliers.includes(s.id)} onCheckedChange={() => toggleSupplier(s.id)} className="rounded-sm" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-neutral-500">{s.supplier_type} &middot; Score: {s.performance_score}%</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {otherSuppliers.length > 0 && (
                <div>
                  <p className="text-xs font-mono uppercase text-neutral-500 mb-2 font-bold">Other Suppliers</p>
                  {otherSuppliers.map(s => (
                    <label key={s.id} className="flex items-center gap-3 p-2 hover:bg-neutral-50 rounded-sm cursor-pointer" data-testid={`assign-supplier-${s.id}`}>
                      <Checkbox checked={selectedSuppliers.includes(s.id)} onCheckedChange={() => toggleSupplier(s.id)} className="rounded-sm" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-neutral-500">{s.supplier_type} &middot; Score: {s.performance_score}% &middot; {(s.cities_served || []).join(", ")}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <Button data-testid="confirm-assign-btn" onClick={assignLead} disabled={selectedSuppliers.length < 5 || selectedSuppliers.length > 7}
                className="w-full rounded-sm bg-orange-600 hover:bg-orange-700 text-white font-bold">
                Assign to {selectedSuppliers.length} Suppliers
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog open={productDialog} onOpenChange={setProductDialog}>
        <DialogContent className="max-w-sm rounded-sm" data-testid="add-product-dialog">
          <DialogHeader><DialogTitle>Add Product</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input data-testid="product-name-input" placeholder="Product name" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} className="rounded-sm border-neutral-300" />
            <Select value={newProduct.category} onValueChange={v => setNewProduct({ ...newProduct, category: v })}>
              <SelectTrigger data-testid="product-category-select" className="rounded-sm border-neutral-300"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Pipes", "Clamps", "Systems", "Frames", "Accessories", "Platforms", "Safety", "General"].map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button data-testid="save-product-btn" onClick={addProduct} className="w-full rounded-sm bg-orange-600 hover:bg-orange-700 text-white font-bold">Add Product</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Service Provider Dialog */}
      <Dialog open={spDialog} onOpenChange={setSpDialog}>
        <DialogContent className="max-w-sm rounded-sm" data-testid="add-sp-dialog">
          <DialogHeader><DialogTitle>Add Service Provider</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input data-testid="sp-name-input" placeholder="Provider name" value={newSP.name} onChange={e => setNewSP({ ...newSP, name: e.target.value })} className="rounded-sm border-neutral-300" />
            <Select value={newSP.category} onValueChange={v => setNewSP({ ...newSP, category: v })}>
              <SelectTrigger data-testid="sp-category-select" className="rounded-sm border-neutral-300"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="labor">Labor</SelectItem>
                <SelectItem value="transport">Transport</SelectItem>
              </SelectContent>
            </Select>
            <Input data-testid="sp-phone-input" placeholder="Phone" value={newSP.phone} onChange={e => setNewSP({ ...newSP, phone: e.target.value })} className="rounded-sm border-neutral-300" />
            <Input data-testid="sp-city-input" placeholder="City" value={newSP.city} onChange={e => setNewSP({ ...newSP, city: e.target.value })} className="rounded-sm border-neutral-300" />
            <Button data-testid="save-sp-btn" onClick={addSP} className="w-full rounded-sm bg-orange-600 hover:bg-orange-700 text-white font-bold">Add Provider</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
