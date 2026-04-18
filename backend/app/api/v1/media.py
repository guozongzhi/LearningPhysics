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
    # 支持图片、PDF、文档等多种文件类型
    # if not file.content_type.startswith("image/"):
    #     raise HTTPException(
    #         status_code=status.HTTP_400_BAD_REQUEST,
    #         detail="Only image uploads are supported."
    #     )

    print(f"[MEDIA DEBUG] Receiving file: {file.filename}, type: {file.content_type}")
    
    try:
        file_data = await file.read()
        print(f"[MEDIA DEBUG] File read complete. Size: {len(file_data)} bytes")
    except Exception as e:
        print(f"[MEDIA DEBUG] Error reading file: {str(e)}")
        raise e
    
    media = Media(
        filename=file.filename,
        content_type=file.content_type,
        data=file_data,
        owner_id=current_user.id
    )
    
    print(f"[MEDIA DEBUG] Attempting to add to DB session...")
    db.add(media)
    
    print(f"[MEDIA DEBUG] Attempting commit...")
    await db.commit()
    print(f"[MEDIA DEBUG] Commit successful.")
    await db.refresh(media)
    
    return {
        "id": str(media.id),
        "url": f"/api/v1/media/{media.id}",
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
