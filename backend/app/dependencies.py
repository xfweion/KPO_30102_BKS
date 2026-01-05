from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from app.repositories import get_user_by_email
from app.security import SECRET_KEY, ALGORITHM

bearer_scheme = HTTPBearer()

def get_current_user_email(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> str:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Token missing subject")

    return email

def get_current_user_db(current_user_email: str = Depends(get_current_user_email)):
    user = get_user_by_email(current_user_email)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
