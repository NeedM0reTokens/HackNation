from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers.maternity import router as maternity_router
from api.routers.pregnancy import router as pregnancy_router

app = FastAPI(title="Zasiłkowy Przewodnik Przyszłego Rodzica API")

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

app.include_router(pregnancy_router)
app.include_router(maternity_router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Backend ZUS Przewodnika działa poprawnie!"}
