# 🧠 Optimization Problems Platform

This project provides two interactive web applications to visualize and solve two classical combinatorial optimization problems in Operations Research:

- 🔁 **Maximum Flow Problem**
- 🎨 **Graph Coloring Problem**

Each app offers a user-friendly interface, powerful algorithmic engines, and import/export capabilities for educational and practical use cases.

---

## 🌐 Live Applications

- 🔗 [Maximum Flow App](https://maxflowapp.onrender.com/)
- 🔗 [Graph Coloring App](https://graph-coloring-problem.onrender.com/)

---

## 🔁 Maximum Flow Problem

### 📌 Problem Description

The **maximum flow problem** involves finding the greatest possible flow from a source node to a sink node in a directed graph, subject to arc capacities and flow conservation constraints.

### 💡 Real-World Applications

- Transport and logistics networks
- Electrical grid optimization
- Crowd and evacuation management
- Bioinformatics (e.g., genetic networks)

### 🛠 Key Features

- Graph construction: add/move/delete nodes and edges
- Set source and sink nodes
- Capacity input on each arc
- **Algorithm implemented**: Ford-Fulkerson (Edmonds-Karp)
- JSON **graph import/export**
- Instant result visualization (max flow and per-edge flow)

### 📊 Interface Highlights

- Fully interactive canvas
- Real-time updates on flow values
- Exportable results in JSON format
- Graph persistence and reuse

---

## 🎨 Graph Coloring Problem

### 📌 Problem Description

The **graph coloring problem** assigns colors to graph vertices such that no two adjacent nodes share the same color. The goal is to minimize the number of colors used—also known as the **chromatic number**.

### 💡 Real-World Applications

- Timetable scheduling
- Wireless frequency assignment
- Task scheduling in parallel computing
- Sudoku and constraint satisfaction problems

### 🛠 Key Features

- Dynamic graph creation with drag-and-drop
- Matrix-based graph input and adjacency control
- Real-time color visualization of the solution
- Export graph image (PNG) and adjacency matrix (JSON)
- Import large graphs (up to 30x30 matrices)
- Graph random generation

### ⚙️ Algorithms Used

- Exact approach using Integer Linear Programming (ILP)
- Heuristic: **DSatur** (via NetworkX)
- Chromatic number computation with visual output

---

## 📦 Technologies Used

| Component          | Technology           |
|-------------------|----------------------|
| Frontend          | Angular |
| Backend (Flow App)| Flask       |
| Backend (Coloring)| Flask    |
| Optimization      | Gurobi    |
| Visualization     | Custom canvas-based rendering |
| Export/Import     | JSON (structured graph format) |

---

## 👨‍💻 Contributors

- **Oussema Guerami**
- **Mohamed Aziz Dhouibi**
- **Leith Engazzou**
- **Hiba Chabbouh**
- **Mayar Chaabani**
- **Hanine Khemir**

---

## 📜 License

This project is licensed under the **MIT License**.

---

## 💬 Feedback & Contributions

We welcome feedback, suggestions, and pull requests!  
If you encounter issues or have improvement ideas, please open an issue in the repository.

> “Bringing complex optimization problems to life through interactive visualization and educational design.”

