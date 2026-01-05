from datetime import timedelta

from fastapi import APIRouter, HTTPException

from app.models import UserCreate, UserLogin
from app.security import get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.repositories import get_user_by_email, create_user

router = APIRouter(tags=["auth"])

@router.post("/register")
async def register(user: UserCreate):
    existing = get_user_by_email(user.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user.password)
    create_user(user.email, hashed_password)
    return {"message": "User registered successfully"}

@router.post("/login")
async def login(user: UserLogin):
    db_user = get_user_by_email(user.email)
    if not db_user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    if not verify_password(user.password, db_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    access_token = create_access_token(
        {"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer"}
