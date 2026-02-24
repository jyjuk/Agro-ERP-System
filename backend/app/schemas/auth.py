from pydantic import BaseModel, ConfigDict
from typing import Optional


class LoginRequest(BaseModel):
    username: str
    password: str


class RoleInfo(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DepartmentInfo(BaseModel):
    id: int
    name: str
    type: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserResponse(BaseModel):
    id: int
    username: str
    role_id: int
    department_id: Optional[int] = None
    is_active: bool
    role: Optional[RoleInfo] = None
    department: Optional[DepartmentInfo] = None

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    username: str | None = None
