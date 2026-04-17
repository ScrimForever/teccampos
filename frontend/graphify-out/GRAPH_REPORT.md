# Graph Report - .  (2026-04-08)

## Corpus Check
- Corpus is ~1,336 words - fits in a single context window. You may not need a graph.

## Summary
- 21 nodes · 27 edges · 6 communities detected
- Extraction: 63% EXTRACTED · 37% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.53)
- Token cost: 1,200 input · 95 output

## God Nodes (most connected - your core abstractions)
1. `ApiService` - 12 edges
2. `Graphify Output Directory` - 4 edges
3. `Knowledge Graph` - 3 edges
4. `Graphify Rebuild Code Script` - 2 edges
5. `Graphify Skill` - 1 edges
6. `Graph Report (GRAPH_REPORT.md)` - 1 edges
7. `Wiki Index (index.md)` - 1 edges
8. `TEC INCUBADORA Logo` - 0 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "API Service Core"
Cohesion: 0.33
Nodes (1): ApiService

### Community 1 - "Graphify Knowledge Graph"
Cohesion: 0.4
Nodes (6): Graph Report (GRAPH_REPORT.md), Graphify Output Directory, Graphify Skill, Knowledge Graph, Graphify Rebuild Code Script, Wiki Index (index.md)

### Community 2 - "HTTP Request Methods"
Cohesion: 0.4
Nodes (0): 

### Community 3 - "Auth and Token Verification"
Cohesion: 1.0
Nodes (0): 

### Community 4 - "Build Configuration"
Cohesion: 1.0
Nodes (0): 

### Community 5 - "Brand Assets"
Cohesion: 1.0
Nodes (1): TEC INCUBADORA Logo

## Knowledge Gaps
- **4 isolated node(s):** `Graphify Skill`, `Graph Report (GRAPH_REPORT.md)`, `Wiki Index (index.md)`, `TEC INCUBADORA Logo`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Auth and Token Verification`** (2 nodes): `.get()`, `.verifyToken()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Build Configuration`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Brand Assets`** (1 nodes): `TEC INCUBADORA Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ApiService` connect `API Service Core` to `HTTP Request Methods`, `Auth and Token Verification`?**
  _High betweenness centrality (0.224) - this node is a cross-community bridge._
- **What connects `Graphify Skill`, `Graph Report (GRAPH_REPORT.md)`, `Wiki Index (index.md)` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._