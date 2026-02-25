from pydantic import BaseModel
from typing import Optional
from app.models.models import User

class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[str] = None


class UserBase(BaseModel):
    email: str
    username: str


class UserCreate(UserBase):
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    is_active: bool

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj: User):
        return cls(
            id=str(obj.id),
            email=obj.email,
            username=obj.username,
            is_active=obj.is_active
        )