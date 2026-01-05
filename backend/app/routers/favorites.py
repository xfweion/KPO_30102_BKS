from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user_db
from app.models import FavoriteRecipeCreate
from app.repositories import list_favorites, add_favorite, remove_favorite

router = APIRouter(tags=["favorites"])

@router.get("/favorites")
async def get_favorites(current_user=Depends(get_current_user_db)):
    return {"items": list_favorites(current_user["id"])}

@router.post("/favorites")
async def create_favorite(recipe: FavoriteRecipeCreate, current_user=Depends(get_current_user_db)):
    try:
        add_favorite(current_user["id"], recipe.spoonacular_id, recipe.title, recipe.image)
    except Exception:
        raise HTTPException(status_code=400, detail="Recipe already in favorites")
    return {"message": "Added to favorites"}

@router.delete("/favorites/{spoonacular_id}")
async def delete_favorite(spoonacular_id: int, current_user=Depends(get_current_user_db)):
    deleted = remove_favorite(current_user["id"], spoonacular_id)
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Favorite not found")
    return {"message": "Removed from favorites"}
