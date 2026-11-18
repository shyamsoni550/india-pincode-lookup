from fastapi.responses import JSONResponse
from fastapi import Request

class PincodeNotFoundError(Exception):
    def __init__(self, pincode: str):
        self.pincode = pincode
        
class InvalidPincodeError(Exception):
    def __init__(self, pincode: str,reason: str="Invalid Format"):
        self.pincode = pincode
        self.reason = reason 

#custom handler for PincodeNotFoundError
async def pincode_not_found_handler(request: Request, exc: PincodeNotFoundError):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Pincode Not Found",
            "message": f"No location found for pincode {exc.pincode}.",
            "pincode": exc.pincode
            })
    
async def invalid_pincode_handler(request: Request, exc: InvalidPincodeError):
    return JSONResponse(
        status_code=400,
        content={
            "error": "Invalid Pincode",
            "message": f"Pincode {exc.pincode} is invalid due to {exc.reason}.",
            "pincode": exc.pincode,
            "reason": exc.reason
        }
    )