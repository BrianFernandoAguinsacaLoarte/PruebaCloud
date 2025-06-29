from fastapi import FastAPI, Request, Form, Depends
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import os
from dotenv import load_dotenv
from typing import List
from pydantic import BaseModel

from backend.utils import obtener_poster

#REALIZADO POR: BRIAN AGUINSACA -ABEL MORA
# Cargar variables de entorno
load_dotenv()

# Configuración de la aplicación FastAPI
app = FastAPI()

# Configuración de las plantillas
templates = Jinja2Templates(directory="frontend/templates")

# Configuración de la base de datos
DATABASE_URL = os.getenv('DATABASE_URL')
if DATABASE_URL:
    try:
        # Intentar usar PostgreSQL para producción/Docker
        engine = create_engine(DATABASE_URL)
        engine.connect()
        print("✅ Conectado a PostgreSQL")
    except Exception as e:
        print(f"❌ Error conectando a PostgreSQL: {e}")
        print("🔄 Usando SQLite como respaldo")
        DATABASE_URL = 'sqlite:///instance/peliculas.db'
        engine = create_engine(DATABASE_URL)
else:
    # Usar SQLite para desarrollo local
    print("🗃️ Usando SQLite para desarrollo local")
    DATABASE_URL = 'sqlite:///instance/peliculas.db'
    engine = create_engine(DATABASE_URL)

Base = declarative_base()


# Modelo de Película
class Pelicula(Base):
    __tablename__ = 'peliculas'
    id = Column(Integer, primary_key=True)
    titulo = Column(String(100), nullable=False)
    director = Column(String(100), nullable=False)
    anio = Column(Integer, nullable=False)
    poster_url = Column(String(300))


# Crear tablas
Base.metadata.create_all(bind=engine)

# Configurar sesión de la base de datos
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Dependencia para obtener la sesión de la base de datos
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Modelo Pydantic para Película
class PeliculaModel(BaseModel):
    id: int
    titulo: str
    director: str
    anio: int
    poster_url: str

    class Config:
        from_attributes = True


# Ruta principal - GET muestra el formulario, POST procesa los datos
@app.get("/", response_class=HTMLResponse)
async def mostrar_formulario(request: Request, db: Session = Depends(get_db)):
    peliculas = db.query(Pelicula).all()
    return templates.TemplateResponse("formulario.html", {"request": request, "peliculas": peliculas})


@app.post("/agregar_pelicula")
async def agregar_pelicula(request: Request, db: Session = Depends(get_db)):
    datos = await request.json()
    titulo = datos.get("titulo")
    director = datos.get("director")
    anio = datos.get("anio")

    poster = obtener_poster(titulo)

    nueva_pelicula = Pelicula(
        titulo=titulo,
        director=director,
        anio=anio,
        poster_url=poster
    )
    db.add(nueva_pelicula)
    db.commit()

    # Cambiar el return para que funcione con AJAX
    return {"message": "Película guardada exitosamente", "pelicula": {
        "titulo": titulo,
        "director": director,
        "anio": anio,
        "poster_url": poster
    }}

# Si necesitas una API REST también
@app.get("/api/peliculas", response_model=List[PeliculaModel])
async def listar_peliculas(db: Session = Depends(get_db)):
    return db.query(Pelicula).all()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)