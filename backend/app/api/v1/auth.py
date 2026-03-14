from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from datetime import timedelta
from pydantic import BaseModel

from app.db.session import get_session
from app.models.models import User
from app.core.auth import create_access_token, verify_password, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user
from app.schemas.auth import Token, UserCreate, UserResponse
from app.core.logging_config import log_auth_event, api_logger

router = APIRouter()


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


from app.core.user_config import users_config, get_whitelisted_usernames

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_session)):
    if users_config.whitelist_only_registration:
        allowed_usernames = get_whitelisted_usernames()
        if user_data.username not in allowed_usernames:
            log_auth_event("REGISTER", user_data.username, False, "用户名不在白名单中")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Registration is currently restricted to whitelisted students only."
            )

    existing_user = await db.execute(
        select(User).where((User.email == user_data.email) | (User.username == user_data.username))
    )
    if existing_user.scalar_one_or_none():
        log_auth_event("REGISTER", user_data.username, False, "用户已存在")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or username already exists"
        )

    db_user = User(email=user_data.email, username=user_data.username)
    db_user.set_password(user_data.password)
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    
    log_auth_event("REGISTER", user_data.username, True)
    return UserResponse.from_orm(db_user)


@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_session)):
    api_logger.debug(f"登录尝试 - 用户名: {form_data.username}")
    
    result = await db.execute(select(User).where(User.username == form_data.username))
    user = result.scalar_one_or_none()
    
    if user:
        api_logger.debug(f"用户找到 - ID: {user.id}, 名称: {user.username}, 管理员: {user.is_admin}, 活跃: {user.is_active}")
        is_password_correct = user.check_password(form_data.password)
        api_logger.debug(f"密码检查: {is_password_correct}")

    if not user or not user.check_password(form_data.password):
        log_auth_event("LOGIN", form_data.username, False, "凭证不正确")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        log_auth_event("LOGIN", form_data.username, False, "用户已禁用")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    log_auth_event("LOGIN", user.username, True, f"用户管理员: {user.is_admin}")
    response = {"access_token": access_token, "token_type": "bearer", "is_admin": user.is_admin}
    return response


@router.put("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    if not current_user.check_password(data.old_password):
        raise HTTPException(status_code=400, detail="Old password is incorrect")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    current_user.set_password(data.new_password)
    await db.commit()
    return {"message": "Password changed successfully"}