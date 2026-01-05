from fastapi import APIRouter, Depends

from app.dependencies import get_current_user_db

router = APIRouter(tags=["users"])

@router.get("/me")
async def me(current_user=Depends(get_current_user_db)):
    return {"id": current_user["id"], "email": current_user["email"]}
