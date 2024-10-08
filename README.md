**Unfortunately this project will be abandoned come March 31 2025 due to Google's changes to the PhotosLibrary API restricting access to images to user-selected and session only. [Read more here](https://developers.google.com/photos/support/updates)**

### Overview

The backend for PicPurge is built with Node.js, Express, Prisma, and PostgreSQL (hosted on Supabase). It manages authentication, Google Photos API integration, and user data.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/justjooshing/photosapp_server.git picpurge_server
   cd picpurge_server
   ```
2. Install dependencies:
   ```bash
   yarn
   ```
3. Set up the database:

   ```bash
   yarn db:update --name init
   ```

4. Run the backend:
   ```bash
   yarn dev
   ```

### Environment Variables

You must add the following environment variables to your `.env` file:

- **GOOGLE_CLIENT_ID**: From Google Cloud Console.
- **GOOGLE_CLIENT_SECRET**: From Google Cloud Console.
- **JWT_SECRET**: A secret key for JWT authentication.
- **DATABASE_URL**: Your PostgreSQL database URL (e.g., from Supabase).
- **SERVER_URI**: The URI where Google OAuth redirects for login.
- **REDIRECT_URI**: The URI where users are redirected after OAuth login.

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a new project.
2. Enable **Google Photos API** and configure OAuth 2.0 credentials.
3. Add the following:
   - **Authorised Javascript Origins**: URLs where your app is hosted (e.g., `https://www.picpurge.app`).
   - **Authorised Redirect URIs**: URI for Google to redirect to your backend (`SERVER_URI`).

### Database Setup

- The backend uses Prisma for ORM and Postgres for the database, hosted on Supabase.
- Use `yarn db:update` to apply any Prisma schema changes.

### Deployment

The backend for PicPurge is deployed using GitHub Actions and hosted on Fly.io.

#### Deployment Process

1. When changes are pushed to the repository, GitHub Actions triggers a workflow to deploy the latest changes to Fly.io.
2. Ensure that you have set up the required secrets in your GitHub repository settings for a successful deployment.

#### GitHub Secrets

You need to add the following secrets to your GitHub repository under **Settings > Secrets and variables > Actions**:

- **FLY_API_TOKEN**: Your Fly.io API token. This is required for GitHub Actions to authenticate and deploy to Fly.io.
- **DATABASE_URL**: Your PostgreSQL database URL (e.g., from Supabase). This is used for the backend to connect to the database.

#### Fly.io Deployment

To manually deploy the backend to Fly.io:

1. Follow Fly.io's documentation to set up and deploy the app using your Fly.io credentials.
2. Make sure to configure environment variables on Fly.io for production.

### Common Issues

1. **OAuth Login Issues**: Ensure that **Authorised Redirect URIs** and **Authorised Javascript Origins** in Google Cloud Console are correctly configured.
2. **Database Connection Issues**: Verify that the `DATABASE_URL` is correct and the Supabase instance is running.
