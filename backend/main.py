"""FastAPI entry point. Run with: uvicorn main:app --reload --port 8000."""
from postlight.auth import get_current_user
from fastapi import Depends, FastAPI
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from postlight.config import settings
from postlight.routers import chat, facilities, health, posts, bookings


app = FastAPI(title="Smart Reserve API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.frontend_origin.split(",")],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.get("/auth/me")
async def read_current_user(
    user: dict = Depends(get_current_user),
):
    return {
        "id": user["id"],
        "email": user.get("email"),
    }

app.include_router(health.router)
app.include_router(posts.router)
app.include_router(chat.router)
app.include_router(facilities.router)
app.include_router(bookings.router)
