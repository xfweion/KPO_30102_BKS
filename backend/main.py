from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import hashlib
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

app = FastAPI()

SECRET_KEY = "your_secret_key_here"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()

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

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> str:
    token = credentials.credentials  # это чистый JWT без слова Bearer

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        # токен битый / подпись не подходит / истёк / неверный формат
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Token missing subject")

    return email

@app.post("/register")
async def register(user: UserCreate):
    if user.email in fake_users_db:
        raise HTTPException(status_code=400, detail="Пользователь с указанным E-mail уже зарегистрирован.")
    hashed_password = get_password_hash(user.password)
    fake_users_db[user.email] = {"email": user.email, "hashed_password": hashed_password}
    return {"message": "Пользователь успешно зарегистрирован!"}

@app.post("/login")
async def login(user: UserLogin):
    db_user = fake_users_db.get(user.email)
    if not db_user:
        raise HTTPException(status_code=400, detail="Неверный E-mail или пароль.")
    if not verify_password(user.password, db_user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Неверный E-mail или пароль.")
    access_token = create_access_token({"sub": user.email}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/me")
async def me(current_user_email: str = Depends(get_current_user)):
    return {"email": current_user_email}
