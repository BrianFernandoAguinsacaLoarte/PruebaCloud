import requests
from urllib.parse import quote_plus


def obtener_poster(titulo):
    api_key = 'a5612262'
    print("API Key usada:", api_key)

    titulo_encoded = quote_plus(titulo)
    url = f"https://www.omdbapi.com/?t={titulo_encoded}&apikey={api_key}"
    print("URL construida:", url)

    respuesta = requests.get(url)
    if respuesta.status_code == 200:
        datos = respuesta.json()
        if datos.get("Response") == "True":
            return datos.get("Poster", None)
    print("Error al obtener el póster:", respuesta.status_code, respuesta.text)
    return None
