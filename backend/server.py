from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ===================== CONFIG =====================
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
JWT_SECRET = os.environ.get('JWT_SECRET', 'mrb_default_secret')
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

app = FastAPI(title="MRB Listing Platform API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ===================== AUTH UTILITIES =====================
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_supplier(user=Depends(get_current_user)):
    if user.get("role") != "supplier":
        raise HTTPException(status_code=403, detail="Supplier access required")
    return user

# ===================== PYDANTIC MODELS =====================
class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    company_name: Optional[str] = ""
    phone: str
    supplier_type: Optional[str] = "hybrid"
    cities_served: Optional[List[str]] = []

class LoginRequest(BaseModel):
    email: str
    password: str

class ProductCreate(BaseModel):
    name: str
    category: Optional[str] = "General"
    description: Optional[str] = ""

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class LeadItem(BaseModel):
    product_name: str
    product_id: Optional[str] = None
    quantity: int

class LeadCreate(BaseModel):
    buyer_phone: str
    buyer_name: Optional[str] = ""
    buyer_company: Optional[str] = ""
    city: str
    start_date: str
    end_date: str
    items: List[LeadItem]
    source: Optional[str] = "platform"

class LeadVerify(BaseModel):
    status: str  # verified, not_reachable, fake

class LeadAssign(BaseModel):
    supplier_ids: List[str]

class StageUpdate(BaseModel):
    status: str  # new, contacted, quotation_sent, won, lost

class NotesUpdate(BaseModel):
    notes: str

class ServiceProviderCreate(BaseModel):
    name: str
    category: str  # labor, transport
    phone: Optional[str] = ""
    city: Optional[str] = ""
    description: Optional[str] = ""

class SupplierProfileUpdate(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None
    supplier_type: Optional[str] = None
    cities_served: Optional[List[str]] = None

# ===================== AUTH ROUTES =====================
@api_router.post("/auth/register")
async def register(req: RegisterRequest):
    existing = await db.users.find_one({"email": req.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": str(uuid.uuid4()),
        "email": req.email,
        "password_hash": hash_password(req.password),
        "role": "supplier",
        "name": req.name,
        "company_name": req.company_name or "",
        "phone": req.phone,
        "supplier_type": req.supplier_type or "hybrid",
        "cities_served": req.cities_served or [],
        "performance_score": 0,
        "total_won": 0,
        "total_leads": 0,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    doc = {**user}
    await db.users.insert_one(doc)
    token = create_token(user["id"], user["role"])
    return {
        "token": token,
        "user": {k: v for k, v in user.items() if k != "password_hash"}
    }

@api_router.post("/auth/login")
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email}, {"_id": 0})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"], user["role"])
    return {
        "token": token,
        "user": {k: v for k, v in user.items() if k != "password_hash"}
    }

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {k: v for k, v in user.items() if k != "password_hash"}

# ===================== PRODUCT ROUTES =====================
@api_router.get("/products")
async def list_products():
    products = await db.products.find({"is_active": True}, {"_id": 0}).to_list(500)
    return products

@api_router.post("/products")
async def create_product(req: ProductCreate, user=Depends(require_admin)):
    product = {
        "id": str(uuid.uuid4()),
        "name": req.name,
        "category": req.category,
        "description": req.description or "",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.products.insert_one(product)
    return {k: v for k, v in product.items() if k != "_id"}

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, req: ProductUpdate, user=Depends(require_admin)):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    result = await db.products.update_one({"id": product_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    return product

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, user=Depends(require_admin)):
    result = await db.products.update_one({"id": product_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

# ===================== LEAD ROUTES (BUYER - PUBLIC) =====================
@api_router.post("/leads")
async def create_lead(req: LeadCreate):
    # Check repeat buyer
    existing_leads = await db.leads.find({"buyer_phone": req.buyer_phone}, {"_id": 0}).to_list(100)
    is_repeat = len(existing_leads) > 0

    lead = {
        "id": str(uuid.uuid4()),
        "buyer_phone": req.buyer_phone,
        "buyer_name": req.buyer_name or "",
        "buyer_company": req.buyer_company or "",
        "city": req.city,
        "start_date": req.start_date,
        "end_date": req.end_date,
        "items": [item.model_dump() for item in req.items],
        "source": req.source or "platform",
        "status": "pending",
        "is_repeat_buyer": is_repeat,
        "submission_count": len(existing_leads) + 1,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "verified_at": None
    }
    await db.leads.insert_one(lead)
    return {k: v for k, v in lead.items() if k != "_id"}

@api_router.get("/leads")
async def list_leads(status: Optional[str] = None, user=Depends(require_admin)):
    query = {}
    if status:
        query["status"] = status
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return leads

@api_router.get("/leads/{lead_id}")
async def get_lead(lead_id: str, user=Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    assignments = await db.lead_assignments.find({"lead_id": lead_id}, {"_id": 0}).to_list(50)
    lead["assignments"] = assignments
    return lead

# ===================== LEAD MANAGEMENT (ADMIN) =====================
@api_router.put("/leads/{lead_id}/verify")
async def verify_lead(lead_id: str, req: LeadVerify, user=Depends(require_admin)):
    if req.status not in ["verified", "not_reachable", "fake"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    updates = {"status": req.status}
    if req.status == "verified":
        updates["verified_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.leads.update_one({"id": lead_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    return lead

@api_router.post("/leads/{lead_id}/assign")
async def assign_lead(lead_id: str, req: LeadAssign, user=Depends(require_admin)):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if lead["status"] != "verified":
        raise HTTPException(status_code=400, detail="Only verified leads can be assigned")
    if len(req.supplier_ids) < 5 or len(req.supplier_ids) > 7:
        raise HTTPException(status_code=400, detail="Must assign 5-7 suppliers")

    # Remove existing assignments for this lead
    await db.lead_assignments.delete_many({"lead_id": lead_id})

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=48)
    assignments = []
    for sid in req.supplier_ids:
        supplier = await db.users.find_one({"id": sid, "role": "supplier"}, {"_id": 0})
        if not supplier:
            continue
        assignment = {
            "id": str(uuid.uuid4()),
            "lead_id": lead_id,
            "supplier_id": sid,
            "supplier_name": supplier.get("name", ""),
            "status": "new",
            "assigned_at": now.isoformat(),
            "opened_at": None,
            "contacted_at": None,
            "quotation_sent_at": None,
            "won_at": None,
            "lost_at": None,
            "notes": "",
            "is_first_responder": False,
            "expires_at": expires_at.isoformat(),
            "is_expired": False
        }
        await db.lead_assignments.insert_one(assignment)
        assignments.append({k: v for k, v in assignment.items() if k != "_id"})
        # Update supplier total_leads
        await db.users.update_one({"id": sid}, {"$inc": {"total_leads": 1}})
        # Mock notification
        await db.notifications_log.insert_one({
            "id": str(uuid.uuid4()),
            "supplier_id": sid,
            "lead_id": lead_id,
            "type": "email",
            "message": f"New lead assigned: {lead.get('city', '')} - {len(lead.get('items', []))} items",
            "sent_at": now.isoformat(),
            "status": "mock_sent"
        })

    return {"assignments": assignments, "count": len(assignments)}

@api_router.get("/leads/{lead_id}/assignments")
async def get_lead_assignments(lead_id: str, user=Depends(require_admin)):
    assignments = await db.lead_assignments.find({"lead_id": lead_id}, {"_id": 0}).to_list(50)
    return assignments

# ===================== SUPPLIER LEAD ROUTES =====================
@api_router.get("/supplier/leads")
async def get_supplier_leads(user=Depends(require_supplier)):
    assignments = await db.lead_assignments.find(
        {"supplier_id": user["id"], "is_expired": False}, {"_id": 0}
    ).sort("assigned_at", -1).to_list(500)

    # Enrich with lead data
    for a in assignments:
        lead = await db.leads.find_one({"id": a["lead_id"]}, {"_id": 0})
        if lead:
            a["lead"] = lead

        # Mark as opened if first time
        if a["status"] == "new" and not a.get("opened_at"):
            now = datetime.now(timezone.utc).isoformat()
            await db.lead_assignments.update_one(
                {"id": a["id"]}, {"$set": {"opened_at": now}}
            )
            a["opened_at"] = now

    return assignments

@api_router.put("/supplier/assignments/{assignment_id}/stage")
async def update_assignment_stage(assignment_id: str, req: StageUpdate, user=Depends(require_supplier)):
    valid_stages = ["new", "contacted", "quotation_sent", "won", "lost"]
    if req.status not in valid_stages:
        raise HTTPException(status_code=400, detail="Invalid stage")

    assignment = await db.lead_assignments.find_one(
        {"id": assignment_id, "supplier_id": user["id"]}, {"_id": 0}
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    now = datetime.now(timezone.utc).isoformat()
    updates = {"status": req.status}

    if req.status == "contacted" and not assignment.get("contacted_at"):
        updates["contacted_at"] = now
    elif req.status == "quotation_sent" and not assignment.get("quotation_sent_at"):
        updates["quotation_sent_at"] = now
        # Check for first responder
        existing_qs = await db.lead_assignments.find_one({
            "lead_id": assignment["lead_id"],
            "status": "quotation_sent",
            "id": {"$ne": assignment_id}
        })
        if not existing_qs:
            updates["is_first_responder"] = True
    elif req.status == "won" and not assignment.get("won_at"):
        updates["won_at"] = now
        await db.users.update_one({"id": user["id"]}, {"$inc": {"total_won": 1}})
        # Recalc performance score
        supplier = await db.users.find_one({"id": user["id"]}, {"_id": 0})
        total_l = supplier.get("total_leads", 1) or 1
        total_w = supplier.get("total_won", 0) + 1
        score = round((total_w / total_l) * 100, 1)
        await db.users.update_one({"id": user["id"]}, {"$set": {"performance_score": score}})
    elif req.status == "lost" and not assignment.get("lost_at"):
        updates["lost_at"] = now

    await db.lead_assignments.update_one({"id": assignment_id}, {"$set": updates})
    updated = await db.lead_assignments.find_one({"id": assignment_id}, {"_id": 0})
    return updated

@api_router.put("/supplier/assignments/{assignment_id}/notes")
async def update_assignment_notes(assignment_id: str, req: NotesUpdate, user=Depends(require_supplier)):
    assignment = await db.lead_assignments.find_one(
        {"id": assignment_id, "supplier_id": user["id"]}, {"_id": 0}
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    await db.lead_assignments.update_one({"id": assignment_id}, {"$set": {"notes": req.notes}})
    return {"message": "Notes updated"}

@api_router.get("/supplier/profile")
async def get_supplier_profile(user=Depends(require_supplier)):
    return {k: v for k, v in user.items() if k != "password_hash"}

@api_router.put("/supplier/profile")
async def update_supplier_profile(req: SupplierProfileUpdate, user=Depends(require_supplier)):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    await db.users.update_one({"id": user["id"]}, {"$set": updates})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return {k: v for k, v in updated.items() if k != "password_hash"}

# ===================== ADMIN ROUTES =====================
@api_router.get("/admin/suppliers")
async def list_suppliers(user=Depends(require_admin)):
    suppliers = await db.users.find({"role": "supplier"}, {"_id": 0, "password_hash": 0}).sort("performance_score", -1).to_list(500)
    return suppliers

@api_router.get("/admin/metrics")
async def get_metrics(user=Depends(require_admin)):
    total_leads = await db.leads.count_documents({})
    verified = await db.leads.count_documents({"status": "verified"})
    not_reachable = await db.leads.count_documents({"status": "not_reachable"})
    fake = await db.leads.count_documents({"status": "fake"})
    pending = await db.leads.count_documents({"status": "pending"})
    total_quotations = await db.lead_assignments.count_documents({"status": "quotation_sent"})
    total_won = await db.lead_assignments.count_documents({"status": "won"})
    total_suppliers = await db.users.count_documents({"role": "supplier"})

    # Top suppliers by won leads
    top_suppliers = await db.users.find(
        {"role": "supplier", "total_won": {"$gt": 0}},
        {"_id": 0, "password_hash": 0}
    ).sort("total_won", -1).to_list(10)

    return {
        "total_leads": total_leads,
        "verified": verified,
        "not_reachable": not_reachable,
        "fake": fake,
        "pending": pending,
        "total_quotations": total_quotations,
        "total_won": total_won,
        "total_suppliers": total_suppliers,
        "top_suppliers": top_suppliers
    }

# ===================== SERVICE PROVIDER ROUTES =====================
@api_router.get("/service-providers")
async def list_service_providers(user=Depends(require_admin)):
    providers = await db.service_providers.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return providers

@api_router.post("/service-providers")
async def create_service_provider(req: ServiceProviderCreate, user=Depends(require_admin)):
    provider = {
        "id": str(uuid.uuid4()),
        "name": req.name,
        "category": req.category,
        "phone": req.phone or "",
        "city": req.city or "",
        "description": req.description or "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.service_providers.insert_one(provider)
    return {k: v for k, v in provider.items() if k != "_id"}

@api_router.put("/service-providers/{provider_id}")
async def update_service_provider(provider_id: str, req: ServiceProviderCreate, user=Depends(require_admin)):
    updates = req.model_dump()
    result = await db.service_providers.update_one({"id": provider_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Provider not found")
    provider = await db.service_providers.find_one({"id": provider_id}, {"_id": 0})
    return provider

@api_router.delete("/service-providers/{provider_id}")
async def delete_service_provider(provider_id: str, user=Depends(require_admin)):
    result = await db.service_providers.delete_one({"id": provider_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Provider not found")
    return {"message": "Provider deleted"}

# ===================== PUBLIC ROUTES =====================
@api_router.get("/public/suppliers")
async def public_suppliers(city: Optional[str] = None):
    query = {"role": "supplier", "is_active": True}
    if city:
        query["cities_served"] = city
    suppliers = await db.users.find(query, {"_id": 0, "name": 1, "company_name": 1, "cities_served": 1, "supplier_type": 1}).to_list(100)
    return suppliers

@api_router.get("/public/cities")
async def get_cities():
    return ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Pune", "Ahmedabad",
            "Kolkata", "Jaipur", "Lucknow", "Surat", "Nagpur", "Indore", "Bhopal",
            "Thane", "Visakhapatnam", "Vadodara", "Nashik", "Coimbatore", "Kochi",
            "Chandigarh", "Gurgaon", "Noida", "Faridabad", "Ghaziabad"]

@api_router.get("/supplier/badges")
async def get_supplier_badges(user=Depends(require_supplier)):
    # First Responder count
    fr_count = await db.lead_assignments.count_documents({
        "supplier_id": user["id"], "is_first_responder": True
    })
    # Top Supplier check
    top_supplier = await db.users.find(
        {"role": "supplier"}, {"_id": 0, "id": 1, "total_won": 1}
    ).sort("total_won", -1).to_list(1)
    is_top = top_supplier and top_supplier[0].get("id") == user["id"] and top_supplier[0].get("total_won", 0) > 0
    return {
        "first_responder_count": fr_count,
        "is_top_supplier": is_top,
        "total_won": user.get("total_won", 0),
        "performance_score": user.get("performance_score", 0)
    }

# ===================== BACKGROUND TASKS =====================
async def check_expired_leads():
    while True:
        try:
            now = datetime.now(timezone.utc).isoformat()
            expired = await db.lead_assignments.find({
                "is_expired": False,
                "status": "new",
                "expires_at": {"$lt": now}
            }, {"_id": 0}).to_list(100)

            for assignment in expired:
                await db.lead_assignments.update_one(
                    {"id": assignment["id"]},
                    {"$set": {"is_expired": True, "status": "expired"}}
                )
                logger.info(f"Lead assignment {assignment['id']} expired")

                # Try to reassign to another supplier in same city
                lead = await db.leads.find_one({"id": assignment["lead_id"]}, {"_id": 0})
                if lead:
                    existing_supplier_ids = [a["supplier_id"] for a in
                        await db.lead_assignments.find({"lead_id": assignment["lead_id"]}, {"_id": 0, "supplier_id": 1}).to_list(50)]
                    new_supplier = await db.users.find_one({
                        "role": "supplier",
                        "is_active": True,
                        "cities_served": lead.get("city", ""),
                        "id": {"$nin": existing_supplier_ids}
                    }, {"_id": 0})
                    if new_supplier:
                        new_assignment = {
                            "id": str(uuid.uuid4()),
                            "lead_id": assignment["lead_id"],
                            "supplier_id": new_supplier["id"],
                            "supplier_name": new_supplier.get("name", ""),
                            "status": "new",
                            "assigned_at": now,
                            "opened_at": None,
                            "contacted_at": None,
                            "quotation_sent_at": None,
                            "won_at": None,
                            "lost_at": None,
                            "notes": "",
                            "is_first_responder": False,
                            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=48)).isoformat(),
                            "is_expired": False
                        }
                        await db.lead_assignments.insert_one(new_assignment)
                        logger.info(f"Reassigned lead {assignment['lead_id']} to {new_supplier['name']}")
        except Exception as e:
            logger.error(f"Error in lead expiry check: {e}")
        await asyncio.sleep(3600)  # Check every hour

# ===================== STARTUP =====================
expiry_task = None

@app.on_event("startup")
async def startup():
    global expiry_task
    logger.info("Starting MRB Listing Platform...")

    # Create indexes
    await db.users.create_index("id", unique=True)
    await db.users.create_index("email", unique=True)
    await db.products.create_index("id", unique=True)
    await db.leads.create_index("id", unique=True)
    await db.leads.create_index("buyer_phone")
    await db.lead_assignments.create_index("id", unique=True)
    await db.lead_assignments.create_index("lead_id")
    await db.lead_assignments.create_index("supplier_id")
    await db.service_providers.create_index("id", unique=True)

    # Seed admin
    admin_exists = await db.users.find_one({"email": "admin@mrb.com"})
    if not admin_exists:
        admin = {
            "id": str(uuid.uuid4()),
            "email": "admin@mrb.com",
            "password_hash": hash_password("admin123"),
            "role": "admin",
            "name": "MRB Admin",
            "company_name": "MRB Platform",
            "phone": "9999999999",
            "supplier_type": None,
            "cities_served": [],
            "performance_score": 0,
            "total_won": 0,
            "total_leads": 0,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin)
        logger.info("Admin account seeded: admin@mrb.com / admin123")

    # Seed products
    product_count = await db.products.count_documents({})
    if product_count == 0:
        products = [
            {"name": "Scaffolding Pipe (MS Pipe)", "category": "Pipes"},
            {"name": "Right Angle Clamp", "category": "Clamps"},
            {"name": "Swivel Clamp", "category": "Clamps"},
            {"name": "Cup Lock System", "category": "Systems"},
            {"name": "H-Frame Scaffold", "category": "Frames"},
            {"name": "Base Plate", "category": "Accessories"},
            {"name": "Adjustable Jack", "category": "Accessories"},
            {"name": "Walk Board (Plank)", "category": "Platforms"},
            {"name": "Safety Net", "category": "Safety"},
            {"name": "Scaffolding Ladder", "category": "Safety"},
            {"name": "Caster Wheel", "category": "Accessories"},
            {"name": "Cross Brace", "category": "Frames"},
        ]
        for p in products:
            await db.products.insert_one({
                "id": str(uuid.uuid4()),
                "name": p["name"],
                "category": p["category"],
                "description": "",
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        logger.info(f"Seeded {len(products)} products")

    # Start background task
    expiry_task = asyncio.create_task(check_expired_leads())
    logger.info("Lead expiry background task started")

@app.on_event("shutdown")
async def shutdown():
    global expiry_task
    if expiry_task:
        expiry_task.cancel()
    client.close()

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
