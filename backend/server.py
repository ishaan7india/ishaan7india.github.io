from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    username: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserLogin(BaseModel):
    username: str

class Bookmark(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user: str
    url: str
    title: str
    favicon: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BookmarkCreate(BaseModel):
    url: str
    title: str
    favicon: Optional[str] = None

class History(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user: str
    url: str
    title: str
    visit_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HistoryCreate(BaseModel):
    url: str
    title: str

class Preferences(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user: str
    theme: str = "white-gold"
    settings: Dict[str, Any] = Field(default_factory=dict)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PreferencesUpdate(BaseModel):
    theme: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class BrowserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user: str
    name: str
    tabs: List[Dict[str, str]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SessionCreate(BaseModel):
    name: str
    tabs: List[Dict[str, str]]


# Auth Routes
@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    """Simple username-based login"""
    username = user_data.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username cannot be empty")
    
    # Check if user exists
    existing_user = await db.users.find_one({"username": username}, {"_id": 0})
    
    if not existing_user:
        # Create new user
        user = User(username=username)
        doc = user.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.users.insert_one(doc)
        
        # Create default preferences
        prefs = Preferences(user=username)
        prefs_doc = prefs.model_dump()
        prefs_doc['updated_at'] = prefs_doc['updated_at'].isoformat()
        await db.preferences.insert_one(prefs_doc)
    
    return {"success": True, "username": username}


# Bookmark Routes
@api_router.get("/bookmarks")
async def get_bookmarks(user: str):
    """Get all bookmarks for a user"""
    bookmarks = await db.bookmarks.find({"user": user}, {"_id": 0}).to_list(1000)
    
    for bookmark in bookmarks:
        if isinstance(bookmark.get('created_at'), str):
            bookmark['created_at'] = datetime.fromisoformat(bookmark['created_at'])
    
    return bookmarks

@api_router.post("/bookmarks")
async def create_bookmark(user: str, bookmark_data: BookmarkCreate):
    """Create a new bookmark"""
    bookmark = Bookmark(user=user, **bookmark_data.model_dump())
    doc = bookmark.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.bookmarks.insert_one(doc)
    return {"success": True, "bookmark": bookmark}

@api_router.delete("/bookmarks/{bookmark_id}")
async def delete_bookmark(user: str, bookmark_id: str):
    """Delete a bookmark"""
    result = await db.bookmarks.delete_one({"id": bookmark_id, "user": user})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return {"success": True}


# History Routes
@api_router.get("/history")
async def get_history(user: str, limit: int = 100):
    """Get browsing history for a user"""
    history = await db.history.find({"user": user}, {"_id": 0}).sort("visit_time", -1).to_list(limit)
    
    for entry in history:
        if isinstance(entry.get('visit_time'), str):
            entry['visit_time'] = datetime.fromisoformat(entry['visit_time'])
    
    return history

@api_router.post("/history")
async def add_history(user: str, history_data: HistoryCreate):
    """Add a history entry"""
    history = History(user=user, **history_data.model_dump())
    doc = history.model_dump()
    doc['visit_time'] = doc['visit_time'].isoformat()
    
    await db.history.insert_one(doc)
    return {"success": True}

@api_router.delete("/history")
async def clear_history(user: str):
    """Clear all history for a user"""
    await db.history.delete_many({"user": user})
    return {"success": True}


# Preferences Routes
@api_router.get("/preferences")
async def get_preferences(user: str):
    """Get user preferences"""
    prefs = await db.preferences.find_one({"user": user}, {"_id": 0})
    
    if not prefs:
        # Create default preferences if not exists
        default_prefs = Preferences(user=user)
        doc = default_prefs.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.preferences.insert_one(doc)
        return default_prefs
    
    if isinstance(prefs.get('updated_at'), str):
        prefs['updated_at'] = datetime.fromisoformat(prefs['updated_at'])
    
    return prefs

@api_router.put("/preferences")
async def update_preferences(user: str, prefs_data: PreferencesUpdate):
    """Update user preferences"""
    update_data = {k: v for k, v in prefs_data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.preferences.update_one(
        {"user": user},
        {"$set": update_data},
        upsert=True
    )
    
    return {"success": True}


# Session Routes
@api_router.get("/sessions")
async def get_sessions(user: str):
    """Get all saved sessions for a user"""
    sessions = await db.sessions.find({"user": user}, {"_id": 0}).to_list(100)
    
    for session in sessions:
        if isinstance(session.get('created_at'), str):
            session['created_at'] = datetime.fromisoformat(session['created_at'])
    
    return sessions

@api_router.post("/sessions")
async def create_session(user: str, session_data: SessionCreate):
    """Save a browsing session"""
    session = BrowserSession(user=user, **session_data.model_dump())
    doc = session.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.sessions.insert_one(doc)
    return {"success": True, "session": session}

@api_router.delete("/sessions/{session_id}")
async def delete_session(user: str, session_id: str):
    """Delete a saved session"""
    result = await db.sessions.delete_one({"id": session_id, "user": user})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()