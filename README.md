# India Pincode Lookup

A full-stack web application for looking up Indian post offices in either
direction:

- Enter a six-digit pincode to see its state, district, and post offices.
- Search by post-office name and optionally narrow the results by city or
  district to find matching pincodes.

The project uses a FastAPI backend and a React frontend. Postal records come
from [PostalPincode](https://api.postalpincode.in);
the project does not bundle or maintain its own postal dataset.

## Features

- Search by pincode or by post-office name with an optional city/district
  filter.
- Display post-office type and delivery status, and show pincodes for area
  search results.
- Validate pincode input and provide loading, empty, and error states.
- Expose a bulk pincode lookup endpoint for up to 20 pincodes per request.
- Keep upstream API requests in the backend and validate their response data.

## Tech stack

- **Frontend:** React, Vite, Tailwind CSS, and DaisyUI
- **Backend:** Python, FastAPI, and Pydantic
- **Postal data:** PostalPincode API

## Project structure

```text
Backend/
  data.py             # HTTP client for the postal data API
  exception.py        # Pincode error handlers
  main.py             # FastAPI application and routes
  model.py            # Request and response models
  requirements.txt    # Python dependencies
frontend/
  src/App.jsx         # Lookup interface
  package.json        # Frontend scripts and dependencies
```

## Run locally

### 1. Start the backend

From the project root, create and activate a virtual environment, then install
the backend dependencies:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r Backend\requirements.txt
Set-Location Backend
uvicorn main:app --reload
```

The API will be available at `http://127.0.0.1:8000`. Interactive API
documentation is available at `http://127.0.0.1:8000/docs`.

### 2. Start the frontend

In a second terminal:

```powershell
Set-Location frontend
npm install
```

Create `frontend/.env.local` with the local backend URL:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Then start Vite:

```powershell
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).
Frontend environment variables prefixed with `VITE_` are included in the
browser bundle, so do not put secrets in them.

## API routes

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/lookup?query={value}` | Look up a six-digit pincode or search by post-office name |
| `GET` | `/lookup?query={office_name}&city={city}` | Search by post-office name and optionally filter by district or block/city |
| `POST` | `/pincode/bulk` | Look up up to 20 pincodes |

The `/lookup` route interprets a six-digit numeric `query` as a pincode; other
values are searched as post-office names. For example:

```text
/lookup?query=110001
/lookup?query=Connaught%20Place&city=Central%20Delhi
```

The frontend keeps searches on the same page while storing them in its own
URL, so a search can be bookmarked or shared:

```text
/?mode=pincode&query=110001
/?mode=area&query=Connaught%20Place&city=Central%20Delhi
```

Example bulk request:

```json
{
  "pincodes": ["110001", "560001"]
}
```

## Build and lint the frontend

From `frontend/`:

```powershell
npm run build
npm run lint
```

## Deployment notes

GitHub Pages can host the built frontend, but it cannot run the FastAPI
backend. Deploy the backend to a Python-capable hosting service, set
`VITE_API_URL` to that backend's public URL when building the frontend, and
configure the backend's CORS allowed origins to include the deployed frontend
domain. The current backend CORS configuration allows the local Vite origin
only, so it must be updated for a deployed frontend.

The backend depends on the upstream postal API being available. The upstream
post-office search returns the locations it matches; the optional city filter
matches the returned district or block fields. The project does not currently
provide its own postal-data fallback, authentication, or rate limiting; add
appropriate operational controls before exposing it to significant public
traffic.

## Data source and license

Postal data is fetched from
[api.postalpincode.in](https://api.postalpincode.in). Review the provider's
current usage terms, availability, and any rate limits before relying on the
service in a public or commercial application.

## Portfolio note

This project demonstrates a full-stack lookup flow: a React UI, a FastAPI
service, input validation, upstream API integration, typed response models,
and deployment configuration for separate frontend and backend services.
