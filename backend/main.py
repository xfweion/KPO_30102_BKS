from fastapi import FastAPI

from app.routers import auth, users, favorites, history, search, recipes

app = FastAPI(title="Recipe Search App")

@app.get("/")
async def root():
    return {"message": "Hello, Recipe Search App!"}

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(favorites.router)
app.include_router(history.router)
app.include_router(search.router)
app.include_router(recipes.router)