FROM nginx:alpine

COPY index.html /usr/share/nginx/html/
COPY static/ /usr/share/nginx/html/static/

# Copiar configuración personalizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]