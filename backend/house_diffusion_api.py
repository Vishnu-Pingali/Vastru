from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from pathlib import Path
import subprocess
import json
import os

app = FastAPI(title="HouseDiffusion Integration API")

BASE_DIR = Path(__file__).resolve().parent
HOUSE_DIFFUSION_DIR = (BASE_DIR / 'house_diffusion-main').resolve()  # house_diffusion repo is in backend/house_diffusion-main
MODEL_PATH = HOUSE_DIFFUSION_DIR / 'scripts' / 'ckpts' / 'exp' / 'model250000.pt'
INPUT_JSON = HOUSE_DIFFUSION_DIR / 'scripts' / 'input_graph.json'

class GraphNode(BaseModel):
    id: str

class GraphEdge(BaseModel):
    source: str
    target: str

class HouseDiffusionGraph(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    metadata: dict | None = None

class GenerationResponse(BaseModel):
    status: str
    detail: str
    outputPath: str | None = None

@app.post('/generate', response_model=GenerationResponse)
def generate_floorplan(graph: HouseDiffusionGraph):
    if not graph.nodes or not graph.edges:
        raise HTTPException(status_code=400, detail='Graph must include nodes and edges')

    if not MODEL_PATH.exists():
        raise HTTPException(status_code=500, detail=f'Model checkpoint not found at {MODEL_PATH}')

    payload = {
        'nodes': [node.dict() for node in graph.nodes],
        'edges': [edge.dict() for edge in graph.edges],
        'metadata': graph.metadata or {},
    }

    INPUT_JSON.write_text(json.dumps(payload, indent=2), encoding='utf-8')

    command = [
        'python',
        'image_sample.py',
        '--dataset', 'rplan',
        '--batch_size', '1',
        '--set_name', 'eval',
        '--target_set', '8',
        '--model_path', str(MODEL_PATH),
        '--num_samples', '1'
    ]

    try:
        process = subprocess.run(
            command,
            cwd=str(HOUSE_DIFFUSION_DIR / 'scripts'),
            capture_output=True,
            text=True,
            check=True,
        )
    except subprocess.CalledProcessError as exc:
        raise HTTPException(status_code=500, detail=f'HouseDiffusion generation failed: {exc.stderr}')

    output_path = str(HOUSE_DIFFUSION_DIR / 'scripts' / 'generated_sample.png')

    return GenerationResponse(
        status='generated',
        detail='Floorplan generation started successfully.',
        outputPath=output_path,
    )

@app.get('/health')
def health_check():
    return {'status': 'ok'}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
