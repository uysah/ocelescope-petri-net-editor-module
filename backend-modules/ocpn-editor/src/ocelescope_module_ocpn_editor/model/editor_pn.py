from pydantic import BaseModel

class ImportPlace(BaseModel):
    id: str
    tokens: int = 0
    final_tokens: int = 0


class ImportTransition(BaseModel):
    id: str
    label: str | None = None


class ImportArc(BaseModel):
    source: str
    target: str
    weight: int = 1


class ImportResponse(BaseModel):
    places: list[ImportPlace]
    transitions: list[ImportTransition]
    arcs: list[ImportArc]