from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Zasiłkowy Przewodnik Przyszłego Rodzica API")

# Konfiguracja CORS - pozwala Reactowi (port 5173) rozmawiać z FastAPI (port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origins=["*"],
)

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "message": "Backend ZUS Przewodnika działa poprawnie!"
    }