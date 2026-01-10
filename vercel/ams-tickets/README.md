# TTS AMS API Mock

This is a mock API for the Ticket Tracking System (TTS) Asset Management System (AMS) integration. It serves captured data from the real API for development and testing purposes.

## Project Structure

- `index.js`: The Express server entry point.
- `mock_data.json`: The captured JSON data from the source API.
- `vercel.json`: Configuration for Vercel deployment.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Access the API:
   - http://localhost:3000/
   - http://localhost:3000/tickets/asset/resolved/

## Deployment to Vercel

1. Install the Vercel CLI (optional, if deploying from CLI):
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

   Follow the prompts. When asked for the project name, you can use `tts-ams-api`.

3. Alternatively, push this folder to a Git repository and import it into your Vercel dashboard.

## Live Deployment

- **Production URL**: https://ams-tickets.vercel.app
- **Target Endpoint**: https://ams-tickets.vercel.app/tickets/asset/resolved/

## API Endpoints

- `GET /`: Returns the full mocked response.
- `GET /tickets/asset/resolved/`: Returns the full mocked response (mimics original path).
