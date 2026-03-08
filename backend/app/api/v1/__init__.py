# This file makes the 'v1' directory a Python package.

# Register routers
from fastapi import APIRouter
from . import documents, auth, quiz, topics, knowledge_nodes

router = APIRouter()
router.include_router(documents.router, prefix="/documents", tags=["documents"])
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(quiz.router, prefix="/quiz", tags=["quiz"])
router.include_router(topics.router, prefix="/topics", tags=["topics"])
router.include_router(knowledge_nodes.router, prefix="/knowledge_nodes", tags=["knowledge_nodes"])
