from pydantic import BaseModel
from typing import Optional

class KnowledgeNodeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
