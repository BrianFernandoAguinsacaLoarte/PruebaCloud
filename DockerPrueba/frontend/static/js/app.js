// Configuración de Supabase
const SUPABASE_URL = 'https://fjxegoiovwchpdsfcgci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqeGVnb2lvdndjaHBkc2ZjZ2NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyMTg1MTEsImV4cCI6MjA2Njc5NDUxMX0.Hd1SIjIYHP39wrW8pbekdhafyb6pV6QAfGB7ddDXM6E';

// Cliente de Supabase
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function probarConexion() {
    try {
        console.log('Probando conexión a Supabase...');


        const { data, error } = await supabaseClient
            .from('peliculas')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Error de conexión:', error);

            if (error.code === 'PGRST116') {
                console.log('💡 La tabla "peliculas" no existe. Necesitas crearla primero.');
                mostrarNotificacion('La tabla "peliculas" no existe. Revisa la consola para instrucciones.', 'error');
                return false;
            }

            return false;
        }

        console.log('✅ Conexión exitosa a Supabase');
        console.log('📊 Registros encontrados:', data?.length || 0);
        return true;
    } catch (error) {
        console.error('❌ Error al conectar con Supabase:', error);
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('peliculaForm');
    const peliculasContainer = document.getElementById('peliculasContainer');

    const conexionExitosa = await probarConexion();

    if (!conexionExitosa) {
        mostrarNotificacion('Verificando configuración de base de datos...', 'error');

        // Mostrar instrucciones para crear la tabla
        console.log(`
🔧 INSTRUCCIONES PARA CREAR LA TABLA:

1. Ve a tu proyecto Supabase: https://supabase.com/dashboard/project/fjxegoiovwchpdsfcgci
2. Entra a "SQL Editor"
3. Ejecuta este código SQL:

CREATE TABLE IF NOT EXISTS public.peliculas (
    id BIGSERIAL PRIMARY KEY,
    titulo TEXT NOT NULL,
    director TEXT NOT NULL,
    anio INTEGER NOT NULL,
    poster_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.peliculas ENABLE ROW LEVEL SECURITY;

-- Política para permitir operaciones anónimas
CREATE POLICY "Permitir todo para anon" ON public.peliculas
    FOR ALL USING (true) WITH CHECK (true);

-- Dar permisos
GRANT ALL ON public.peliculas TO anon;
GRANT ALL ON SEQUENCE public.peliculas_id_seq TO anon;

4. Recarga esta página después de ejecutar el SQL
        `);
    }

    // Cargar películas al iniciar
    if (conexionExitosa) {
        cargarPeliculas();
    }


    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const titulo = form.titulo.value.trim();
        const director = form.director.value.trim();
        const anio = form.anio.value;

        if (!titulo || !director || !anio) {
            mostrarNotificacion('Por favor, completa todos los campos', 'error');
            return;
        }

        try {

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            submitBtn.disabled = true;

            const poster = await obtenerPoster(titulo);

            const nuevaPelicula = {
                titulo,
                director,
                anio: parseInt(anio),
                poster_url: poster || null
            };

            await guardarPelicula(nuevaPelicula);

            await cargarPeliculas();
            form.reset();
            mostrarNotificacion('Película agregada correctamente', 'success');

            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;

        } catch (error) {
            console.error('Error al guardar película:', error);
            mostrarNotificacion('Error al guardar la película: ' + error.message, 'error');

            // Restaurar botón
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Agregar Película';
            submitBtn.disabled = false;
        }
    });

    async function obtenerPoster(titulo) {
        const API_KEY = 'a5612262';
        const url = `https://www.omdbapi.com/?t=${encodeURIComponent(titulo)}&apikey=${API_KEY}`;

        try {
            const respuesta = await fetch(url);
            const datos = await respuesta.json();

            if (datos.Response === "True") {
                return datos.Poster !== "N/A" ? datos.Poster : null;
            } else {
                console.log("OMDB no encontró la película:", datos.Error);
                return null;
            }
        } catch (error) {
            console.error("Error al buscar el póster:", error);
            return null;
        }
    }

    async function guardarPelicula(pelicula) {
        console.log('Intentando guardar película:', pelicula);

        try {
            const { data, error } = await supabaseClient
                .from('peliculas')
                .insert([pelicula])
                .select();

            if (error) {
                console.error('Error al guardar en Supabase:', error);
                throw new Error(`Error de base de datos: ${error.message}`);
            }

            console.log('Película guardada exitosamente:', data);
            return data;
        } catch (error) {
            console.error('Error en guardarPelicula:', error);
            throw error;
        }
    }

    async function cargarPeliculas() {
        try {
            console.log('Cargando películas...');

            const { data: peliculas, error } = await supabaseClient
                .from('peliculas')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error al cargar películas:', error);
                mostrarNotificacion('Error al cargar las películas: ' + error.message, 'error');
                mostrarPeliculas([]);
                return;
            }

            console.log('Películas cargadas:', peliculas);
            mostrarPeliculas(peliculas || []);
        } catch (error) {
            console.error('Error de conexión:', error);
            mostrarNotificacion('Error de conexión con la base de datos', 'error');
            mostrarPeliculas([]);
        }
    }

    async function eliminarPelicula(id, titulo) {
        if (!confirm(`¿Estás seguro de que quieres eliminar "${titulo}"?`)) {
            return;
        }

        try {
            const { error } = await supabaseClient
                .from('peliculas')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error al eliminar película:', error);
                mostrarNotificacion('Error al eliminar la película: ' + error.message, 'error');
                return;
            }

            await cargarPeliculas();
            mostrarNotificacion('Película eliminada correctamente', 'success');
        } catch (error) {
            console.error('Error de conexión:', error);
            mostrarNotificacion('Error de conexión con la base de datos', 'error');
        }
    }

    function mostrarPeliculas(peliculas) {
        if (peliculas.length === 0) {
            peliculasContainer.innerHTML = `
                <div class="col-12">
                    <div class="card form-card shadow-lg">
                        <div class="card-body text-center py-5">
                            <i class="fas fa-film fa-3x text-muted mb-3"></i>
                            <h5 class="text-muted">No hay películas guardadas aún</h5>
                            <p class="text-muted">¡Agrega tu primera película usando el formulario de arriba!</p>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        peliculasContainer.innerHTML = peliculas.map(pelicula => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 shadow-lg">
                    ${pelicula.poster_url ?
                        `<img src="${pelicula.poster_url}" class="card-img-top movie-poster" alt="${pelicula.titulo}" style="height: 400px; object-fit: cover;">` :
                        `<div class="card-img-top no-poster d-flex align-items-center justify-content-center" style="height: 400px;">
                            <i class="fas fa-film fa-4x text-white opacity-75"></i>
                        </div>`
                    }
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title text-primary fw-bold">${pelicula.titulo}</h5>
                        <div class="card-text flex-grow-1">
                            <p class="mb-2">
                                <i class="fas fa-user-tie text-secondary"></i>
                                <strong>Director:</strong> ${pelicula.director}
                            </p>
                            <p class="mb-0">
                                <i class="fas fa-calendar text-secondary"></i>
                                <strong>Año:</strong> ${pelicula.anio}
                            </p>
                        </div>
                    </div>
                    <div class="card-footer bg-transparent border-0 pt-0">
                        <button class="btn btn-danger btn-sm w-100" onclick="eliminarPelicula(${pelicula.id}, '${pelicula.titulo.replace(/'/g, "\\'")}')">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function mostrarNotificacion(mensaje, tipo) {
        const existingNotifications = document.querySelectorAll('.notification-toast');
        existingNotifications.forEach(notif => notif.remove());

        const notification = document.createElement('div');
        notification.className = `alert alert-${tipo === 'success' ? 'success' : 'danger'} alert-dismissible fade show position-fixed notification-toast`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 1050; max-width: 350px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);';
        notification.innerHTML = `
            <i class="fas fa-${tipo === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(notification);
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 4000);
    }

    window.eliminarPelicula = eliminarPelicula;
});