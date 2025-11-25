from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import hashlib

app = FastAPI()

SECRET_KEY = "your_secret_key_here"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

fake_users_db = {}

def sha256_password(password: str) -> bytes:
    return hashlib.sha256(password.encode('utf-8')).digest()

def get_password_hash(password: str) -> str:
    sha256_pw_bytes = sha256_password(password)
    return pwd_context.hash(sha256_pw_bytes)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    sha256_pw_bytes = sha256_password(plain_password)
    return pwd_context.verify(sha256_pw_bytes, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=600))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@app.post("/register")
async def register(user: UserCreate):
    if user.email in fake_users_db:
        raise HTTPException(status_code=400, detail="Пользователь с указанным Email уже зарегистрирован.")
    hashed_password = get_password_hash(user.password)
    fake_users_db[user.email] = {"email": user.email, "hashed_password": hashed_password}
    return {"message": "Пользователь успешно зарегистрирован!"}

@app.post("/login")
async def login(user: UserLogin):
    db_user = fake_users_db.get(user.email)
    if not db_user:
        raise HTTPException(status_code=400, detail="Неверный Email или пароль.")
    if not verify_password(user.password, db_user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Неверный Email или пароль.")
    access_token = create_access_token({"sub": user.email}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": access_token, "token_type": "bearer"}
