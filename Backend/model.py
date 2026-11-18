from pydantic import BaseModel, field_validator


class PostalAPIOffice(BaseModel):
    Name: str
    BranchType: str
    DeliveryStatus: str
    District: str
    State: str
    Pincode: str
    Description: str | None = None
    Circle: str | None = None
    Division: str | None = None
    Region: str | None = None
    Block: str | None = None


class PostalAPIResult(BaseModel):
    Status: str
    Message: str | None = None
    PostOffice: list[PostalAPIOffice] | None = None


class PostOffice(BaseModel):
    officeName: str
    officeType: str
    deliveryStatus: str
    circleName: str | None = None
    regionName: str | None = None
    divisionName: str | None = None
    block: str | None = None
    stateName: str
    districtName: str
    pincode: str


class PincodeLookupResponse(BaseModel):
    state: str
    district: str
    offices: list[PostOffice]


class BulkPincodeRequest(BaseModel):
    pincodes: list[str]

    @field_validator("pincodes")
    @classmethod
    def validate_pincodes(cls, value: list[str]) -> list[str]:
        if len(value) > 20:
            raise ValueError("Maximum 20 pincodes allowed.")
        for pincode in value:
            if len(pincode) != 6 or not pincode.isdigit():
                raise ValueError(
                    f"Pincode {pincode} is invalid. It must be a 6-digit number."
                )
        return value


class BulkResponse(BaseModel):
    Status: str = "Success"
    found: int
    not_found: int
    results: list[PincodeLookupResponse]
    missing: list[str]
