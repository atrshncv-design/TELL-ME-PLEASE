from fastapi import FastAPI

app = FastAPI(title="Tell Me Please API")


@app.get("/")
def read_root():
    return {"message": "Tell Me Please API is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
