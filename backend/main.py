from fastapi import FastAPI
from app.routers import auth, users, favorites, history, search, recipes
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pathlib import Path


app = FastAPI(title="Recipe Search App")

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

@app.get("/", response_class=HTMLResponse)
async def root():
    return (FRONTEND_DIR / "main.html").read_text(encoding="utf-8")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(favorites.router)
app.include_router(history.router)
app.include_router(search.router, prefix="/search", tags=["search"])
app.include_router(recipes.router)