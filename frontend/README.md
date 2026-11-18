# India Pincode Lookup

The FastAPI backend reads postal data from the
[India Pincode API](https://aniket-thapa.github.io/india-pincode-api). The app
supports pincode-to-post-office lookup and reverse lookup by state,
city/district, and area/post-office name. Reverse lookup fetches only the
selected district's offices and filters those names in the browser.

Run the backend from the project root:

```powershell
uvicorn main:app --reload
```

Run the frontend from this directory:

```powershell
npm run dev
```

The upstream API is licensed CC BY-NC 4.0, so check its terms before using this
integration commercially.
