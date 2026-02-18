import uvicorn
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
import asyncio

from app.db.session import init_db
from app.api.v1 import quiz as quiz_router_v1

app = FastAPI(title="LeaningPhysics API")

# Set up CORS middleware
origins = [
    "http://localhost",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a main router for the v1 API
api_router_v1 = APIRouter()
api_router_v1.include_router(quiz_router_v1.router, prefix="/quiz", tags=["Quiz"])

# Include the v1 router into the main app
app.include_router(api_router_v1, prefix="/api/v1")


@app.on_event("startup")
async def on_startup():
    """
    Event handler for application startup.
    """
    print("Starting up...")
    print("Startup complete.")

@app.get("/")
def read_root():
    return {"message": "Welcome to the LeaningPhysics API"}


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "initdb":
        print("Manual database initialization...")
        asyncio.run(init_db())
        print("Database initialization complete.")
    else:
        uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
