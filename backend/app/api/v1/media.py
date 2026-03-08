from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.core.auth import get_current_user
from app.db.session import get_session
from app.models.models import Media, User

router = APIRouter()

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_media(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image uploads are supported."
        )

    file_data = await file.read()
    
    media = Media(
        filename=file.filename,
        content_type=file.content_type,
        data=file_data,
        owner_id=current_user.id
    )
    
    db.add(media)
    await db.commit()
    await db.refresh(media)
    
    return {
        "id": str(media.id),
        "url": str(request.url_for("get_media", media_id=media.id)),
        "filename": media.filename
    }

@router.get("/{media_id}")
async def get_media(
    media_id: UUID,
    db: AsyncSession = Depends(get_session),
):
    media = await db.get(Media, media_id)
    if not media:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found"
        )
    
    return Response(content=media.data, media_type=media.content_type)
