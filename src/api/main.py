import json
import re
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

NAME_PATTERN = re.compile(r"^[a-zA-Z0-9_-]+$")


def validate_name(name: str) -> None:
    if not NAME_PATTERN.match(name):
        raise HTTPException(400, "Invalid project name. Use only letters, numbers, hyphens, underscores.")


def get_project_path(name: str) -> Path:
    return DATA_DIR / f"{name}.json"


class NodeAttribute(BaseModel):
    key: str
    value: str


class NodePosition(BaseModel):
    x: float
    y: float


class NodeData(BaseModel):
    id: str
    label: str
    name: str
    attributes: list[NodeAttribute]
    position: NodePosition


class ConnectionData(BaseModel):
    sourceId: str
    sourceOutput: str
    targetId: str
    targetInput: str


class ProjectData(BaseModel):
    name: str
    nodes: list[NodeData]
    connections: list[ConnectionData]


@app.get("/projects")
def list_projects() -> list[str]:
    return sorted([f.stem for f in DATA_DIR.glob("*.json")])


@app.get("/projects/{name}")
def get_project(name: str) -> ProjectData:
    validate_name(name)
    path = get_project_path(name)
    if not path.exists():
        raise HTTPException(404, "Project not found")
    data = json.loads(path.read_text())
    return ProjectData(**data)


@app.put("/projects/{name}")
def save_project(name: str, project: ProjectData) -> dict:
    validate_name(name)
    path = get_project_path(name)
    path.write_text(json.dumps(project.model_dump(), indent=2))
    return {"status": "saved"}


@app.delete("/projects/{name}")
def delete_project(name: str) -> dict:
    validate_name(name)
    path = get_project_path(name)
    if not path.exists():
        raise HTTPException(404, "Project not found")
    path.unlink()
    return {"status": "deleted"}
