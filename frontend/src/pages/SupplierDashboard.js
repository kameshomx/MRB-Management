import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { HardHat, SignOut, Lightning, Trophy, Eye, MapPin, Phone, CalendarBlank, Package, Clock, ArrowRight } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";

const STAGES = [
  { key: "new", label: "New Lead", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { key: "contacted", label: "Contacted", color: "bg-amber-100 text-amber-800 border-amber-300" },
  { key: "quotation_sent", label: "Quotation Sent", color: "bg-violet-100 text-violet-800 border-violet-300" },
  { key: "won", label: "Won", color: "bg-green-100 text-green-800 border-green-300" },
  { key: "lost", label: "Lost", color: "bg-red-100 text-red-800 border-red-300" },
];

export default function SupplierDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [badges, setBadges] = useState({});
  const [activeStage, setActiveStage] = useState("all");
  const [selectedLead, setSelectedLead] = useState(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [leadsRes, badgesRes] = await Promise.all([
        api.get("/supplier/leads?limit=100"),
        api.get("/supplier/badges")
      ]);
      setLeads(leadsRes.data.items || leadsRes.data);
      setBadges(badgesRes.data);
    } catch (err) {
      toast.error("Failed to load data");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStage = async (assignmentId, newStatus) => {
    try {
      await api.put(`/supplier/assignments/${assignmentId}/stage`, { status: newStatus });
      toast.success(`Stage updated to ${newStatus.replace("_", " ")}`);
      fetchData();
      if (selectedLead) {
        setSelectedLead(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update stage");
    }
  };

  const saveNotes = async (assignmentId) => {
    try {
      await api.put(`/supplier/assignments/${assignmentId}/notes`, { notes });
      toast.success("Notes saved");
      fetchData();
    } catch (err) {
      toast.error("Failed to save notes");
    }
  };

  const filtered = activeStage === "all" ? leads : leads.filter(l => l.status === activeStage);
  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s.key] = leads.filter(l => l.status === s.key).length;
    return acc;
  }, {});

  const handleLogout = () => { logout(); navigate("/"); };

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-200" data-testid="supplier-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HardHat size={28} weight="bold" className="text-orange-600" />
            <span className="text-xl font-bold tracking-tight">MRB LISTING</span>
            <Badge className="rounded-sm bg-orange-100 text-orange-800 border border-orange-300 text-xs ml-2">SUPPLIER</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-600 hidden sm:block">{user?.name}</span>
            <Button data-testid="supplier-logout-btn" variant="outline" size="sm" onClick={handleLogout} className="rounded-sm border-neutral-300">
              <SignOut size={16} weight="bold" className="mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Badges & Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card className="rounded-sm border-neutral-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-black">{leads.length}</p>
              <p className="text-xs text-neutral-500 font-mono uppercase tracking-wider mt-1">Total Leads</p>
            </CardContent>
          </Card>
          <Card className="rounded-sm border-neutral-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-black text-green-600">{badges.total_won || 0}</p>
              <p className="text-xs text-neutral-500 font-mono uppercase tracking-wider mt-1">Won</p>
            </CardContent>
          </Card>
          <Card className="rounded-sm border-neutral-200">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-black text-orange-600">{badges.performance_score || 0}%</p>
              <p className="text-xs text-neutral-500 font-mono uppercase tracking-wider mt-1">Score</p>
            </CardContent>
          </Card>
          <Card className="rounded-sm border-neutral-200">
            <CardContent className="p-4 flex flex-col items-center justify-center">
              {badges.first_responder_count > 0 && (
                <Badge className="badge-first-responder rounded-sm text-xs mb-1" data-testid="first-responder-badge">
                  <Lightning size={12} weight="fill" className="mr-1" /> First Responder x{badges.first_responder_count}
                </Badge>
              )}
              {badges.is_top_supplier && (
                <Badge className="badge-top-supplier rounded-sm text-xs" data-testid="top-supplier-badge">
                  <Trophy size={12} weight="fill" className="mr-1" /> Top Supplier
                </Badge>
              )}
              {!badges.first_responder_count && !badges.is_top_supplier && (
                <p className="text-xs text-neutral-400">No badges yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pipeline */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight mb-4">Lead Pipeline</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            <Button data-testid="filter-all-btn" variant={activeStage === "all" ? "default" : "outline"} size="sm"
              onClick={() => setActiveStage("all")} className={`rounded-sm ${activeStage === "all" ? "bg-neutral-900 text-white" : "border-neutral-300"}`}>
              All ({leads.length})
            </Button>
            {STAGES.map(s => (
              <Button key={s.key} data-testid={`filter-${s.key}-btn`} variant={activeStage === s.key ? "default" : "outline"} size="sm"
                onClick={() => setActiveStage(s.key)}
                className={`rounded-sm ${activeStage === s.key ? "bg-neutral-900 text-white" : "border-neutral-300"}`}>
                {s.label} ({stageCounts[s.key] || 0})
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12 text-neutral-500">Loading leads...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">No leads in this stage</div>
          ) : (
            <div className="space-y-3">
              {filtered.map(assignment => (
                <Card key={assignment.id} className={`rounded-sm border-neutral-200 card-hover stage-${assignment.status}`} data-testid={`lead-card-${assignment.id}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={`rounded-sm text-xs border ${STAGES.find(s => s.key === assignment.status)?.color}`}>
                            {STAGES.find(s => s.key === assignment.status)?.label}
                          </Badge>
                          {assignment.is_first_responder && (
                            <Badge className="badge-first-responder rounded-sm text-xs">
                              <Lightning size={10} weight="fill" className="mr-0.5" /> First
                            </Badge>
                          )}
                          <span className="text-xs font-mono text-neutral-400">{assignment.id.slice(0, 8)}</span>
                        </div>
                        {assignment.lead && (
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600">
                            <span className="flex items-center gap-1"><MapPin size={14} /> {assignment.lead.city}</span>
                            <span className="flex items-center gap-1"><Package size={14} /> {assignment.lead.items?.length || 0} items</span>
                            <span className="flex items-center gap-1"><CalendarBlank size={14} /> {assignment.lead.start_date} &middot; {assignment.lead.duration}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button data-testid={`view-lead-${assignment.id}`} variant="outline" size="sm"
                          onClick={() => { setSelectedLead(assignment); setNotes(assignment.notes || ""); }}
                          className="rounded-sm border-neutral-300 text-xs">
                          <Eye size={14} className="mr-1" /> View
                        </Button>
                        {assignment.status === "new" && (
                          <Button data-testid={`mark-contacted-${assignment.id}`} size="sm"
                            onClick={() => updateStage(assignment.id, "contacted")}
                            className="rounded-sm bg-amber-500 hover:bg-amber-600 text-white text-xs">
                            Mark Contacted
                          </Button>
                        )}
                        {assignment.status === "contacted" && (
                          <Button data-testid={`send-quotation-${assignment.id}`} size="sm"
                            onClick={() => updateStage(assignment.id, "quotation_sent")}
                            className="rounded-sm bg-violet-600 hover:bg-violet-700 text-white text-xs">
                            Quotation Sent
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-lg rounded-sm" data-testid="lead-detail-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Lead Details
              <span className="text-xs font-mono text-neutral-400">{selectedLead?.id?.slice(0, 8)}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedLead?.lead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-neutral-50 rounded-sm border border-neutral-200">
                  <p className="text-xs text-neutral-500 font-mono uppercase">City</p>
                  <p className="font-bold text-sm">{selectedLead.lead.city}</p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-sm border border-neutral-200">
                  <p className="text-xs text-neutral-500 font-mono uppercase">Duration</p>
                  <p className="font-bold text-sm">{selectedLead.lead.start_date} &middot; {selectedLead.lead.duration}</p>
                </div>
              </div>

              <div className="border border-neutral-200 rounded-sm">
                <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-200 text-xs font-bold uppercase tracking-wider text-neutral-500 font-mono">
                  Items Required
                </div>
                {selectedLead.lead.items?.map((item, i) => (
                  <div key={i} className="px-3 py-2 flex justify-between border-b border-neutral-100 last:border-0 text-sm">
                    <span>{item.product_name}</span>
                    <span className="font-mono">{item.quantity}</span>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs text-neutral-500 font-mono uppercase mb-1">Response Time</p>
                <div className="flex gap-3">
                  {selectedLead.opened_at && (
                    <Badge className="rounded-sm text-xs bg-blue-50 text-blue-700 border border-blue-200">
                      <Clock size={10} className="mr-1" /> Opened
                    </Badge>
                  )}
                  {selectedLead.contacted_at && (
                    <Badge className="rounded-sm text-xs bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock size={10} className="mr-1" /> Contacted
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-500 font-mono uppercase mb-1 block">Stage</label>
                <Select value={selectedLead.status} onValueChange={(v) => updateStage(selectedLead.id, v)}>
                  <SelectTrigger data-testid="stage-select" className="rounded-sm border-neutral-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-neutral-500 font-mono uppercase mb-1 block">Notes</label>
                <Textarea data-testid="lead-notes-input" value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this lead..." className="rounded-sm border-neutral-300 min-h-[80px]" />
                <Button data-testid="save-notes-btn" size="sm" onClick={() => saveNotes(selectedLead.id)}
                  className="mt-2 rounded-sm bg-neutral-900 hover:bg-neutral-800 text-white text-xs">
                  Save Notes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
