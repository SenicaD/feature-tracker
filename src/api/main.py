import json
import re
import tempfile
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

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
ALLOWED_COLORS = {
    "#EF4444",  # red
    "#F59E0B",  # amber
    "#10B981",  # green
    "#3B82F6",  # blue
    "#A855F7",  # purple
    "#EC4899",  # pink
}


def default_statuses() -> list["StatusDef"]:
    return [
        StatusDef(id="implemented", name="Implemented", color="#10B981"),
        StatusDef(id="intended", name="Intended", color="#3B82F6"),
        StatusDef(id="aspirational", name="Aspirational", color="#A855F7"),
    ]


def validate_name(name: str) -> None:
    if not NAME_PATTERN.match(name):
        raise HTTPException(400, "Invalid project name. Use only letters, numbers, hyphens, underscores.")


def get_project_path(name: str) -> Path:
    return DATA_DIR / f"{name}.json"


class StatusDef(BaseModel):
    id: str
    name: str
    color: str


class ProjectDef(BaseModel):
    id: str
    name: str
    color: str


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
    statusId: str | None = None
    projectId: str | None = None
    attributes: list[NodeAttribute]
    position: NodePosition


class ConnectionData(BaseModel):
    sourceId: str
    sourceOutput: str
    targetId: str
    targetInput: str


class ProjectData(BaseModel):
    name: str
    statuses: list[StatusDef] = Field(default_factory=default_statuses)
    featureProjects: list[ProjectDef] = Field(default_factory=list)
    nodes: list[NodeData]
    connections: list[ConnectionData]


def validate_statuses(statuses: list[StatusDef]) -> None:
    names = set()
    for status in statuses:
        key = status.name.lower()
        if key in names:
            raise HTTPException(400, f"Duplicate status name: {status.name}")
        names.add(key)
        if status.color not in ALLOWED_COLORS:
            raise HTTPException(400, f"Color {status.color} is not in the allowed palette")


def validate_projects(projects: list[ProjectDef]) -> None:
    names = set()
    for project in projects:
        key = project.name.lower()
        if key in names:
            raise HTTPException(400, f"Duplicate project name: {project.name}")
        names.add(key)
        if not re.fullmatch(r"#[0-9a-fA-F]{6}", project.color):
            raise HTTPException(400, f"Color {project.color} must be a hex value like #AABBCC")


def normalize_project(project: ProjectData) -> ProjectData:
    status_ids = {s.id for s in project.statuses}
    project_ids = {p.id for p in project.featureProjects}
    for node in project.nodes:
        if node.statusId not in status_ids:
            node.statusId = None
        if node.projectId not in project_ids:
            node.projectId = None
    return project


def atomic_write(path: Path, content: str) -> None:
    with tempfile.NamedTemporaryFile("w", delete=False, dir=path.parent) as tmp:
        tmp.write(content)
        temp_path = Path(tmp.name)
    temp_path.replace(path)


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
    project = ProjectData(**data)
    return normalize_project(project)


@app.put("/projects/{name}")
def save_project(name: str, project: ProjectData) -> dict:
    validate_name(name)
    if project.name != name:
        raise HTTPException(400, "Project name in path and body must match")
    validate_statuses(project.statuses)
    validate_projects(project.featureProjects)
    project = normalize_project(project)
    path = get_project_path(name)
    atomic_write(path, json.dumps(project.model_dump(), indent=2))
    return {"status": "saved"}


@app.delete("/projects/{name}")
def delete_project(name: str) -> dict:
    validate_name(name)
    path = get_project_path(name)
    if not path.exists():
        raise HTTPException(404, "Project not found")
    path.unlink()
    return {"status": "deleted"}
