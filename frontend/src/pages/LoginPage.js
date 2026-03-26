import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { HardHat, ArrowLeft } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";

const CITIES = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Pune", "Ahmedabad",
  "Kolkata", "Jaipur", "Lucknow", "Surat", "Nagpur", "Indore", "Bhopal",
  "Thane", "Visakhapatnam", "Vadodara", "Nashik", "Coimbatore", "Kochi",
  "Chandigarh", "Gurgaon", "Noida", "Faridabad", "Ghaziabad"];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [tab, setTab] = useState("login");
  const [loading, setLoading] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regCompany, setRegCompany] = useState("");
  const [regType, setRegType] = useState("hybrid");
  const [regCities, setRegCities] = useState([]);

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) { toast.error("Fill all fields"); return; }
    setLoading(true);
    try {
      const user = await login(loginEmail, loginPassword);
      toast.success("Welcome back!");
      navigate(user.role === "admin" ? "/admin" : "/supplier");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!regName || !regEmail || !regPassword || !regPhone) { toast.error("Fill all required fields"); return; }
    setLoading(true);
    try {
      await register({
        name: regName,
        email: regEmail,
        password: regPassword,
        phone: regPhone,
        company_name: regCompany,
        supplier_type: regType,
        cities_served: regCities
      });
      toast.success("Registration successful!");
      navigate("/supplier");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registration failed");
    }
    setLoading(false);
  };

  const toggleCity = (city) => {
    setRegCities(prev => prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]);
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate("/")} className="text-neutral-500 hover:text-neutral-900" data-testid="back-to-home-btn">
            <ArrowLeft size={20} weight="bold" />
          </button>
          <HardHat size={28} weight="bold" className="text-orange-600" />
          <span className="text-xl font-bold tracking-tight">MRB LISTING</span>
        </div>

        <Card className="rounded-sm border-neutral-200 shadow-[4px_4px_0px_#0A0A0A]">
          <Tabs value={tab} onValueChange={setTab}>
            <CardHeader className="border-b border-neutral-200 pb-0">
              <TabsList className="w-full grid grid-cols-2 bg-neutral-100 rounded-sm h-10">
                <TabsTrigger data-testid="login-tab" value="login" className="rounded-sm text-sm font-bold data-[state=active]:bg-white data-[state=active]:shadow-none">Login</TabsTrigger>
                <TabsTrigger data-testid="register-tab" value="register" className="rounded-sm text-sm font-bold data-[state=active]:bg-white data-[state=active]:shadow-none">Register as Supplier</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="p-6">
              <TabsContent value="login" className="mt-0 space-y-4">
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">Email</label>
                  <Input data-testid="login-email-input" type="email" placeholder="your@email.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="rounded-sm border-neutral-300" />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">Password</label>
                  <Input data-testid="login-password-input" type="password" placeholder="Enter password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="rounded-sm border-neutral-300" onKeyDown={e => e.key === "Enter" && handleLogin()} />
                </div>
                <Button data-testid="login-submit-btn" onClick={handleLogin} disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-sm h-11 font-bold">
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
                <p className="text-xs text-neutral-500 text-center mt-2">Admin? Use admin@mrb.com / admin123</p>
              </TabsContent>

              <TabsContent value="register" className="mt-0 space-y-4">
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">Full Name *</label>
                  <Input data-testid="reg-name-input" placeholder="Your name" value={regName} onChange={e => setRegName(e.target.value)} className="rounded-sm border-neutral-300" />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">Email *</label>
                  <Input data-testid="reg-email-input" type="email" placeholder="your@email.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="rounded-sm border-neutral-300" />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">Password *</label>
                  <Input data-testid="reg-password-input" type="password" placeholder="Create password" value={regPassword} onChange={e => setRegPassword(e.target.value)} className="rounded-sm border-neutral-300" />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">Phone *</label>
                  <Input data-testid="reg-phone-input" placeholder="10-digit number" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="rounded-sm border-neutral-300" />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">Company Name</label>
                  <Input data-testid="reg-company-input" placeholder="Optional" value={regCompany} onChange={e => setRegCompany(e.target.value)} className="rounded-sm border-neutral-300" />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">Supplier Type</label>
                  <Select value={regType} onValueChange={setRegType}>
                    <SelectTrigger data-testid="reg-type-select" className="rounded-sm border-neutral-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rental">Rental</SelectItem>
                      <SelectItem value="sale">Sale</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-1 block">Cities Served</label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border border-neutral-200 rounded-sm">
                    {CITIES.map(c => (
                      <Badge key={c} data-testid={`city-badge-${c}`} variant={regCities.includes(c) ? "default" : "outline"}
                        className={`cursor-pointer rounded-sm text-xs ${regCities.includes(c) ? "bg-orange-600 hover:bg-orange-700 text-white" : "hover:bg-neutral-100"}`}
                        onClick={() => toggleCity(c)}>{c}</Badge>
                    ))}
                  </div>
                </div>
                <Button data-testid="register-submit-btn" onClick={handleRegister} disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-sm h-11 font-bold">
                  {loading ? "Creating Account..." : "Register"}
                </Button>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
