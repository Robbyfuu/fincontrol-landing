# FinControl Landing Page

Landing page moderna y de alta conversión para **FinControl**, la plataforma de gestión de gastos inteligente.

## 🚀 Tecnologías

Desarrollado con un stack moderno enfocado en rendimiento y SEO:

- **[Astro v5](https://astro.build/)**: Framework web para contenido estático ultra-rápido.
- **[React](https://react.dev/)**: Componentes interactivos de UI.
- **[Tailwind CSS v3](https://tailwindcss.com/)**: Estilizado utilitario y responsive.
- **[Framer Motion](https://www.framer.com/motion/)**: Animaciones fluidas.
- **[@tabler/icons-react](https://tabler-icons.io/)**: Iconografía consistente.

## 🛠️ Desarrollo Local

1. **Instalar dependencias**:

   ```bash
   pnpm install
   ```

2. **Iniciar servidor de desarrollo**:
   ```bash
   pnpm dev
   ```
   Abre [http://localhost:4321](http://localhost:4321) en tu este navegador.

## 📦 Construcción y Despliegue

Este proyecto está configurado para desplegarse en **Cloudflare Pages** como un sitio estático.

1. **Construir para producción**:

   ```bash
   pnpm build
   ```

   Esto generará los archivos estáticos en la carpeta `dist/`.

2. **Desplegar manual (Wrangler)**:
   ```bash
   pnpm run deploy
   ```
   (Requiere autenticación con `npx wrangler login` la primera vez).

## 📂 Estructura del Proyecto

```text
src/
├── components/    # Componentes UI (Hero, Features, Pricing, etc.)
├── layouts/       # Layouts base (Layout.astro)
├── pages/         # Rutas de la aplicación (index.astro)
└── styles/        # Estilos globales (global.css)
astro.config.mjs   # Configuración de Astro y adaptadores
tailwind.config.mjs # Configuración de Tailwind
```
