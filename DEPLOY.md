# Desplegar EUDR Kenzly SaaS en Vercel

El proyecto está listo para producción (el build pasa y `.env.local` está
excluido de git). Se puede desplegar con el **Vercel CLI**, que sube la carpeta
directamente sin necesidad de GitHub.

## Pasos (desde la raíz del repo)

1. **Iniciar sesión** en Vercel (abre el navegador para autenticar):

   ```
   vercel login
   ```

2. **Vincular / crear el proyecto** (responde las preguntas; detecta Next.js solo):

   ```
   vercel link
   ```

   - Scope: tu cuenta
   - Link to existing project: **No** → crea uno nuevo
   - Project name: `eudr-kenzly-saas` (o el que quieras)
   - Directory: `./` (Enter)

3. **Subir las variables de entorno** (lee tu `.env.local` y las carga en
   production/preview/development):

   ```
   powershell -ExecutionPolicy Bypass -File scripts\vercel-env.ps1
   ```

   Variables que se suben (las 4):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_MAPBOX_TOKEN`

4. **Desplegar a producción**:

   ```
   vercel --prod
   ```

   Al terminar te da la URL pública (algo como
   `https://eudr-kenzly-saas.vercel.app`).

## Después del primer deploy

- **Mapbox**: si tu token tiene restricción por URL, agrega el dominio de Vercel
  en https://account.mapbox.com (Tokens → tu token → URL restrictions). Si no
  tiene restricción, funciona tal cual.
- **Supabase Auth**: usamos correo/contraseña, que funciona desde cualquier
  dominio; no requiere configurar URLs de redirección.
- Para volver a desplegar tras cambios: `vercel --prod`.

## Nota PWA (siguiente fase)

La URL de Vercel es HTTPS, requisito para que la app se instale como PWA en los
celulares de los inspectores y funcione offline. Eso se construye después de
este deploy.
