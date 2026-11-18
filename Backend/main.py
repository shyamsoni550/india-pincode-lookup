from urllib.parse import quote

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import TypeAdapter, ValidationError

from data import (
    PincodeAPIError,
    PincodeResourceNotFoundError,
    fetch_api_json,
)
from exception import (
    InvalidPincodeError,
    PincodeNotFoundError,
    invalid_pincode_handler,
    pincode_not_found_handler,
)
from model import (
    BulkPincodeRequest,
    BulkResponse,
    PincodeLookupResponse,
    PostalAPIResult,
    PostOffice,
)

app = FastAPI(
    title="My Pincode Lookup Application",
    description="Look up Indian postal offices by pincode or post-office name.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(PincodeNotFoundError, pincode_not_found_handler)
app.add_exception_handler(InvalidPincodeError, invalid_pincode_handler)


def fetch_post_offices(path: str) -> list[PostOffice]:
    try:
        responses = TypeAdapter(list[PostalAPIResult]).validate_python(
            fetch_api_json(path)
        )
    except ValidationError as error:
        raise PincodeAPIError(
            "The pincode data service returned unexpected data."
        ) from error

    if not responses:
        raise PincodeAPIError("The pincode data service returned no response.")

    result = responses[0]
    if result.Status.lower() != "success" or not result.PostOffice:
        raise PincodeResourceNotFoundError(result.Message or "No post offices found.")

    return [
        PostOffice(
            officeName=office.Name.strip(),
            officeType=office.BranchType,
            deliveryStatus=office.DeliveryStatus,
            circleName=office.Circle,
            regionName=office.Region,
            divisionName=office.Division,
            block=office.Block,
            stateName=office.State,
            districtName=office.District,
            pincode=office.Pincode,
        )
        for office in result.PostOffice
    ]


def make_lookup_response(offices: list[PostOffice]) -> PincodeLookupResponse:
    return PincodeLookupResponse(
        state=", ".join(sorted({office.stateName for office in offices})),
        district=", ".join(sorted({office.districtName for office in offices})),
        offices=offices,
    )


@app.get("/")
def root():
    return {"message": "Pincode Lookup Application!"}


@app.get("/lookup", response_model=PincodeLookupResponse)
def lookup(query: str, city: str | None = None):
    query = query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Enter a pincode or post-office name.")

    if query.isdigit():
        if len(query) != 6:
            raise InvalidPincodeError(query, "Pincode must be a 6-digit number.")
        if city and city.strip():
            raise HTTPException(
                status_code=400,
                detail="The city filter can only be used with a post-office name.",
            )
        try:
            return make_lookup_response(fetch_post_offices(f"pincode/{query}"))
        except PincodeResourceNotFoundError as error:
            raise PincodeNotFoundError(query) from error
        except PincodeAPIError as error:
            raise HTTPException(status_code=502, detail=str(error)) from error

    if len(query) > 100:
        raise HTTPException(
            status_code=400,
            detail="Post-office name must not exceed 100 characters.",
        )

    try:
        offices = fetch_post_offices(f"postoffice/{quote(query, safe='')}")
    except PincodeResourceNotFoundError as error:
        raise HTTPException(
            status_code=404, detail="No matching post offices found."
        ) from error
    except PincodeAPIError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    if city and city.strip():
        city_filter = city.strip().casefold()
        offices = [
            office
            for office in offices
            if city_filter in office.districtName.casefold()
            or (office.block and city_filter in office.block.casefold())
        ]
    return make_lookup_response(offices)


@app.post("/pincode/bulk", response_model=BulkResponse)
def bulk_lookup(request: BulkPincodeRequest):
    results = []
    missing = []

    for pincode in request.pincodes:
        try:
            results.append(
                make_lookup_response(fetch_post_offices(f"pincode/{pincode}"))
            )
        except PincodeResourceNotFoundError:
            missing.append(pincode)
        except PincodeAPIError as error:
            raise HTTPException(status_code=502, detail=str(error)) from error

    return BulkResponse(
        found=len(results),
        not_found=len(missing),
        results=results,
        missing=missing,
    )
