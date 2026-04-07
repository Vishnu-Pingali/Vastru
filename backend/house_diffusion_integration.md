# HouseDiffusion Integration

This folder contains a minimal FastAPI wrapper for integrating the HouseDiffusion Python model with VāstuCAD.

## Overview

- `backend/house_diffusion_api.py` exposes a `/generate` endpoint.
- It accepts a graph with `nodes` and `edges`.
- It writes `input_graph.json` and invokes the HouseDiffusion sample script.

## Requirements

- Python 3.10+ or Python 3.11
- `fastapi`, `uvicorn`, and `pydantic`
- HouseDiffusion checkout at workspace root or update the repository path
- Pretrained checkpoint: `house_diffusion/scripts/ckpts/exp/model250000.pt`

## Installation

```bash
python -m pip install fastapi uvicorn pydantic
```

## Running

```bash
uvicorn backend.house_diffusion_api:app --reload
```

## Example payload

```json
{
  "nodes": [
    {"id": "living_room"},
    {"id": "kitchen"},
    {"id": "bedroom1"},
    {"id": "bedroom2"}
  ],
  "edges": [
    {"source": "living_room", "target": "kitchen"},
    {"source": "living_room", "target": "bedroom1"},
    {"source": "living_room", "target": "bedroom2"}
  ]
}
```

## Important

The actual HouseDiffusion sample script may need to be extended to accept custom graph input. This wrapper provides the bridge and file-based adapter pattern.
