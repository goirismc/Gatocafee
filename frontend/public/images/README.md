Cómo subir imágenes de producto

Opciones:

1) Subir manualmente (rápido):
   - Copia el archivo de imagen a `frontend/public/images/`.
   - Usa un nombre sin espacios, por ejemplo `cafe-americano.jpg`.
   - En la base de datos (colección `productos`), actualiza el campo `imagen` a `/images/cafe-americano.jpg`.

2) Desde el admin (recomendado):
   - Puedo implementar un uploader en el panel de administración que suba la imagen a `frontend/public/images/` y actualice `producto.imagen` automáticamente.

Notas:
- Las rutas que debes guardar en `producto.imagen` deben empezar con `/images/` (ej: `/images/mi-producto.jpg`).
- Después de añadir la imagen al directorio `public`, reinicia el servidor de desarrollo si usas Next.js para asegurarte de que el archivo está disponible.
- Si quieres, implemento automáticamente el uploader y el campo en el admin para subir y asignar imágenes desde la interfaz.
