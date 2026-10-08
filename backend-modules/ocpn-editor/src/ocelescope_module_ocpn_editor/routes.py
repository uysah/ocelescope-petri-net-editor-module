from fastapi import APIRouter, UploadFile
import tempfile
import os
from r4pm.petri_net import export_pnml, import_pnml
from fastapi.responses import PlainTextResponse
from ocelescope_module_ocpn_editor.util.convert_format import convert_to_OCPN, convert_from_OCPN
from ocelescope_module_ocpn_editor.model.editor_ocpn import OcpnExportRequest, OcpnImportResponse
from ocelescope import PetriNet
from ocelescope_module_ocpn_editor.util.convert_format import convert_from_pnml
from ocelescope_module_ocpn_editor.model.editor_pn import ImportResponse
from ocelescope_backend.app.dependencies import ApiOcel, ApiSession
from ocelescope_backend.app.internal.model.resource import ResourceStore

router = APIRouter()


@router.post("/petri-net/export/pnml", operation_id="exportPetriNetPnml")
def export_petri_net_pnml(net: dict) -> PlainTextResponse:
    with tempfile.NamedTemporaryFile(suffix=".pnml", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        export_pnml(net, tmp_path)
        with open(tmp_path, "r", encoding="utf-8") as f:
            pnml_text = f.read()
    finally:
        os.unlink(tmp_path)

    return PlainTextResponse(content=pnml_text)

@router.post("/petri-net/import/pnml", operation_id="importPetriNetPnml")
async def import_petri_net_pnml(file: UploadFile) -> ImportResponse:
    input = await file.read()

    with tempfile.NamedTemporaryFile(suffix=".pnml", delete=False) as tmp:
        tmp.write(input)
        tmp_path = tmp.name

    try:
        net = import_pnml(tmp_path)
    finally:
        os.unlink(tmp_path)

    return convert_from_pnml(net)


@router.post("/ocpn/export/ocelescope", operation_id="exportOCPN")
def export_ocpn(ocpn: OcpnExportRequest) -> PlainTextResponse:
    pnet = convert_to_OCPN(ocpn)

    with tempfile.NamedTemporaryFile(suffix=".ocelescope", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        written_path = pnet.write(tmp_path)
        with open(written_path, "r", encoding="utf-8") as f:
            content = f.read()
    finally:
        os.unlink(written_path)

    return PlainTextResponse(content=content)


@router.post("/ocpn/import/ocelescope", operation_id="importOCPN")
async def import_ocpn(file: UploadFile) -> OcpnImportResponse:
    input = await file.read()
    pnet = PetriNet.model_validate_json(input)
    return convert_from_OCPN(pnet)


@router.get("/{ocel_id}/objects/types", operation_id="objectTypes")
def get_object_types(ocel:ApiOcel) -> list[str]:
    return ocel.objects.types


@router.get("/{ocel_id}/events/activities", operation_id="eventActivities")
def get_event_activities(ocel:ApiOcel) -> list[str]:
    return ocel.events.activities


@router.post("/ocpn/save/session", operation_id="saveSession")
def save_to_session_example(session: ApiSession, ocpn: OcpnExportRequest, name:str):
  pnet = convert_to_OCPN(ocpn)
  session.add_resource(ResourceStore.from_resource(pnet, name=name))