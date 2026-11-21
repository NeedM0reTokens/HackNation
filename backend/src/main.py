from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routers.pregnancy import router as pregnancy_router

app = FastAPI(title="Zasiłkowy Przewodnik Przyszłego Rodzica API")

# Konfiguracja CORS - pozwala Reactowi (port 5173) rozmawiać z FastAPI (port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routery
app.include_router(pregnancy_router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Backend ZUS Przewodnika działa poprawnie!"}
