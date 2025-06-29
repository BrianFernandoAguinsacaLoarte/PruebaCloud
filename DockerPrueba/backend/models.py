from sqlalchemy.testing import db


class Pelicula(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(100), nullable=False)
    director = db.Column(db.String(100), nullable=False)
    anio = db.Column(db.Integer, nullable=False)
    poster_url = db.Column(db.String(250), nullable=True)
