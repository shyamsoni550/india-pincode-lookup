"""HTTP client for the PostalPincode API."""

import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


API_BASE_URL = "https://api.postalpincode.in"


class PincodeAPIError(Exception):
    """Raised when the upstream pincode API cannot be used."""


class PincodeResourceNotFoundError(PincodeAPIError):
    """Raised when the upstream API has no matching resource."""


def fetch_api_json(path: str) -> object:
    request = Request(
        f"{API_BASE_URL}/{path}",
        headers={"Accept": "application/json", "User-Agent": "PincodeLookup/1.0"},
    )

    try:
        with urlopen(request, timeout=10) as response:
            return json.loads(response.read())
    except HTTPError as error:
        if error.code == 404:
            raise PincodeResourceNotFoundError from error
        raise PincodeAPIError(
            f"The pincode data service returned HTTP {error.code}."
        ) from error
    except (URLError, TimeoutError) as error:
        raise PincodeAPIError("The pincode data service could not be reached.") from error
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise PincodeAPIError("The pincode data service returned invalid JSON.") from error
