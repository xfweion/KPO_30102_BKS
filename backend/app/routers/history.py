from fastapi import APIRouter, Depends

from app.dependencies import get_current_user_db
from app.models import SearchQueryCreate
from app.repositories import add_history_item, list_history

router = APIRouter(tags=["history"])

@router.get("/history")
async def get_history(current_user=Depends(get_current_user_db)):
    return {"items": list_history(current_user["id"])}

@router.post("/history")
async def create_history_item(query: SearchQueryCreate, current_user=Depends(get_current_user_db)):
    add_history_item(current_user["id"], query.ingredients)
    return {"message": "Saved to history"}
