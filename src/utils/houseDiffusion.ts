// utils/houseDiffusion.ts
// Integration scaffold for HouseDiffusion-style floorplan generation.

import type { RoomType } from '../types';

export type HouseDiffusionGraph = {
  nodes: string[];
  edges: Array<[string, string]>;
  metadata?: {
    description?: string;
    source?: string;
    requestedRooms?: string[];
  };
};

export type ParsedRoomRequest = {
  count: number;
  type: RoomType;
  alias: string;
  constraints: {
    adjacentTo?: string[];
    direction?: string;
  };
};

const ROOM_TYPE_MAP: Record<string, RoomType> = {
  bedroom: 'bedroom',
  'master bedroom': 'master_bedroom',
  'master bed': 'master_bedroom',
  bed: 'bedroom',
  kitchen: 'kitchen',
  living: 'living_room',
  'living room': 'living_room',
  lounge: 'living_room',
  toilet: 'toilet',
  bathroom: 'toilet',
  puja: 'puja',
  prayer: 'puja',
  study: 'study',
  dining: 'dining',
  entrance: 'entrance',
  utility: 'utility',
  balcony: 'balcony',
  passage: 'passage',
  staircase: 'staircase',
};

const DIRECTION_TERMS = ['north', 'south', 'east', 'west', 'northeast', 'north-east', 'northwest', 'north-west', 'southeast', 'south-east', 'southwest', 'south-west'];
const ADJACENCY_TERMS = ['near', 'adjacent to', 'next to', 'connected to', 'beside', 'besides', 'next'];

function extractDirections(text: string): string[] {
  const directions: string[] = [];
  for (const direction of DIRECTION_TERMS) {
    if (text.toLowerCase().includes(direction)) {
      directions.push(direction.replace('-', ''));
    }
  }
  return directions;
}

function extractAdjacencies(text: string): string[] {
  const found: string[] = [];
  for (const term of ADJACENCY_TERMS) {
    if (text.toLowerCase().includes(term)) {
      found.push(term);
    }
  }
  return found;
}

export function parseTextToRoomRequests(input: string): ParsedRoomRequest[] {
  const lower = input.toLowerCase();
  const requests: ParsedRoomRequest[] = [];

  // Detect common patterns like 3BHK, 2BHK, 2 bedroom, 1 bathroom
  const bhkMatch = lower.match(/(\d)\s*bhk/);
  if (bhkMatch) {
    const bedrooms = Number(bhkMatch[1]);
    for (let i = 1; i <= bedrooms; i += 1) {
      requests.push({
        count: 1,
        type: 'bedroom',
        alias: `bedroom${i}`,
        constraints: {},
      });
    }
  }

  // Explicit room mentions
  const roomTerms = Object.keys(ROOM_TYPE_MAP).sort((a, b) => b.length - a.length);
  for (const term of roomTerms) {
    const regex = new RegExp(`(\\d+)?\\s*${term}`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(input)) !== null) {
      const count = match[1] ? Number(match[1]) : 1;
      const roomType = ROOM_TYPE_MAP[term];
      for (let i = 0; i < count; i += 1) {
        const alias = `${roomType}${requests.filter((r) => r.type === roomType).length + 1}`;
        requests.push({
          count: 1,
          type: roomType,
          alias,
          constraints: {},
        });
      }
    }
  }

  // Fallback when a BHK request exists but bedrooms were not added because of missing explicit terms
  if (requests.length === 0 && bhkMatch) {
    const bedrooms = Number(bhkMatch[1]);
    for (let i = 1; i <= bedrooms; i += 1) {
      requests.push({
        count: 1,
        type: 'bedroom',
        alias: `bedroom${i}`,
        constraints: {},
      });
    }
    requests.push({ count: 1, type: 'kitchen', alias: 'kitchen', constraints: {} });
    requests.push({ count: 1, type: 'living_room', alias: 'living_room', constraints: {} });
  }

  // Base default if nothing parsed
  if (requests.length === 0) {
    requests.push({ count: 1, type: 'living_room', alias: 'living_room', constraints: {} });
    requests.push({ count: 1, type: 'kitchen', alias: 'kitchen', constraints: {} });
    requests.push({ count: 1, type: 'bedroom', alias: 'bedroom1', constraints: {} });
  }

  // Apply direction constraints and adjacency hints
  const directions = extractDirections(input);
  const adjacencyTerms = extractAdjacencies(input);
  if (directions.length > 0) {
    requests[0].constraints.direction = directions[0];
  }
  if (adjacencyTerms.length > 0) {
    requests.slice(0, 2).forEach((req) => {
      req.constraints.adjacentTo = requests
        .filter((r) => r.alias !== req.alias)
        .map((r) => r.alias);
    });
  }

  return requests;
}

export function buildHouseDiffusionGraph(requests: ParsedRoomRequest[]): HouseDiffusionGraph {
  const nodes = requests.map((req) => req.alias);
  const edges: Array<[string, string]> = [];

  // Connect all rooms to a living room if present
  const living = requests.find((room) => room.type === 'living_room');
  if (living) {
    requests.forEach((room) => {
      if (room.alias !== living.alias) {
        edges.push([living.alias, room.alias]);
      }
    });
  } else if (requests.length > 1) {
    // Connect sequentially if no living room is present
    for (let i = 0; i < requests.length - 1; i += 1) {
      edges.push([requests[i].alias, requests[i + 1].alias]);
    }
  }

  // Add explicit adjacency constraints
  for (const request of requests) {
    if (request.constraints.adjacentTo) {
      for (const target of request.constraints.adjacentTo) {
        if (target !== request.alias && nodes.includes(target)) {
          const pair: [string, string] = [request.alias, target];
          const reverse: [string, string] = [target, request.alias];
          if (!edges.some((edge) => edge[0] === pair[0] && edge[1] === pair[1]) && !edges.some((edge) => edge[0] === reverse[0] && edge[1] === reverse[1])) {
            edges.push(pair);
          }
        }
      }
    }
  }

  return {
    nodes,
    edges,
    metadata: {
      source: 'VāstuCAD HouseDiffusion adapter',
      requestedRooms: requests.map((r) => `${r.alias}:${r.type}`),
    },
  };
}

export function normalizeHouseDiffusionGraph(graph: HouseDiffusionGraph): HouseDiffusionGraph {
  const normalized = { ...graph, nodes: [...graph.nodes], edges: [...graph.edges] };

  // Ensure 5-8 nodes for HouseDiffusion input.
  while (normalized.nodes.length < 5) {
    const filler = `hallway${normalized.nodes.length + 1}`;
    normalized.nodes.push(filler);
    normalized.edges.push([normalized.nodes[0], filler]);
  }

  return normalized;
}

export function createHouseDiffusionInput(graph: HouseDiffusionGraph) {
  return {
    nodes: graph.nodes.map((node) => ({ id: node })),
    edges: graph.edges.map(([from, to]) => ({ source: from, target: to })),
    metadata: graph.metadata,
  };
}

export async function generateWithHouseDiffusion(description: string): Promise<string> {
  // Parse text to room requests
  const requests = parseTextToRoomRequests(description);

  // Build graph
  const graph = buildHouseDiffusionGraph(requests);
  const normalizedGraph = normalizeHouseDiffusionGraph(graph);

  // Create API payload
  const payload = createHouseDiffusionInput(normalizedGraph);

  try {
    const response = await fetch('http://localhost:8001/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'HouseDiffusion generation failed');
    }

    const result = await response.json();
    return result.outputPath || 'generated_sample.png';
  } catch (error) {
    console.error('HouseDiffusion API error:', error);
    throw error;
  }
}
