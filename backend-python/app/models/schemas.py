from typing import List, Optional, Literal
from pydantic import BaseModel, Field

class ExtractRequest(BaseModel):
    url: str = Field(..., description="Target social media post or media URL")

class MediaItemSchema(BaseModel):
    id: str
    type: Literal["image", "video"]
    thumbnail_url: str
    media_url: str
    thumbnailUrl: Optional[str] = None
    mediaUrl: Optional[str] = None
    duration: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None

class ExtractResponse(BaseModel):
    platform: Literal["instagram", "youtube", "threads", "twitter", "tiktok", "facebook", "generic"]
    media_type: Literal["single_image", "carousel", "video"]
    mediaType: Optional[str] = None
    title: str
    items: List[MediaItemSchema]
    thumbnail: Optional[str] = None
